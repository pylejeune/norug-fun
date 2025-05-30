import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { expect } from 'chai';
import { TestContext, getInitializedContext } from '../../setup';
import { ensureEpochExists, getEpochManagementPda } from '../../setup/epochSetup';
import { generateRandomId } from '../../utils_for_tests/helpers';

/**
 * Exécute les tests pour l'instruction `start_epoch`.
 */
export function runStartEpochTests() {
    describe('Instruction: start_epoch', () => {
        let ctx: TestContext;
        let newEpochId: anchor.BN;
        let newEpochPda: PublicKey;

        before(async () => {
            ctx = getInitializedContext();
            if (!ctx.programConfigAddress) {
                throw new Error("  [StartEpochTests] ProgramConfigAddress not found in TestContext for start_epoch tests.");
            }
            console.log("  [StartEpochTests] Context acquired.");
        });

        beforeEach(() => {
            newEpochId = new anchor.BN(generateRandomId());
            [newEpochPda] = getEpochManagementPda(ctx.program.programId, newEpochId);
            // console.log(`  [StartEpochTests] beforeEach: newEpochId=${newEpochId}, newEpochPda=${newEpochPda.toBase58()}`);
        });

        it('should successfully create a new epoch with valid times', async () => {
            const now = Math.floor(Date.now() / 1000);
            const startTime = new anchor.BN(now - 60); 
            const endTime = new anchor.BN(now + 3600); 

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
            expect(JSON.stringify(epochAccount.status)).to.equal(JSON.stringify({ active: {} }));
            expect(epochAccount.processed).to.be.false;
            console.log(`  [StartEpochTests] Epoch ${newEpochId} created successfully.`);
        });

        it('should fail to create an epoch if start_time is after end_time', async () => {
            const now = Math.floor(Date.now() / 1000);
            const startTime = new anchor.BN(now + 3600); 
            const endTime = new anchor.BN(now + 60);   

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
                expect.fail("  [StartEpochTests] Transaction should have failed due to invalid time range.");
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal("InvalidEpochTimeRange");
                console.log(`  [StartEpochTests] Correctly failed due to InvalidEpochTimeRange.`);
            }
        });

        it('should fail to create an epoch if it already exists (using direct call)', async () => {
            const now = Math.floor(Date.now() / 1000);
            const startTime = new anchor.BN(now);
            const endTime = new anchor.BN(now + 3600);

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
            console.log(`  [StartEpochTests] First epoch ${newEpochId} created for duplicate test.`);

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
                expect.fail("  [StartEpochTests] Transaction should have failed because epoch already exists.");
            } catch (error) {
                const errorString = (error as Error).toString();
                expect(errorString.includes("already in use") || 
                       errorString.includes("custom program error: 0x0")).to.be.true;
                console.log(`  [StartEpochTests] Correctly failed due to account already in use.`);
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
            console.log(`  [StartEpochTests] ensureEpochExists created epoch ${newEpochId}.`);
        });

        it('ensureEpochExists helper should return existing epoch address if epoch already exists', async () => {
            const now = Math.floor(Date.now() / 1000);
            const startTime = new anchor.BN(now);
            const endTime = new anchor.BN(now + 3600);

            await ensureEpochExists(ctx, newEpochId, startTime, endTime);
            console.log(`  [StartEpochTests] ensureEpochExists first call for epoch ${newEpochId} done.`);
            const epochAddress = await ensureEpochExists(ctx, newEpochId, startTime, endTime);
            expect(epochAddress.equals(newEpochPda)).to.be.true;
            console.log(`  [StartEpochTests] ensureEpochExists second call for epoch ${newEpochId} confirmed existing.`);
        });
    });
} 