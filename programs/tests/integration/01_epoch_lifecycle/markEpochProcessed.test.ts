import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { expect } from 'chai';
import { TestContext, getInitializedContext } from '../../setup';
import { 
    ensureEpochIsActive, 
    closeEpochOnChain, 
    markEpochAsProcessedOnChain,
    getEpochManagementPda 
} from '../../setup/epochSetup';
import { generateRandomId } from '../../utils_for_tests/helpers';

/**
 * Exécute les tests pour l'instruction `mark_epoch_processed`.
 */
export function runMarkEpochProcessedTests() {
    describe('Instruction: mark_epoch_processed', () => {
        let ctx: TestContext;
        let epochIdToProcess: anchor.BN;
        let epochPdaToProcess: PublicKey;

        before(async () => {
            ctx = getInitializedContext();
            if (!ctx.programConfigAddress) {
                throw new Error("  [MarkEpochTests] ProgramConfigAddress not found in TestContext for mark_epoch_processed tests.");
            }
            console.log("  [MarkEpochTests] Context acquired.");
        });

        beforeEach(async () => {
            epochIdToProcess = new anchor.BN(generateRandomId());
            epochPdaToProcess = await ensureEpochIsActive(ctx, epochIdToProcess);
            await closeEpochOnChain(ctx, epochIdToProcess);
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
            console.log(`  [MarkEpochTests] Epoch ${epochIdToProcess} marked as processed.`);
        });

        it('should fail to mark an epoch that is still active', async () => {
            const stillActiveEpochId = new anchor.BN(generateRandomId());
            const stillActiveEpochPda = await ensureEpochIsActive(ctx, stillActiveEpochId);
            console.log(`  [MarkEpochTests] Testing with still active epoch ${stillActiveEpochId}.`);
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
                expect.fail("  [MarkEpochTests] Transaction should have failed because epoch is not closed.");
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal("EpochNotClosed");
                console.log(`  [MarkEpochTests] Correctly failed due to EpochNotClosed.`);
            }
        });

        it('should fail to mark an epoch that is already processed', async () => {
            await markEpochAsProcessedOnChain(ctx, epochIdToProcess);
            console.log(`  [MarkEpochTests] Epoch ${epochIdToProcess} marked once for duplicate mark test.`);
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
                expect.fail("  [MarkEpochTests] Transaction should have failed because epoch is already processed.");
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal("EpochAlreadyProcessed");
                console.log(`  [MarkEpochTests] Correctly failed due to EpochAlreadyProcessed.`);
            }
        });

        it('should fail to mark a non-existent epoch', async () => {
            const nonExistentEpochId = new anchor.BN(generateRandomId());
            const [nonExistentEpochPda] = getEpochManagementPda(ctx.program.programId, nonExistentEpochId);
            console.log(`  [MarkEpochTests] Testing with non-existent epoch ${nonExistentEpochId}.`);
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
                expect.fail("  [MarkEpochTests] Transaction should have failed because epoch does not exist.");
            } catch (error) {
                const errorString = (error as Error).toString();
                expect(errorString.includes("AccountNotInitialized") || 
                       errorString.includes("AccountDiscriminatorNotFound") ||
                       errorString.includes("could not find account") || 
                       errorString.includes("Could not deserialize account data"))
                .to.be.true;
                console.log(`  [MarkEpochTests] Correctly failed for non-existent epoch.`);
            }
        });

        it('markEpochAsProcessedOnChain helper should correctly mark a closed epoch', async () => {
            await markEpochAsProcessedOnChain(ctx, epochIdToProcess);
            const epochAccount = await ctx.program.account.epochManagement.fetch(epochPdaToProcess);
            expect(epochAccount.processed).to.be.true;
            console.log(`  [MarkEpochTests] markEpochAsProcessedOnChain helper marked epoch ${epochIdToProcess}.`);
        });
    });
} 