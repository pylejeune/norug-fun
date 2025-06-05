import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import chai, { expect } from 'chai';
import { Programs } from '../../../target/types/programs';
import {
    TestContext,
    getInitializedContext,
    generateRandomBN,
} from '../../setup';
import * as programConfigSetup from '../../setup/programConfigSetup';
import * as epochSetup from '../../setup/epochSetup';
import * as treasurySetup from '../../setup/treasurySetup';
import * as proposalSetup from '../../setup/proposalSetup';
import { 
    CREATION_FEE_LAMPORTS, 
    SUPPORT_FEE_LAMPORTS, // Peut être gardé pour d'autres contextes, mais pas pour le calcul de frais ici
    SUPPORT_FEE_PERCENTAGE_NUMERATOR,
    SUPPORT_FEE_PERCENTAGE_DENOMINATOR,
    TREASURY_DISTRIBUTION_MARKETING_PERCENT,
    TREASURY_DISTRIBUTION_TEAM_PERCENT,
    TREASURY_DISTRIBUTION_OPERATIONS_PERCENT,
    TREASURY_DISTRIBUTION_INVESTMENTS_PERCENT,
    TREASURY_DISTRIBUTION_CRANK_PERCENT
} from '../../utils_for_tests/constants';

export function runProposalSupportFeeTests() {
    describe('Instruction: support_proposal (Fee Logic)', () => {
        let ctx: TestContext;
        let program: Program<Programs>;
        let adminKeypair: Keypair;
        let proposerKeypair: Keypair;
        let supporterKeypair: Keypair;
        let activeEpochPda: PublicKey;
        let proposalPda: PublicKey;
        let epochId: anchor.BN;
        const supportAmountLamports = new anchor.BN(0.1 * LAMPORTS_PER_SOL); // 0.1 SOL de support

        before(async () => {
            ctx = getInitializedContext();
            program = ctx.program;
            adminKeypair = ctx.adminKeypair;

            await programConfigSetup.ensureProgramConfigInitialized(ctx);
            await treasurySetup.ensureTreasuryInitialized(ctx);
            await treasurySetup.ensureTreasuryRolesInitialized(ctx, [adminKeypair.publicKey]);
        });

        beforeEach(async () => {
            proposerKeypair = Keypair.generate();
            supporterKeypair = Keypair.generate();
            
            await Promise.all([
                program.provider.connection.requestAirdrop(proposerKeypair.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => 
                    program.provider.connection.confirmTransaction(sig, "confirmed")
                ),
                program.provider.connection.requestAirdrop(supporterKeypair.publicKey, 2 * LAMPORTS_PER_SOL).then(sig => 
                    program.provider.connection.confirmTransaction(sig, "confirmed")
                )
            ]);

            epochId = generateRandomBN();
            activeEpochPda = await epochSetup.ensureEpochIsActive(ctx, epochId, adminKeypair);

            const proposalDetails: proposalSetup.TokenProposalDetails = {
                epochId: epochId,
                name: "Support Fee Test Token",
                symbol: "SFTT",
                totalSupply: new anchor.BN(1000000),
                creatorAllocationPercentage: 10,
                description: "A token to test support fee logic.",
                imageUrl: null,
                lockupPeriod: new anchor.BN(0),
            };
            proposalPda = await proposalSetup.createProposalOnChain(ctx, proposerKeypair, proposalDetails, activeEpochPda);
        });

        it('should correctly deduct support fee from supporter, transfer to treasury, and credit proposal', async () => {
            const supporterBalanceBefore = await program.provider.connection.getBalance(supporterKeypair.publicKey);
            const treasuryBalanceBefore = await program.provider.connection.getBalance(ctx.treasuryAddress!);
            const proposalAccountBefore = await program.account.tokenProposal.fetch(proposalPda);
            const proposalSolRaisedBefore = proposalAccountBefore.solRaised;

            // Récupérer les soldes initiaux des sous-comptes de la trésorerie
            const treasuryAccountInitial = await program.account.treasury.fetch(ctx.treasuryAddress!);
            const initialMarketingBalance = treasuryAccountInitial.marketing.solBalance;
            const initialTeamBalance = treasuryAccountInitial.team.solBalance;
            const initialOperationsBalance = treasuryAccountInitial.operations.solBalance;
            const initialInvestmentsBalance = treasuryAccountInitial.investments.solBalance;
            const initialCrankBalance = treasuryAccountInitial.crank.solBalance;

            // Calculer les frais de support attendus en fonction du pourcentage
            const expectedSupportFee = supportAmountLamports
                .mul(new anchor.BN(SUPPORT_FEE_PERCENTAGE_NUMERATOR))
                .div(new anchor.BN(SUPPORT_FEE_PERCENTAGE_DENOMINATOR));

            const userSupportPda = await proposalSetup.supportProposalOnChain(
                ctx,
                supporterKeypair,
                proposalPda,
                epochId,
                activeEpochPda,
                supportAmountLamports
            );

            const supporterBalanceAfter = await program.provider.connection.getBalance(supporterKeypair.publicKey);
            const treasuryBalanceAfter = await program.provider.connection.getBalance(ctx.treasuryAddress!);
            const proposalAccountAfter = await program.account.tokenProposal.fetch(proposalPda);
            const proposalSolRaisedAfter = proposalAccountAfter.solRaised;
            
            const userSupportAccountRent = await program.provider.connection.getMinimumBalanceForRentExemption(
                program.account.userProposalSupport.size 
            );
            
            const actualTransactionFee = supporterBalanceBefore - supporterBalanceAfter - supportAmountLamports.toNumber() - expectedSupportFee.toNumber() - userSupportAccountRent;

            // 1. Le solde du supporter a diminué du montant du support + frais de support calculés + rent + frais de tx
            expect(supporterBalanceAfter).to.be.closeTo(
                supporterBalanceBefore - supportAmountLamports.toNumber() - expectedSupportFee.toNumber() - userSupportAccountRent - actualTransactionFee,
                LAMPORTS_PER_SOL * 0.001 // Tolérance
            );

            // 2. Le solde de la trésorerie a augmenté des frais de support calculés
            expect(treasuryBalanceAfter).to.equal(treasuryBalanceBefore + expectedSupportFee.toNumber());

            // 3. Les SOL levés par la proposition ont augmenté du montant du support (net des frais)
            expect(proposalSolRaisedAfter.toNumber()).to.equal(
                proposalSolRaisedBefore.toNumber() + supportAmountLamports.toNumber() - expectedSupportFee.toNumber()
            );

            // 4. Le support a été enregistré
            const supportAccount = await program.account.userProposalSupport.fetch(userSupportPda);
            const expectedNetAmount = supportAmountLamports.sub(expectedSupportFee);
            expect(supportAccount.amount.eq(expectedNetAmount)).to.be.true;
            // TODO: Ajouter une vérification si un champ `feePaid` est ajouté à `UserProposalSupport`

            // 5. Vérifier la distribution des frais aux sous-comptes de la trésorerie
            const treasuryAccountAfter = await program.account.treasury.fetch(ctx.treasuryAddress!);

            const expectedMarketingShare = expectedSupportFee
                .mul(new anchor.BN(TREASURY_DISTRIBUTION_MARKETING_PERCENT))
                .div(new anchor.BN(100));
            const expectedTeamShare = expectedSupportFee
                .mul(new anchor.BN(TREASURY_DISTRIBUTION_TEAM_PERCENT))
                .div(new anchor.BN(100));
            const expectedOperationsShare = expectedSupportFee
                .mul(new anchor.BN(TREASURY_DISTRIBUTION_OPERATIONS_PERCENT))
                .div(new anchor.BN(100));
            const expectedInvestmentsShare = expectedSupportFee
                .mul(new anchor.BN(TREASURY_DISTRIBUTION_INVESTMENTS_PERCENT))
                .div(new anchor.BN(100));
            
            let expectedCrankShare = new anchor.BN(expectedSupportFee);
            expectedCrankShare = expectedCrankShare.sub(expectedMarketingShare);
            expectedCrankShare = expectedCrankShare.sub(expectedTeamShare);
            expectedCrankShare = expectedCrankShare.sub(expectedOperationsShare);
            expectedCrankShare = expectedCrankShare.sub(expectedInvestmentsShare);

            console.log(`      Sous-comptes Trésorerie (Support Fee: ${expectedSupportFee.toString()}):`);
            console.log(`        Marketing:`);
            console.log(`          - Avant:      ${initialMarketingBalance.toString()}`);
            console.log(`          - Part attendue: ${expectedMarketingShare.toString()}`);
            console.log(`          - Après:      ${treasuryAccountAfter.marketing.solBalance.toString()}`);
            console.log(`          - Augmentation: ${treasuryAccountAfter.marketing.solBalance.sub(initialMarketingBalance).toString()}`);
            console.log(`        Team:`);
            console.log(`          - Avant:      ${initialTeamBalance.toString()}`);
            console.log(`          - Part attendue: ${expectedTeamShare.toString()}`);
            console.log(`          - Après:      ${treasuryAccountAfter.team.solBalance.toString()}`);
            console.log(`          - Augmentation: ${treasuryAccountAfter.team.solBalance.sub(initialTeamBalance).toString()}`);
            console.log(`        Opérations:`);
            console.log(`          - Avant:      ${initialOperationsBalance.toString()}`);
            console.log(`          - Part attendue: ${expectedOperationsShare.toString()}`);
            console.log(`          - Après:      ${treasuryAccountAfter.operations.solBalance.toString()}`);
            console.log(`          - Augmentation: ${treasuryAccountAfter.operations.solBalance.sub(initialOperationsBalance).toString()}`);
            console.log(`        Investissements:`);
            console.log(`          - Avant:      ${initialInvestmentsBalance.toString()}`);
            console.log(`          - Part attendue: ${expectedInvestmentsShare.toString()}`);
            console.log(`          - Après:      ${treasuryAccountAfter.investments.solBalance.toString()}`);
            console.log(`          - Augmentation: ${treasuryAccountAfter.investments.solBalance.sub(initialInvestmentsBalance).toString()}`);
            console.log(`        Crank:`);
            console.log(`          - Avant:      ${initialCrankBalance.toString()}`);
            console.log(`          - Part attendue: ${expectedCrankShare.toString()}`);
            console.log(`          - Après:      ${treasuryAccountAfter.crank.solBalance.toString()}`);
            console.log(`          - Augmentation: ${treasuryAccountAfter.crank.solBalance.sub(initialCrankBalance).toString()}`);

            expect(treasuryAccountAfter.marketing.solBalance.toString()).to.equal(
                initialMarketingBalance.add(expectedMarketingShare).toString(),
                "Marketing balance incorrect"
            );
            expect(treasuryAccountAfter.team.solBalance.toString()).to.equal(
                initialTeamBalance.add(expectedTeamShare).toString(),
                "Team balance incorrect"
            );
            expect(treasuryAccountAfter.operations.solBalance.toString()).to.equal(
                initialOperationsBalance.add(expectedOperationsShare).toString(),
                "Operations balance incorrect"
            );
            expect(treasuryAccountAfter.investments.solBalance.toString()).to.equal(
                initialInvestmentsBalance.add(expectedInvestmentsShare).toString(),
                "Investments balance incorrect"
            );
            expect(treasuryAccountAfter.crank.solBalance.toString()).to.equal(
                initialCrankBalance.add(expectedCrankShare).toString(),
                "Crank balance incorrect"
            );

            console.log(`      Supporter balance before: ${supporterBalanceBefore}`);
            console.log(`      Supporter balance after:  ${supporterBalanceAfter}`);
            console.log(`      Treasury balance before: ${treasuryBalanceBefore}`);
            console.log(`      Treasury balance after:  ${treasuryBalanceAfter}`);
            console.log(`      Proposal SOL raised before: ${proposalSolRaisedBefore.toString()}`);
            console.log(`      Proposal SOL raised after:  ${proposalSolRaisedAfter.toString()}`);
            console.log(`      Support amount:        ${supportAmountLamports.toString()}`);
            console.log(`      Support fee (calc %):  ${expectedSupportFee.toString()}`);
            console.log(`      UserSupport rent:      ${userSupportAccountRent}`);
            console.log(`      Transaction fee (est.):${actualTransactionFee}`);
        });

        // TODO: Ajouter d'autres tests (ex: échec si pas assez de SOL pour frais + support, etc.)
    });
}
