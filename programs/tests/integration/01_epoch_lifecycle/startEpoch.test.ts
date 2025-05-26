import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { expect } from 'chai';
import { TestContext } from '../../setup';
import { ensureEpochExists, getEpochManagementPda } from '../../setup/epochSetup';
import { generateRandomId } from '../../utils_for_tests/helpers';

/**
 * Exécute les tests pour l'instruction `start_epoch`.
 * @param getTestContext Une fonction pour récupérer le TestContext initialisé.
 */
export function runStartEpochTests(getTestContext: () => TestContext) {
    describe('Instruction: start_epoch', () => {
        let ctx: TestContext;
        let newEpochId: anchor.BN;
        let newEpochPda: PublicKey;

        before(async () => {
            ctx = getTestContext();
            // S'assurer que programConfigAddress est disponible
            if (!ctx.programConfigAddress) {
                throw new Error("ProgramConfigAddress not found in TestContext for start_epoch tests.");
            }
        });

        beforeEach(() => {
            // Générer un ID d'epoch unique pour chaque test pour éviter les collisions
            newEpochId = new anchor.BN(generateRandomId());
            [newEpochPda] = getEpochManagementPda(ctx.program.programId, newEpochId);
        });

        it('should successfully create a new epoch with valid times', async () => {
            const now = Math.floor(Date.now() / 1000);
            const startTime = new anchor.BN(now - 60); // Active: starts in the past
            const endTime = new anchor.BN(now + 3600); // Active: ends in the future

            await ctx.program.methods
                .startEpoch(newEpochId, startTime, endTime)
                .accounts({
                    authority: ctx.adminKeypair.publicKey,
                    programConfig: ctx.programConfigAddress!,
                    epochManagement: newEpochPda,
                    systemProgram: SystemProgram.programId,
                } as any)
                .signers([ctx.adminKeypair])
                .rpc();

            const epochAccount = await ctx.program.account.epochManagement.fetch(newEpochPda);
            expect(epochAccount.epochId.eq(newEpochId)).to.be.true;
            expect(epochAccount.startTime.eq(startTime)).to.be.true;
            expect(epochAccount.endTime.eq(endTime)).to.be.true;
            // L'implémentation actuelle de start_epoch met directement le statut à Active.
            // Si cela changeait pour Pending en fonction des temps, ce test devrait s'adapter.
            expect(JSON.stringify(epochAccount.status)).to.equal(JSON.stringify({ active: {} }));
            expect(epochAccount.processed).to.be.false;
        });

        it('should fail to create an epoch if start_time is after end_time', async () => {
            const now = Math.floor(Date.now() / 1000);
            const startTime = new anchor.BN(now + 3600); // Start in the future
            const endTime = new anchor.BN(now + 60);   // End before start

            try {
                await ctx.program.methods
                    .startEpoch(newEpochId, startTime, endTime)
                    .accounts({
                        authority: ctx.adminKeypair.publicKey,
                        programConfig: ctx.programConfigAddress!,
                        epochManagement: newEpochPda,
                        systemProgram: SystemProgram.programId,
                    } as any)
                    .signers([ctx.adminKeypair])
                    .rpc();
                expect.fail("Transaction should have failed due to invalid time range.");
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal("InvalidEpochTimeRange");
            }
        });

        it('should fail to create an epoch if it already exists (using direct call)', async () => {
            const now = Math.floor(Date.now() / 1000);
            const startTime = new anchor.BN(now);
            const endTime = new anchor.BN(now + 3600);

            // Create it once
            await ctx.program.methods
                .startEpoch(newEpochId, startTime, endTime)
                .accounts({
                    authority: ctx.adminKeypair.publicKey,
                    programConfig: ctx.programConfigAddress!,
                    epochManagement: newEpochPda,
                    systemProgram: SystemProgram.programId,
                } as any)
                .signers([ctx.adminKeypair])
                .rpc();

            // Try to create it again with the same ID
            try {
                await ctx.program.methods
                    .startEpoch(newEpochId, startTime, endTime) // Same epochId
                    .accounts({
                        authority: ctx.adminKeypair.publicKey,
                        programConfig: ctx.programConfigAddress!,
                        epochManagement: newEpochPda, // start_epoch utilise `init`, donc PDA doit être unique pour init
                        systemProgram: SystemProgram.programId,
                    } as any)
                    .signers([ctx.adminKeypair])
                    .rpc();
                expect.fail("Transaction should have failed because epoch already exists and PDA is in use.");
            } catch (error) {
                // L'erreur attendue est souvent liée au fait que le compte (PDA) est déjà utilisé/initialisé
                // car `start_epoch` utilise `init`.
                // Le message exact peut varier: "already in use", "custom program error: 0x0", "Allocate: account Address {address} already in use"
                const errorString = (error as Error).toString();
                expect(errorString.includes("already in use") || 
                       errorString.includes("custom program error: 0x0") || 
                       errorString.includes("AccountNotInitialized") // Anchor peut parfois retourner ceci si l'init est tenté sur un compte existant par une autre instruction.
                                                                   // Toutefois, pour un init direct, "already in use" est plus typique.
                ).to.be.true;
            }
        });

        it('ensureEpochExists helper should correctly create an epoch if it does not exist', async () => {
            const now = Math.floor(Date.now() / 1000);
            const startTime = new anchor.BN(now);
            const endTime = new anchor.BN(now + 3600);
            
            const epochAddress = await ensureEpochExists(ctx, newEpochId, startTime, endTime);
            expect(epochAddress.equals(newEpochPda)).to.be.true;

            const epochAccount = await ctx.program.account.epochManagement.fetch(epochAddress);
            expect(epochAccount.epochId.eq(newEpochId)).to.be.true;
        });

        it('ensureEpochExists helper should return existing epoch address if epoch already exists', async () => {
            const now = Math.floor(Date.now() / 1000);
            const startTime = new anchor.BN(now);
            const endTime = new anchor.BN(now + 3600);

            // Call first time to create
            await ensureEpochExists(ctx, newEpochId, startTime, endTime);
            // Call second time
            const epochAddress = await ensureEpochExists(ctx, newEpochId, startTime, endTime);
            expect(epochAddress.equals(newEpochPda)).to.be.true;
            // No error should be thrown, and console log should indicate it already exists
        });

        // TODO: Ajouter des tests pour vérifier les permissions (qui peut appeler start_epoch)
        // Ces tests sont déjà en partie dans 00_program_configuration/programConfig.test.ts,
        // mais pourraient être dupliqués/adaptés ici pour une couverture complète du module si souhaité.

    });
} 