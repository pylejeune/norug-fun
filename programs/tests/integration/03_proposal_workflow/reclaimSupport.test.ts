import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import chai from 'chai';
import { expect } from 'chai';
import { Programs } from '../../../target/types/programs';
import { TestContext, getInitializedContext, generateRandomBN, shortenAddress } from '../../setup';
import { ensureEpochIsActive, closeEpochOnChain, markEpochAsProcessedOnChain } from '../../setup/epochSetup';
import { 
    createProposalOnChain, 
    supportProposalOnChain, 
    TokenProposalDetails, 
    getSupportPda
} from '../../setup/proposalSetup';

export function runReclaimSupportTests() {
    describe('Instruction: reclaim_support', () => {
        let ctx: TestContext;
        let program: Program<Programs>;
        let adminKeypair: Keypair;
        let proposerKeypair: Keypair;
        let supporterKeypair: Keypair;

        let epochId: anchor.BN;
        let activeEpochPda: PublicKey;
        let proposalPda: PublicKey;
        let userSupportPda: PublicKey;

        const supportAmount = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL

        before(async () => {
            ctx = getInitializedContext();
            program = ctx.program;
            adminKeypair = ctx.adminKeypair;

            proposerKeypair = Keypair.generate();
            const airdropProposer = await ctx.provider.connection.requestAirdrop(proposerKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
            await ctx.provider.connection.confirmTransaction(airdropProposer, "confirmed");

            supporterKeypair = Keypair.generate();
            const airdropSupporter = await ctx.provider.connection.requestAirdrop(supporterKeypair.publicKey, 5 * LAMPORTS_PER_SOL);
            await ctx.provider.connection.confirmTransaction(airdropSupporter, "confirmed");
        });

        // Helper function to setup a scenario for reclaim
        async function setupScenarioForReclaim(proposalStatusToSet: object | null) {
            epochId = generateRandomBN();
            activeEpochPda = await ensureEpochIsActive(ctx, epochId);

            const proposalDetails: TokenProposalDetails = {
                epochId: epochId,
                name: "ReclaimTestToken",
                symbol: "RTT",
                totalSupply: new anchor.BN(1000000),
                creatorAllocationPercentage: 10,
                description: "Token for testing reclaim support.",
                imageUrl: null,
                lockupPeriod: new anchor.BN(0),
            };
            proposalPda = await createProposalOnChain(ctx, proposerKeypair, proposalDetails, activeEpochPda);
            
            // Log du solde du supporter avant de soutenir
            // const supporterBalanceBeforeSupport = await ctx.provider.connection.getBalance(supporterKeypair.publicKey);
            // console.log(`  [ReclaimSetup] Supporter ${supporterKeypair.publicKey.toBase58()} balance before support: ${supporterBalanceBeforeSupport} lamports`);

            // Supporter la proposition
            await supportProposalOnChain(ctx, supporterKeypair, proposalPda, proposalDetails.epochId, activeEpochPda, supportAmount);
            
            // Obtenir le userSupportPda APRÈS un soutien réussi et avec les bons paramètres
            [userSupportPda] = getSupportPda(program.programId, proposalDetails.epochId, supporterKeypair.publicKey, proposalPda);

            // Fermer l'époque
            await closeEpochOnChain(ctx, epochId, adminKeypair);

            // Mettre à jour le statut de la proposition si nécessaire
            if (proposalStatusToSet) {
                await ctx.program.methods.updateProposalStatus(proposalStatusToSet as any)
                    .accounts({
                        proposal: proposalPda,
                        epochManagement: activeEpochPda,
                        authority: adminKeypair.publicKey,
                        programConfig: ctx.programConfigAddress,
                    })
                    .signers([adminKeypair])
                    .rpc();
            }
            
            // Marquer l'époque comme traitée (nécessaire pour reclaim)
            // Sauf si la proposition est 'active', car une époque avec une prop active ne peut être marquée traitée.
            if (proposalStatusToSet && JSON.stringify(proposalStatusToSet) !== JSON.stringify({ active: {} })) {
                 // Et que l'époque n'est pas déjà marquée comme traitée
                const epochAccount = await program.account.epochManagement.fetch(activeEpochPda);
                if (!epochAccount.processed) {
                    await markEpochAsProcessedOnChain(ctx, epochId, adminKeypair);
                }
            }
        }

        describe('Success Cases', () => {
            it('should allow a supporter to reclaim their SOL if the proposal was Rejected', async () => {
                await setupScenarioForReclaim({ rejected: {} });

                const supporterBalanceBefore = await ctx.provider.connection.getBalance(supporterKeypair.publicKey);
                const userSupportAccountBefore = await program.account.userProposalSupport.fetch(userSupportPda);
                const netSupportAmount = userSupportAccountBefore.amount;

                await program.methods.reclaimSupport()
                    .accounts({
                        user: supporterKeypair.publicKey,
                        tokenProposal: proposalPda,
                        userProposalSupport: userSupportPda,
                        epochManagement: activeEpochPda,
                        systemProgram: SystemProgram.programId,
                    } as any)
                    .signers([supporterKeypair])
                    .rpc();

                const supporterBalanceAfter = await ctx.provider.connection.getBalance(supporterKeypair.publicKey);
                
                // Vérifier que le compte UserProposalSupport est fermé
                try {
                    await program.account.userProposalSupport.fetch(userSupportPda);
                    chai.assert.fail("UserProposalSupport account should have been closed");
                } catch (error) {
                    expect(error.message).to.include("Account does not exist or has no data");
                }

                // Vérifier que le solde du supporter a augmenté du montant net du soutien (moins les frais de transaction)
                // C'est une vérification approximative car les frais de tx peuvent varier légèrement.
                const expectedMinIncrease = netSupportAmount.toNumber() - 50000; // 50k lamports pour marge de frais
                expect(supporterBalanceAfter - supporterBalanceBefore).to.be.greaterThanOrEqual(expectedMinIncrease);
                // Pour une vérification plus précise, on pourrait calculer les frais exacts.
            });

            // TODO: Tester le reclaim si la proposition est Active mais que l'époque est traitée (scénario d'échec de la proposition implicite)
        });

        describe('Error Cases', () => {
            it('should fail to reclaim if the proposal was Validated (Approved)', async () => {
                await setupScenarioForReclaim({ validated: {} });
                let errorCaught = false;
                try {
                    await program.methods.reclaimSupport()
                        .accounts({
                            user: supporterKeypair.publicKey,
                            tokenProposal: proposalPda,
                            userProposalSupport: userSupportPda,
                            epochManagement: activeEpochPda,
                            systemProgram: SystemProgram.programId,
                        } as any)
                        .signers([supporterKeypair])
                        .rpc();
                } catch (error) {
                    expect(error.message).to.include("ProposalNotRejected");
                    errorCaught = true;
                }
                expect(errorCaught).to.be.true;
            });

            it('should fail to reclaim if the epoch is not yet processed', async () => {
                // Setup sans marquer l'époque comme traitée
                epochId = generateRandomBN();
                activeEpochPda = await ensureEpochIsActive(ctx, epochId);
                const proposalDetails: TokenProposalDetails = {
                    epochId: epochId, name: "ReclaimNoProcess", symbol: "RNP",
                    totalSupply: new anchor.BN(1000000), creatorAllocationPercentage: 10,
                    description: "Test", imageUrl: null, lockupPeriod: new anchor.BN(0),
                };
                proposalPda = await createProposalOnChain(ctx, proposerKeypair, proposalDetails, activeEpochPda);
                await supportProposalOnChain(ctx, supporterKeypair, proposalPda, proposalDetails.epochId, activeEpochPda, supportAmount);
                [userSupportPda] = getSupportPda(program.programId, proposalDetails.epochId, supporterKeypair.publicKey, proposalPda);
                await closeEpochOnChain(ctx, epochId, adminKeypair);
                // Ne pas appeler markEpochAsProcessedOnChain
                 await ctx.program.methods.updateProposalStatus({ rejected: {} } as any)
                    .accounts({ proposal: proposalPda, epochManagement: activeEpochPda, authority: adminKeypair.publicKey, programConfig: ctx.programConfigAddress })
                    .signers([adminKeypair]).rpc();

                let errorCaught = false;
                try {
                    await program.methods.reclaimSupport()
                        .accounts({
                            user: supporterKeypair.publicKey,
                            tokenProposal: proposalPda,
                            userProposalSupport: userSupportPda,
                            epochManagement: activeEpochPda,
                            systemProgram: SystemProgram.programId,
                        } as any) 
                        .signers([supporterKeypair])
                        .rpc();
                } catch (error) {
                    expect(error.message).to.include("EpochNotProcessed");
                    errorCaught = true;
                }
                expect(errorCaught).to.be.true;
            });

            it('should fail to reclaim if UserProposalSupport account does not belong to the signer', async () => {
                await setupScenarioForReclaim({ rejected: {} });
                const otherSupporter = Keypair.generate(); 
                // Assurer que otherSupporter a des SOLs pour signer la transaction
                const airdropsignature = await ctx.provider.connection.requestAirdrop(otherSupporter.publicKey, 1 * LAMPORTS_PER_SOL);
                await ctx.provider.connection.confirmTransaction(airdropsignature, "confirmed");

                let errorCaught = false;
                try {
                    await program.methods.reclaimSupport()
                        .accounts({
                            user: otherSupporter.publicKey,
                            tokenProposal: proposalPda,
                            userProposalSupport: userSupportPda, // Ce PDA appartient à supporterKeypair, pas à otherSupporter
                            epochManagement: activeEpochPda,
                            systemProgram: SystemProgram.programId,
                        } as any)
                        .signers([otherSupporter]) // otherSupporter signe
                        .rpc();
                } catch (error) {
                    // L'erreur attendue est ConstraintSeeds car le user_proposal_support PDA
                    // ne correspondra pas aux seeds dérivées avec otherSupporter.publicKey
                    expect(error.error.errorCode.code).to.equal("ConstraintSeeds");
                    errorCaught = true;
                }
                expect(errorCaught).to.be.true;
            });
            
            it('should fail to reclaim twice for the same support', async () => {
                await setupScenarioForReclaim({ rejected: {} });

                // Premier reclaim réussi
                await program.methods.reclaimSupport()
                    .accounts({
                        user: supporterKeypair.publicKey,
                        tokenProposal: proposalPda,
                        userProposalSupport: userSupportPda,
                        epochManagement: activeEpochPda,
                        systemProgram: SystemProgram.programId,
                    } as any)
                    .signers([supporterKeypair])
                    .rpc();

                // Tentative de deuxième reclaim
                let errorCaught = false;
                try {
                    await program.methods.reclaimSupport()
                        .accounts({
                            user: supporterKeypair.publicKey,
                            tokenProposal: proposalPda,
                            userProposalSupport: userSupportPda,
                            epochManagement: activeEpochPda,
                            systemProgram: SystemProgram.programId,
                        } as any)
                        .signers([supporterKeypair])
                        .rpc();
                } catch (error) {
                     // Le compte userSupport étant fermé, l'erreur sera probablement liée à cela
                    expect(error.message).to.include("AccountNotInitialized"); // Ou une erreur sur le compte fermé
                    errorCaught = true;
                }
                expect(errorCaught).to.be.true;
            });

            // TODO:
            // - Reclaim quand la proposition n'existe pas
            // - Reclaim quand l'epoch_management n'existe pas
            // - Reclaim quand user_support_pda ne correspond pas à la proposition ou au supporter
            // - Reclaim avec un compte treasury erroné // N'est plus pertinent car treasury n'est pas utilisé dans reclaim_support
        });
    });
} 