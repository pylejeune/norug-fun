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
    SUPPORT_FEE_PERCENTAGE_DENOMINATOR 
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
