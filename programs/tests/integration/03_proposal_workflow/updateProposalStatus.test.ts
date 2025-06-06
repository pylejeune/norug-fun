import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import chai from 'chai';
import { expect } from 'chai';
import { Programs } from '../../../target/types/programs';
import { TestContext, getInitializedContext, generateRandomBN, shortenAddress } from '../../setup';
import { ensureEpochIsActive, closeEpochOnChain } from '../../setup/epochSetup';
import { createProposalOnChain, TokenProposalDetails, updateProposalStatusOnChain } from '../../setup/proposalSetup';

export function runUpdateProposalStatusTests() {
    describe('Instruction: update_proposal_status', () => {
        let ctx: TestContext;
        let program: Program<Programs>;
        let adminKeypair: Keypair; // L'admin du programme
        let proposerKeypair: Keypair;

        let epochId: anchor.BN;
        let activeEpochPda: PublicKey;
        let proposalPda: PublicKey;

        before(async () => {
            ctx = getInitializedContext();
            program = ctx.program;
            adminKeypair = ctx.adminKeypair;

            proposerKeypair = Keypair.generate();
            const airdropSignature = await ctx.provider.connection.requestAirdrop(proposerKeypair.publicKey, 1 * LAMPORTS_PER_SOL);
            await ctx.provider.connection.confirmTransaction(airdropSignature, "confirmed");
        });

        beforeEach(async () => {
            // Réinitialiser une époque et une proposition fraîches pour chaque test
            epochId = generateRandomBN();
            activeEpochPda = await ensureEpochIsActive(ctx, epochId);

            const proposalDetails: TokenProposalDetails = {
                epochId: epochId,
                name: "StatusUpdateToken",
                symbol: "SUT",
                totalSupply: new anchor.BN(1000000),
                creatorAllocationPercentage: 10,
                description: "Token for testing status updates.",
                imageUrl: null,
                lockupPeriod: new anchor.BN(0),
            };
            proposalPda = await createProposalOnChain(ctx, proposerKeypair, proposalDetails, activeEpochPda);
            const initialProposal = await program.account.tokenProposal.fetch(proposalPda);
            expect(JSON.stringify(initialProposal.status)).to.equal(JSON.stringify({ active: {} }));
        });

        // Tests pour les changements de statut valides
        // Rappel : update_proposal_status nécessite que l'époque soit fermée.

        it('should allow admin to change status to Validated if epoch is closed', async () => {
            await closeEpochOnChain(ctx, epochId, adminKeypair);
            const newStatus = { validated: {} };
            await updateProposalStatusOnChain(ctx, proposalPda, activeEpochPda, newStatus);
            const updatedProposal = await program.account.tokenProposal.fetch(proposalPda);
            expect(JSON.stringify(updatedProposal.status)).to.equal(JSON.stringify({ validated: {} }));
        });

        it('should allow admin to change status to Rejected if epoch is closed', async () => {
            await closeEpochOnChain(ctx, epochId, adminKeypair);
            const newStatus = { rejected: {} };
            await updateProposalStatusOnChain(ctx, proposalPda, activeEpochPda, newStatus);
            const updatedProposal = await program.account.tokenProposal.fetch(proposalPda);
            expect(JSON.stringify(updatedProposal.status)).to.equal(JSON.stringify({ rejected: {} }));
        });

        // Les statuts Processing et Completed n'existent plus dans l'IDL actuel.
        // Ces tests sont commentés pour l'instant. Il faudra clarifier les transitions d'état attendues.
        /*
        it('should allow admin to change status to Processing if epoch is closed and previous was Validated', async () => {
            await closeEpochOnChain(ctx, epochId, adminKeypair);
            let currentStatusToSend: any = { validated: {} }; 
            await updateProposalStatusOnChain(ctx, proposalPda, activeEpochPda, currentStatusToSend);
            let updatedProposal = await program.account.tokenProposal.fetch(proposalPda);
            expect(JSON.stringify(updatedProposal.status)).to.equal(JSON.stringify({ validated: {} })); 

            // Puis Processing - N'EXISTE PLUS
            // currentStatusToSend = { processing: {} }; 
            // await updateProposalStatusOnChain(ctx, proposalPda, activeEpochPda, currentStatusToSend);
            // updatedProposal = await program.account.tokenProposal.fetch(proposalPda);
            // expect(JSON.stringify(updatedProposal.status)).to.equal(JSON.stringify({ processing: {} })); 
        });
        
        it('should allow admin to change status to Completed if epoch is closed and previous was Processing', async () => {
            await closeEpochOnChain(ctx, epochId, adminKeypair);
            let tempStatusToSend: any = { validated: {} }; 
            await updateProposalStatusOnChain(ctx, proposalPda, activeEpochPda, tempStatusToSend);
            // tempStatusToSend = { processing: {} }; // N'EXISTE PLUS
            // await updateProposalStatusOnChain(ctx, proposalPda, activeEpochPda, tempStatusToSend);
            // let updatedProposal = await program.account.tokenProposal.fetch(proposalPda);
            // expect(JSON.stringify(updatedProposal.status)).to.equal(JSON.stringify({ processing: {} })); 

            // const finalStatusToSend = { completed: {} }; // N'EXISTE PLUS
            // await updateProposalStatusOnChain(ctx, proposalPda, activeEpochPda, finalStatusToSend);
            // updatedProposal = await program.account.tokenProposal.fetch(proposalPda);
            // expect(JSON.stringify(updatedProposal.status)).to.equal(JSON.stringify({ completed: {} })); 
        });
        */

        // Tests pour les cas d'erreur

        it('should fail to update status if epoch is still active', async () => {
            const newStatus = { validated: {} };
            let errorCaught = false;
            try {
                await updateProposalStatusOnChain(ctx, proposalPda, activeEpochPda, newStatus);
            } catch (error) {
                expect(error.message).to.include("EpochNotClosed");
                errorCaught = true;
            }
            expect(errorCaught).to.be.true;
        });

        it('should fail if signer is not the program admin', async () => {
            await closeEpochOnChain(ctx, epochId, adminKeypair);
            
            const nonAdminKeypair = Keypair.generate();
            const airdropSignature = await ctx.provider.connection.requestAirdrop(nonAdminKeypair.publicKey, 0.1 * LAMPORTS_PER_SOL);
            await ctx.provider.connection.confirmTransaction(airdropSignature, "confirmed");

            const newStatus = { validated: {} };
            let errorCaught = false;
            try {
                await program.methods.updateProposalStatus(newStatus as any)
                    .accounts({
                        proposal: proposalPda,
                        epochManagement: activeEpochPda,
                        authority: nonAdminKeypair.publicKey,
                        programConfig: ctx.programConfigAddress,
                    })
                    .signers([nonAdminKeypair])
                    .rpc();
            } catch (error) {
                expect(error.error.errorCode.code).to.equal("Unauthorized");
                errorCaught = true;
            }
            expect(errorCaught).to.be.true;
        });

        it('should fail to change status from Active to an invalid state directly (example)', async () => {
            await closeEpochOnChain(ctx, epochId, adminKeypair);
            const newStatus = { someOtherState: {} }; 
            let errorCaught = false;
            try {
                await updateProposalStatusOnChain(ctx, proposalPda, activeEpochPda, newStatus);
            } catch (error) {
                expect(error.message.toLowerCase()).to.include("unable to infer src variant");
                errorCaught = true;
            }
            expect(errorCaught).to.be.true;
        });

        it('should fail to change status from Validated to Rejected (if not allowed by logic)', async () => {
            await closeEpochOnChain(ctx, epochId, adminKeypair);
            let currentStatusToSend: any = { validated: {} };
            await updateProposalStatusOnChain(ctx, proposalPda, activeEpochPda, currentStatusToSend);

            const newStatus = { rejected: {} }; 
            let errorCaught = false;
            try {
                await updateProposalStatusOnChain(ctx, proposalPda, activeEpochPda, newStatus);
            } catch (error) {
                expect(error.message).to.include("ProposalAlreadyFinalized");
                errorCaught = true;
            }
            expect(errorCaught).to.be.true;
        });
        
        it('should fail to change status from Rejected to Validated (if not allowed by logic)', async () => {
            await closeEpochOnChain(ctx, epochId, adminKeypair);
            let currentStatusToSend: any = { rejected: {} };
            await updateProposalStatusOnChain(ctx, proposalPda, activeEpochPda, currentStatusToSend);

            const newStatus = { validated: {} }; 
            let errorCaught = false;
            try {
                await updateProposalStatusOnChain(ctx, proposalPda, activeEpochPda, newStatus);
            } catch (error) {
                expect(error.message).to.include("ProposalAlreadyFinalized");
                errorCaught = true;
            }
            expect(errorCaught).to.be.true;
        });

        it('should fail to change status to Active once it has been changed', async () => {
            await closeEpochOnChain(ctx, epochId, adminKeypair);
            let currentStatusToSend: any = { validated: {} }; // D'abord à un état valide
            await updateProposalStatusOnChain(ctx, proposalPda, activeEpochPda, currentStatusToSend);

            const newStatus = { active: {} }; 
            let errorCaught = false;
            try {
                await updateProposalStatusOnChain(ctx, proposalPda, activeEpochPda, newStatus);
            } catch (error) {
                expect(error.message).to.include("ProposalAlreadyFinalized");
                errorCaught = true;
            }
            expect(errorCaught).to.be.true;
        });


        it('should fail if proposal PDA does not match epoch_management account', async () => {
            await closeEpochOnChain(ctx, epochId, adminKeypair);

            const anotherEpochId = generateRandomBN(epochId.toNumber() + 1);
            const anotherEpochPda = await ensureEpochIsActive(ctx, anotherEpochId);
            await closeEpochOnChain(ctx, anotherEpochId, adminKeypair);
            
            const newStatus = { validated: {} };
            let errorCaught = false;
            try {
                await updateProposalStatusOnChain(ctx, proposalPda, anotherEpochPda, newStatus);
            } catch (error) {
                expect(error.message).to.include("ProposalNotInEpoch");
                errorCaught = true;
            }
            expect(errorCaught).to.be.true;
        });
        
        // TODO:
        // - Tester les transitions non valides (ex: Approved -> Rejected, Rejected -> Approved, Active -> Processing/Completed)
        // - Tester le cas où la proposition n'existe pas.
        // - Tester le cas où epoch_management n'existe pas.
    });
} 