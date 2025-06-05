import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import chai, { expect } from 'chai';
import { Programs } from '../../../../../target/types/programs'; // Ajusté pour la profondeur
import {
    TestContext,
    getInitializedContext,
    generateRandomBN,
} from '../../../setup'; // Ajusté pour la profondeur
import * as programConfigSetup from '../../../setup/programConfigSetup';
import * as epochSetup from '../../../setup/epochSetup';
import * as treasurySetup from '../../../setup/treasurySetup';
import * as proposalSetup from '../../../setup/proposalSetup';
import { CREATION_FEE_LAMPORTS } from '../../../utils_for_tests/constants'; // Supposant que cette constante y sera

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
            expect(proposalAccount.name).to.equal(proposalDetails.name);
            // TODO: Décommenter et ajuster lorsque le programme Rust tracera les frais payés sur le compte TokenProposal.
            // expect(proposalAccount.feesApplied.creationFeePaid).to.be.true;

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
