import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import chai from 'chai';
import { expect } from 'chai';
import { Programs } from '../../../target/types/programs';
import { TestContext, getInitializedContext, generateRandomBN, shortenAddress } from '../../setup';
import { ensureEpochIsActive } from '../../setup/epochSetup';
import {
    createProposalOnChain,
    TokenProposalDetails,
    supportProposalOnChain,
    getSupportPda
} from '../../setup/proposalSetup';

// Constantes pour le calcul des frais (dupliquées de constants.rs pour le test)
const SUPPORT_FEE_PERCENTAGE_NUMERATOR = new anchor.BN(5);
const SUPPORT_FEE_PERCENTAGE_DENOMINATOR = new anchor.BN(1000);

export function runSupportProposalTests() {
    describe('Instruction: support_proposal', () => {
        let ctx: TestContext;
        let program: Program<Programs>;
        
        let proposerKeypair: Keypair;
        let supporterKeypair: Keypair;

        let currentEpochId: anchor.BN;
        let activeEpochPda: PublicKey; // PDA de EpochManagement pour l'époque active
        let proposalPda: PublicKey;    // PDA de la TokenProposal créée
        let userSupportPda: PublicKey; // Stocker le PDA du UserProposalSupport après sa création

        // Pour stocker les états initiaux et finaux
        let initialProposalAccountState: any; // eslint-disable-line @typescript-eslint/no-explicit-any
        let updatedProposalAccountState: any; // eslint-disable-line @typescript-eslint/no-explicit-any
        let userSupportAccountState: any;     // eslint-disable-line @typescript-eslint/no-explicit-any
        let initialSupporterBalance: number;
        let finalSupporterBalance: number;
        let initialTreasuryBalance: number;
        let finalTreasuryBalance: number;

        const supportAmountGross = new anchor.BN(1 * LAMPORTS_PER_SOL); // Montant brut que l'utilisateur envoie
        let expectedFeeAmount: anchor.BN;
        let expectedNetSupportAmount: anchor.BN;

        before(async () => {
            ctx = getInitializedContext();
            program = ctx.program;

            // Setup Proposer
            proposerKeypair = Keypair.generate();
            let airdropSignatureProposer = await ctx.provider.connection.requestAirdrop(proposerKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
            await ctx.provider.connection.confirmTransaction(airdropSignatureProposer, "confirmed");
            // console.log(`  [SupportProposalTests:GlobalBefore] Proposer for tests: ${shortenAddress(proposerKeypair.publicKey)}`);

            // Setup Supporter
            supporterKeypair = Keypair.generate();
            let airdropSignatureSupporter = await ctx.provider.connection.requestAirdrop(supporterKeypair.publicKey, 3 * LAMPORTS_PER_SOL); // Un peu plus pour le supporter
            await ctx.provider.connection.confirmTransaction(airdropSignatureSupporter, "confirmed");
            // console.log(`  [SupportProposalTests:GlobalBefore] Supporter for tests: ${shortenAddress(supporterKeypair.publicKey)}`);

            // Setup Epoch & Proposal (une seule fois pour tous les tests de ce describe)
            currentEpochId = generateRandomBN();
            activeEpochPda = await ensureEpochIsActive(ctx, currentEpochId);
            // console.log(`  [SupportProposalTests:GlobalBefore] Active Epoch for tests: ${currentEpochId.toString()} (${shortenAddress(activeEpochPda)})`);

            const proposalDetails: TokenProposalDetails = {
                epochId: currentEpochId,
                name: "TokenToSupport",
                symbol: "TTS",
                totalSupply: new anchor.BN(5000000),
                creatorAllocationPercentage: 5, // 5%
                description: "A token specifically created to be supported in tests.",
                imageUrl: null,
                lockupPeriod: new anchor.BN(0), // Pas de lockup pour simplifier
            };
            proposalPda = await createProposalOnChain(ctx, proposerKeypair, proposalDetails, activeEpochPda);
            console.log(`  [SupportProposalTests:GlobalBefore] Proposal ${shortenAddress(proposalPda)} by ${shortenAddress(proposerKeypair.publicKey)} to be supported.`);

            // Calcul des frais attendus et du montant net
            expectedFeeAmount = supportAmountGross
                .mul(SUPPORT_FEE_PERCENTAGE_NUMERATOR)
                .div(SUPPORT_FEE_PERCENTAGE_DENOMINATOR);
            expectedNetSupportAmount = supportAmountGross.sub(expectedFeeAmount);
            // console.log(`  [SupportProposalTests:GlobalBefore] supportAmountGross: ${supportAmountGross.toString()}, expectedFeeAmount: ${expectedFeeAmount.toString()}, expectedNetSupportAmount: ${expectedNetSupportAmount.toString()}`);

            // Action principale : un utilisateur soutient la proposition
            // Les états initiaux sont récupérés avant cette action
            initialProposalAccountState = await program.account.tokenProposal.fetch(proposalPda);
            initialSupporterBalance = await ctx.provider.connection.getBalance(supporterKeypair.publicKey);
            initialTreasuryBalance = await ctx.provider.connection.getBalance(ctx.treasuryAddress!);
            // console.log(`  [SupportProposalTests:GlobalBefore] Initial states recorded.`);

            userSupportPda = await supportProposalOnChain(
                ctx,
                supporterKeypair,
                proposalPda,
                currentEpochId, // epochId de la proposition, requis pour le PDA de UserProposalSupport
                activeEpochPda, // epochManagementAddress pour l'époque de la proposition
                supportAmountGross // L'utilisateur initie le soutien avec le montant brut
            );
            console.log(`  [SupportProposalTests:GlobalBefore] Supporter ${shortenAddress(supporterKeypair.publicKey)} supported proposal ${shortenAddress(proposalPda)} with ${supportAmountGross.toString()} lamports (gross).`);

            // Les états finaux/mis à jour sont récupérés après l'action
            updatedProposalAccountState = await program.account.tokenProposal.fetch(proposalPda);
            userSupportAccountState = await program.account.userProposalSupport.fetch(userSupportPda);
            finalSupporterBalance = await ctx.provider.connection.getBalance(supporterKeypair.publicKey);
            finalTreasuryBalance = await ctx.provider.connection.getBalance(ctx.treasuryAddress!);
            // console.log(`  [SupportProposalTests:GlobalBefore] Updated states recorded.`);
        });

        it('should create a valid UserProposalSupport account with the net amount', async () => {
            expect(userSupportPda).to.exist;
            expect(userSupportAccountState).to.exist;
            expect(userSupportAccountState.user.equals(supporterKeypair.publicKey)).to.be.true;
            expect(userSupportAccountState.proposal.equals(proposalPda)).to.be.true;
            expect(userSupportAccountState.epochId.eq(currentEpochId)).to.be.true;
            
            // console.log(`  [SupportProposalTests] DEBUG: userSupportAccountState.amount = ${userSupportAccountState.amount.toString()}`);
            // console.log(`  [SupportProposalTests] DEBUG: expectedNetSupportAmount = ${expectedNetSupportAmount.toString()}`);
            expect(userSupportAccountState.amount.eq(expectedNetSupportAmount)).to.be.true;
            console.log(`  [SupportProposalTests] UserProposalSupport account ${shortenAddress(userSupportPda)} verified (amount: ${userSupportAccountState.amount.toString()}, expected net: ${expectedNetSupportAmount.toString()}).`);
        });

        it('should correctly update solRaised on the TokenProposal account with the net amount', async () => {
            const expectedSolRaisedAfterSupport = initialProposalAccountState.solRaised.add(expectedNetSupportAmount);
            // console.log(`  [SupportProposalTests] DEBUG: initialProposalAccountState.solRaised = ${initialProposalAccountState.solRaised.toString()}`);
            // console.log(`  [SupportProposalTests] DEBUG: expectedNetSupportAmount = ${expectedNetSupportAmount.toString()}`);
            // console.log(`  [SupportProposalTests] DEBUG: expectedSolRaisedAfterSupport = ${expectedSolRaisedAfterSupport.toString()}`);
            // console.log(`  [SupportProposalTests] DEBUG: updatedProposalAccountState.solRaised = ${updatedProposalAccountState.solRaised.toString()}`);
            expect(updatedProposalAccountState.solRaised.toString()).to.equal(expectedSolRaisedAfterSupport.toString());
            console.log(`  [SupportProposalTests] TokenProposal.solRaised updated to ${updatedProposalAccountState.solRaised.toString()} (expected: ${expectedSolRaisedAfterSupport.toString()}).`);
        });

        it('should increment totalContributions on the TokenProposal account by one', async () => {
            const expectedTotalContributionsAfterSupport = initialProposalAccountState.totalContributions.add(new anchor.BN(1));
            // console.log(`  [SupportProposalTests] DEBUG: initialProposalAccountState.totalContributions = ${initialProposalAccountState.totalContributions.toString()}`);
            // console.log(`  [SupportProposalTests] DEBUG: expectedTotalContributionsAfterSupport = ${expectedTotalContributionsAfterSupport.toString()}`);
            // console.log(`  [SupportProposalTests] DEBUG: updatedProposalAccountState.totalContributions = ${updatedProposalAccountState.totalContributions.toString()}`);
            expect(updatedProposalAccountState.totalContributions.toString()).to.equal(expectedTotalContributionsAfterSupport.toString());
            console.log(`  [SupportProposalTests] TokenProposal.totalContributions incremented to ${updatedProposalAccountState.totalContributions.toString()} (expected: ${expectedTotalContributionsAfterSupport.toString()}).`);
        });

        it("should decrease the supporter's SOL balance by at least the gross support amount", async () => {
            const difference = initialSupporterBalance - finalSupporterBalance;
            const grossAmountNum = supportAmountGross.toNumber();
            // console.log(`  [SupportProposalTests] Initial Supporter Balance: ${initialSupporterBalance}`);
            // console.log(`  [SupportProposalTests] Final Supporter Balance:   ${finalSupporterBalance}`);
            // console.log(`  [SupportProposalTests] Difference:                ${difference}`);
            // console.log(`  [SupportProposalTests] Gross Support Amount:      ${grossAmountNum}`);
            expect(difference >= grossAmountNum).to.be.true;
            console.log(`  [SupportProposalTests] Supporter balance decreased by ${difference} (gross support: ${grossAmountNum}).`);
        });

        it("should increase the treasury's SOL balance by the fee amount", async () => {
            const expectedTreasuryBalanceAfterSupport = initialTreasuryBalance + expectedFeeAmount.toNumber();
            // console.log(`  [SupportProposalTests] DEBUG: initialTreasuryBalance = ${initialTreasuryBalance}`);
            // console.log(`  [SupportProposalTests] DEBUG: expectedFeeAmount = ${expectedFeeAmount.toNumber()}`);
            // console.log(`  [SupportProposalTests] DEBUG: expectedTreasuryBalanceAfterSupport = ${expectedTreasuryBalanceAfterSupport}`);
            // console.log(`  [SupportProposalTests] DEBUG: finalTreasuryBalance = ${finalTreasuryBalance}`);
            expect(finalTreasuryBalance).to.equal(expectedTreasuryBalanceAfterSupport);
            console.log(`  [SupportProposalTests] Treasury balance increased by ${expectedFeeAmount.toNumber()} to ${finalTreasuryBalance}.`);
        });

        // TODO: Cas d'erreur à ajouter:
        // - Soutenir une proposition non active (statut != Active)
        // - Soutenir une proposition avec un montant de 0 (devrait échouer)
        // - Soutenir une proposition dont l'époque est différente de celle du compte Epoch fourni
        // - Soutenir une proposition si le supporter n'a pas assez de SOL
        // - Soutenir deux fois la même proposition par le même utilisateur (devrait mettre à jour le support existant ou échouer selon la logique)
        // - Soutenir une proposition non existante
        // - Soutenir avec un compte Epoch non existant ou non actif
    });
} 