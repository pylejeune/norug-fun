import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { expect } from 'chai';
import { TestContext } from '../../setup';
import { 
    ensureEpochIsActive, 
    closeEpochOnChain, 
    markEpochAsProcessedOnChain,
    getEpochManagementPda 
} from '../../setup/epochSetup';
import { generateRandomId } from '../../utils_for_tests/helpers';

/**
 * Exécute les tests pour l'instruction `mark_epoch_processed`.
 * @param getTestContext Une fonction pour récupérer le TestContext initialisé.
 */
export function runMarkEpochProcessedTests(getTestContext: () => TestContext) {
    describe('Instruction: mark_epoch_processed', () => {
        let ctx: TestContext;
        let epochIdToProcess: anchor.BN;
        let epochPdaToProcess: PublicKey;

        before(async () => {
            ctx = getTestContext();
            if (!ctx.programConfigAddress) {
                throw new Error("ProgramConfigAddress not found in TestContext for mark_epoch_processed tests.");
            }
        });

        beforeEach(async () => {
            // Assurer une époque active puis la fermer pour chaque test
            epochIdToProcess = new anchor.BN(generateRandomId());
            epochPdaToProcess = await ensureEpochIsActive(ctx, epochIdToProcess);
            await closeEpochOnChain(ctx, epochIdToProcess); // L'époque doit être fermée pour être marquée
            
            const epochAccount = await ctx.program.account.epochManagement.fetch(epochPdaToProcess);
            expect(JSON.stringify(epochAccount.status)).to.equal(JSON.stringify({ closed: {} }));
            expect(epochAccount.processed).to.be.false;
        });

        it('should successfully mark a closed epoch as processed', async () => {
            await ctx.program.methods
                .markEpochProcessed()
                .accounts({
                    authority: ctx.adminKeypair.publicKey,
                    programConfig: ctx.programConfigAddress!,
                    epochManagement: epochPdaToProcess,
                } as any)
                .signers([ctx.adminKeypair])
                .rpc();

            const epochAccount = await ctx.program.account.epochManagement.fetch(epochPdaToProcess);
            expect(epochAccount.processed).to.be.true;
        });

        it('should fail to mark an epoch that is still active', async () => {
            // Créer une nouvelle époque qui restera active
            const stillActiveEpochId = new anchor.BN(generateRandomId());
            const stillActiveEpochPda = await ensureEpochIsActive(ctx, stillActiveEpochId);
            
            try {
                await ctx.program.methods
                    .markEpochProcessed()
                    .accounts({
                        authority: ctx.adminKeypair.publicKey,
                        programConfig: ctx.programConfigAddress!,
                        epochManagement: stillActiveEpochPda,
                    } as any)
                    .signers([ctx.adminKeypair])
                    .rpc();
                expect.fail("Transaction should have failed because epoch is not closed.");
            } catch (error) {
                // En Rust: ErrorCode::EpochNotClosed
                expect((error as anchor.AnchorError).error.errorMessage).to.include("EpochNotClosed");
            }
        });

        it('should fail to mark an epoch that is already processed', async () => {
            // Marquer l'époque une première fois
            await markEpochAsProcessedOnChain(ctx, epochIdToProcess);
            const epochAfterFirstMark = await ctx.program.account.epochManagement.fetch(epochPdaToProcess);
            expect(epochAfterFirstMark.processed).to.be.true;

            // Tenter de la marquer à nouveau
            try {
                await ctx.program.methods
                    .markEpochProcessed()
                    .accounts({
                        authority: ctx.adminKeypair.publicKey,
                        programConfig: ctx.programConfigAddress!,
                        epochManagement: epochPdaToProcess,
                    } as any)
                    .signers([ctx.adminKeypair])
                    .rpc();
                expect.fail("Transaction should have failed because epoch is already processed.");
            } catch (error) {
                // En Rust: ErrorCode::EpochAlreadyProcessed
                expect((error as anchor.AnchorError).error.errorMessage).to.include("EpochAlreadyProcessed");
            }
        });

        it('should fail to mark a non-existent epoch', async () => {
            const nonExistentEpochId = new anchor.BN(generateRandomId());
            const [nonExistentEpochPda] = getEpochManagementPda(ctx.program.programId, nonExistentEpochId);

            try {
                await ctx.program.methods
                    .markEpochProcessed()
                    .accounts({
                        authority: ctx.adminKeypair.publicKey,
                        programConfig: ctx.programConfigAddress!,
                        epochManagement: nonExistentEpochPda, 
                    } as any)
                    .signers([ctx.adminKeypair])
                    .rpc();
                expect.fail("Transaction should have failed because epoch does not exist.");
            } catch (error) {
                const errorString = (error as Error).toString();
                expect(errorString.includes("AccountNotInitialized") || 
                       errorString.includes("AccountDiscriminatorNotFound") ||
                       errorString.includes("could not find account") || // Rust panic if account doesn't exist for mut
                       errorString.includes("Could not deserialize account data"))
                .to.be.true;
            }
        });

        it('markEpochAsProcessedOnChain helper should correctly mark a closed epoch', async () => {
            await markEpochAsProcessedOnChain(ctx, epochIdToProcess);
            const epochAccount = await ctx.program.account.epochManagement.fetch(epochPdaToProcess);
            expect(epochAccount.processed).to.be.true;
        });

        // TODO: Ajouter des tests pour vérifier les permissions (qui peut appeler mark_epoch_processed)
        // Couverts dans 00_program_configuration/programConfig.test.ts.
    });
} 