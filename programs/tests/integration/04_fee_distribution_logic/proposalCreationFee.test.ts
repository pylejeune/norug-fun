import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import chai, { expect } from 'chai';
import { Programs } from '../../../target/types/programs'; // Corrigé
import {
    TestContext,
    getInitializedContext,
    generateRandomBN,
} from '../../setup'; // Corrigé
import * as programConfigSetup from '../../setup/programConfigSetup'; // Corrigé
import * as epochSetup from '../../setup/epochSetup'; // Corrigé
import * as treasurySetup from '../../setup/treasurySetup'; // Corrigé
import * as proposalSetup from '../../setup/proposalSetup'; // Corrigé
import { CREATION_FEE_LAMPORTS } from '../../utils_for_tests/constants'; // Corrigé

export function runProposalCreationFeeTests() {
    describe('Instruction: create_proposal (Fee Logic)', () => {
        let ctx: TestContext;
        let program: Program<Programs>;
        let adminKeypair: Keypair;
        let proposerKeypair: Keypair;
        let activeEpochPda: PublicKey;
        let epochId: anchor.BN;

        before(async () => {
            ctx = getInitializedContext();
            program = ctx.program;
            adminKeypair = ctx.adminKeypair;

            // Initialisations globales requises
            await programConfigSetup.ensureProgramConfigInitialized(ctx);
            await treasurySetup.ensureTreasuryInitialized(ctx);
            // Les rôles de trésorerie ne sont pas directement testés ici mais peuvent être une dépendance pour d'autres opérations
            await treasurySetup.ensureTreasuryRolesInitialized(ctx, [adminKeypair.publicKey]);
        });

        beforeEach(async () => {
            // Setup un état frais pour chaque test 'it'
            proposerKeypair = Keypair.generate();
            const airdropSignature = await program.provider.connection.requestAirdrop(
                proposerKeypair.publicKey,
                2 * LAMPORTS_PER_SOL // Assez pour la création et les frais de tx
            );
            await program.provider.connection.confirmTransaction(airdropSignature, "confirmed");

            epochId = generateRandomBN();
            activeEpochPda = await epochSetup.ensureEpochIsActive(ctx, epochId, adminKeypair);
        });

        it('should correctly deduct creation fee from proposer and transfer to treasury', async () => {
            const proposerBalanceBefore = await program.provider.connection.getBalance(proposerKeypair.publicKey);
            const treasuryBalanceBefore = await program.provider.connection.getBalance(ctx.treasuryAddress!);

            // Récupérer les soldes initiaux des sous-comptes de la trésorerie
            const treasuryAccountInitial = await program.account.treasury.fetch(ctx.treasuryAddress!);
            const initialMarketingBalance = treasuryAccountInitial.marketing.solBalance;
            const initialTeamBalance = treasuryAccountInitial.team.solBalance;
            const initialOperationsBalance = treasuryAccountInitial.operations.solBalance;
            const initialInvestmentsBalance = treasuryAccountInitial.investments.solBalance;
            const initialCrankBalance = treasuryAccountInitial.crank.solBalance;

            const proposalDetails: proposalSetup.TokenProposalDetails = {
                epochId: epochId,
                name: "Fee Test Token",
                symbol: "FEET",
                totalSupply: new anchor.BN(1000000),
                creatorAllocationPercentage: 10,
                description: "A token to test creation fee logic.",
                imageUrl: null,
                lockupPeriod: new anchor.BN(0),
            };

            const proposalPda = await proposalSetup.createProposalOnChain(
                ctx,
                proposerKeypair,
                proposalDetails,
                activeEpochPda
            );
            
            const proposalAccountRent = await program.provider.connection.getMinimumBalanceForRentExemption(
                program.account.tokenProposal.size // Taille du compte TokenProposal
            );
            const proposerBalanceAfter = await program.provider.connection.getBalance(proposerKeypair.publicKey);
            const treasuryBalanceAfter = await program.provider.connection.getBalance(ctx.treasuryAddress!);
            const transactionFee = proposerBalanceBefore - proposerBalanceAfter - CREATION_FEE_LAMPORTS.toNumber() - proposalAccountRent;

            // Vérifications
            // 1. Le solde du proposeur a diminué des frais de création + rent du compte + frais de transaction
            expect(proposerBalanceAfter).to.be.closeTo(
                proposerBalanceBefore - CREATION_FEE_LAMPORTS.toNumber() - proposalAccountRent - transactionFee,
                LAMPORTS_PER_SOL * 0.001 // Tolérance pour fluctuation frais de tx mineure
            );

            // 2. Le solde de la trésorerie a augmenté des frais de création
            expect(treasuryBalanceAfter).to.equal(treasuryBalanceBefore + CREATION_FEE_LAMPORTS.toNumber());

            // 3. La proposition a été créée (vérification basique)
            const proposalAccount = await program.account.tokenProposal.fetch(proposalPda);
            expect(proposalAccount.tokenName).to.equal(proposalDetails.name);
            // TODO: Décommenter et ajuster lorsque le programme Rust tracera les frais payés sur le compte TokenProposal.
            // expect(proposalAccount.feesApplied.creationFeePaid).to.be.true;

            // 4. Vérifier la distribution des frais de création aux sous-comptes de la trésorerie
            const treasuryAccountAfter = await program.account.treasury.fetch(ctx.treasuryAddress!);

            console.log(`      Sous-comptes Trésorerie (Creation Fee: ${CREATION_FEE_LAMPORTS.toString()}):`);
            console.log(`        Marketing:`);
            console.log(`          - Avant:      ${initialMarketingBalance.toString()}`);
            console.log(`          - Attendu:    ${initialMarketingBalance.toString()} (pas de changement)`);
            console.log(`          - Après:      ${treasuryAccountAfter.marketing.solBalance.toString()}`);
            console.log(`        Team:`);
            console.log(`          - Avant:      ${initialTeamBalance.toString()}`);
            console.log(`          - Attendu:    ${initialTeamBalance.toString()} (pas de changement)`);
            console.log(`          - Après:      ${treasuryAccountAfter.team.solBalance.toString()}`);
            console.log(`        Opérations:`);
            console.log(`          - Avant:      ${initialOperationsBalance.toString()}`);
            console.log(`          - Attendu après: ${initialOperationsBalance.add(CREATION_FEE_LAMPORTS).toString()} (+${CREATION_FEE_LAMPORTS.toString()})`);
            console.log(`          - Après:      ${treasuryAccountAfter.operations.solBalance.toString()}`);
            console.log(`        Investissements:`);
            console.log(`          - Avant:      ${initialInvestmentsBalance.toString()}`);
            console.log(`          - Attendu:    ${initialInvestmentsBalance.toString()} (pas de changement)`);
            console.log(`          - Après:      ${treasuryAccountAfter.investments.solBalance.toString()}`);
            console.log(`        Crank:`);
            console.log(`          - Avant:      ${initialCrankBalance.toString()}`);
            console.log(`          - Attendu:    ${initialCrankBalance.toString()} (pas de changement)`);
            console.log(`          - Après:      ${treasuryAccountAfter.crank.solBalance.toString()}`);

            expect(treasuryAccountAfter.operations.solBalance.toString()).to.equal(
                initialOperationsBalance.add(CREATION_FEE_LAMPORTS).toString(),
                "Operations balance should increase by creation fee"
            );
            expect(treasuryAccountAfter.marketing.solBalance.toString()).to.equal(
                initialMarketingBalance.toString(),
                "Marketing balance should not change for creation fee"
            );
            expect(treasuryAccountAfter.team.solBalance.toString()).to.equal(
                initialTeamBalance.toString(),
                "Team balance should not change for creation fee"
            );
            expect(treasuryAccountAfter.investments.solBalance.toString()).to.equal(
                initialInvestmentsBalance.toString(),
                "Investments balance should not change for creation fee"
            );
            expect(treasuryAccountAfter.crank.solBalance.toString()).to.equal(
                initialCrankBalance.toString(),
                "Crank balance should not change for creation fee"
            );

            console.log(`      Proposer balance before: ${proposerBalanceBefore}`);
            console.log(`      Proposer balance after:  ${proposerBalanceAfter}`);
            console.log(`      Treasury balance before: ${treasuryBalanceBefore}`);
            console.log(`      Treasury balance after:  ${treasuryBalanceAfter}`);
            console.log(`      Creation fee:          ${CREATION_FEE_LAMPORTS.toString()}`);
            console.log(`      Proposal account rent:   ${proposalAccountRent}`);
            console.log(`      Transaction fee (est.):  ${transactionFee}`);
        });

        // TODO: Ajouter d'autres tests, par exemple :
        // - Échec si le proposeur n'a pas assez de SOL pour les frais + la rent.
        // - (Si applicable) Scénarios avec différents types de frais ou des frais dynamiques.
    });
}
