import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { expect } from 'chai';
import { TestContext } from '../../setup';
import { ensureEpochIsActive, closeEpochOnChain, getEpochManagementPda, ensureEpochExists } from '../../setup/epochSetup';
import { generateRandomId } from '../../utils_for_tests/helpers';

/**
 * Exécute les tests pour l'instruction `end_epoch`.
 * @param getTestContext Une fonction pour récupérer le TestContext initialisé.
 */
export function runEndEpochTests(getTestContext: () => TestContext) {
    describe('Instruction: end_epoch', () => {
        let ctx: TestContext;
        let activeEpochId: anchor.BN;
        let activeEpochPda: PublicKey;

        before(async () => {
            ctx = getTestContext();
            if (!ctx.programConfigAddress) {
                throw new Error("ProgramConfigAddress not found in TestContext for end_epoch tests.");
            }
        });

        beforeEach(async () => {
            // Assurer une époque active pour chaque test de fermeture
            activeEpochId = new anchor.BN(generateRandomId());
            activeEpochPda = await ensureEpochIsActive(ctx, activeEpochId);
        });

        it('should successfully close an active epoch', async () => {
            const epochBeforeClose = await ctx.program.account.epochManagement.fetch(activeEpochPda);
            expect(JSON.stringify(epochBeforeClose.status)).to.equal(JSON.stringify({ active: {} }));

            await ctx.program.methods
                .endEpoch(activeEpochId)
                .accounts({
                    authority: ctx.adminKeypair.publicKey,
                    programConfig: ctx.programConfigAddress!,
                    epochManagement: activeEpochPda,
                    systemProgram: SystemProgram.programId,
                } as any)
                .signers([ctx.adminKeypair])
                .rpc();

            const epochAfterClose = await ctx.program.account.epochManagement.fetch(activeEpochPda);
            expect(JSON.stringify(epochAfterClose.status)).to.equal(JSON.stringify({ closed: {} }));
            // Vérifier que end_time a été mis à jour (approximativement, car Clock::get() est utilisé)
            // La logique Rust met à jour end_time avec Clock::get()?.unix_timestamp
            // Donc, on s'attend à ce qu'il soit différent de celui initial et proche de l'heure actuelle.
            expect(epochAfterClose.endTime.toNumber()).to.be.greaterThan(epochBeforeClose.endTime.toNumber());
            // On pourrait aussi vérifier que epochAfterClose.endTime est proche de Date.now()/1000
            // expect(epochAfterClose.endTime.toNumber()).to.be.closeTo(Math.floor(Date.now() / 1000), 5); // 5 secondes de marge
        });

        it('should fail to close an epoch that is already closed', async () => {
            // Fermer l'époque une première fois
            await closeEpochOnChain(ctx, activeEpochId);
            const epochAfterFirstClose = await ctx.program.account.epochManagement.fetch(activeEpochPda);
            expect(JSON.stringify(epochAfterFirstClose.status)).to.equal(JSON.stringify({ closed: {} }));

            // Tenter de la fermer à nouveau
            try {
                await ctx.program.methods
                    .endEpoch(activeEpochId)
                    .accounts({
                        authority: ctx.adminKeypair.publicKey,
                        programConfig: ctx.programConfigAddress!,
                        epochManagement: activeEpochPda,
                        systemProgram: SystemProgram.programId,
                    } as any)
                    .signers([ctx.adminKeypair])
                    .rpc();
                expect.fail("Transaction should have failed because epoch is already closed.");
            } catch (error) {
                // En Rust: ErrorCode::EpochAlreadyInactive
                expect((error as anchor.AnchorError).error.errorMessage).to.include("EpochAlreadyInactive");
            }
        });

        it('should fail to close a non-existent epoch', async () => {
            const nonExistentEpochId = new anchor.BN(generateRandomId());
            const [nonExistentEpochPda] = getEpochManagementPda(ctx.program.programId, nonExistentEpochId);

            try {
                await ctx.program.methods
                    .endEpoch(nonExistentEpochId)
                    .accounts({
                        authority: ctx.adminKeypair.publicKey,
                        programConfig: ctx.programConfigAddress!,
                        epochManagement: nonExistentEpochPda, // Ce compte ne sera pas trouvé par le programme
                        systemProgram: SystemProgram.programId,
                    } as any)
                    .signers([ctx.adminKeypair])
                    .rpc();
                expect.fail("Transaction should have failed because epoch does not exist.");
            } catch (error) {
                // L'erreur attendue est souvent que le compte epoch_management n'est pas initialisé/trouvé.
                // Anchor lèvera une erreur car le compte marqué `mut` dans `EndEpoch` n'existe pas.
                // Le message exact peut varier.
                const errorString = (error as Error).toString();
                expect(errorString.includes("AccountNotInitialized") || 
                       errorString.includes("AccountDiscriminatorNotFound") || 
                       errorString.includes("Could not deserialize account data"))
                .to.be.true;
            }
        });
        
        it('closeEpochOnChain helper should correctly close an active epoch', async () => {
            await closeEpochOnChain(ctx, activeEpochId);
            const epochAccount = await ctx.program.account.epochManagement.fetch(activeEpochPda);
            expect(JSON.stringify(epochAccount.status)).to.equal(JSON.stringify({ closed: {} }));
        });

        it('closeEpochOnChain helper should throw error for non-existent epoch', async () => {
            const nonExistentEpochId = new anchor.BN(generateRandomId());
            try {
                await closeEpochOnChain(ctx, nonExistentEpochId);
                expect.fail("closeEpochOnChain should have failed for a non-existent epoch.");
            } catch (error) {
                expect(error.message).to.include(`Epoch ${nonExistentEpochId.toString()} must exist to be closed.`);
            }
        });

        // TODO: Ajouter des tests pour vérifier les permissions (qui peut appeler end_epoch)
        // Couverts dans 00_program_configuration/programConfig.test.ts.

    });
}
