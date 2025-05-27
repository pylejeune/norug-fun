import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { expect } from 'chai';
import { TestContext, getInitializedContext } from '../../setup';
import { ensureEpochIsActive, closeEpochOnChain, getEpochManagementPda } from '../../setup/epochSetup';
import { generateRandomId } from '../../utils_for_tests/helpers';

/**
 * Exécute les tests pour l'instruction `end_epoch`.
 */
export function runEndEpochTests() {
    describe('Instruction: end_epoch', () => {
        let ctx: TestContext;
        let activeEpochId: anchor.BN;
        let activeEpochPda: PublicKey;

        before(async () => {
            ctx = getInitializedContext();
            if (!ctx.programConfigAddress) {
                throw new Error("  [EndEpochTests] ProgramConfigAddress not found in TestContext for end_epoch tests.");
            }
            console.log("  [EndEpochTests] Context acquired.");
        });

        beforeEach(async () => {
            activeEpochId = new anchor.BN(generateRandomId());
            activeEpochPda = await ensureEpochIsActive(ctx, activeEpochId);
            // console.log(`  [EndEpochTests] beforeEach: activeEpochId=${activeEpochId}, activeEpochPda=${activeEpochPda.toBase58()} ensured active.`);
        });

        it('should successfully close an active epoch', async () => {
            const epochBeforeClose = await ctx.program.account.epochManagement.fetch(activeEpochPda);
            expect(JSON.stringify(epochBeforeClose.status)).to.equal(JSON.stringify({ active: {} }));
            const initialEndTime = epochBeforeClose.endTime;

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
            const currentTimeSeconds = Math.floor(Date.now() / 1000);
            expect(epochAfterClose.endTime.toNumber()).to.be.closeTo(currentTimeSeconds, 5); 
            expect(epochAfterClose.endTime.toNumber()).to.be.at.most(initialEndTime.toNumber());
            console.log(`  [EndEpochTests] Epoch ${activeEpochId} closed successfully.`);
        });

        it('should fail to close an epoch that is already closed', async () => {
            await closeEpochOnChain(ctx, activeEpochId);
            console.log(`  [EndEpochTests] Epoch ${activeEpochId} closed once for duplicate close test.`);
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
                expect.fail("  [EndEpochTests] Transaction should have failed because epoch is already closed.");
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal("EpochAlreadyInactive");
                console.log(`  [EndEpochTests] Correctly failed due to EpochAlreadyInactive.`);
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
                        epochManagement: nonExistentEpochPda, 
                        systemProgram: SystemProgram.programId,
                    } as any)
                    .signers([ctx.adminKeypair])
                    .rpc();
                expect.fail("  [EndEpochTests] Transaction should have failed because epoch does not exist.");
            } catch (error) {
                const errorString = (error as Error).toString();
                expect(errorString.includes("AccountNotInitialized") || 
                       errorString.includes("AccountDiscriminatorNotFound") || 
                       errorString.includes("Could not deserialize account data"))
                .to.be.true;
                console.log(`  [EndEpochTests] Correctly failed for non-existent epoch.`);
            }
        });
        
        it('closeEpochOnChain helper should correctly close an active epoch', async () => {
            await closeEpochOnChain(ctx, activeEpochId);
            const epochAccount = await ctx.program.account.epochManagement.fetch(activeEpochPda);
            expect(JSON.stringify(epochAccount.status)).to.equal(JSON.stringify({ closed: {} }));
            console.log(`  [EndEpochTests] closeEpochOnChain helper closed epoch ${activeEpochId}.`);
        });

        it('closeEpochOnChain helper should throw error for non-existent epoch', async () => {
            const nonExistentEpochId = new anchor.BN(generateRandomId());
            try {
                await closeEpochOnChain(ctx, nonExistentEpochId);
                expect.fail("  [EndEpochTests] closeEpochOnChain should have failed for a non-existent epoch.");
            } catch (error) {
                expect(error.message).to.include(`Epoch ${nonExistentEpochId.toString()} must exist to be closed.`);
                console.log(`  [EndEpochTests] closeEpochOnChain helper correctly failed for non-existent epoch.`);
            }
        });
    });
}
