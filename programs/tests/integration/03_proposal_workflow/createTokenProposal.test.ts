import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import { expect } from 'chai';
import { Programs, EpochStatus } from '../../../target/types/programs'; // Ajustez le chemin si nécessaire
import { TestContext, getInitializedContext, generateRandomBN } from '../../setup'; // Assumant que TestContext et getInitializedContext sont là
import { ensureEpochIsActive } from '../../setup/epochSetup';
import {
    createProposalOnChain,
    getProposalPda,
    TokenProposalDetails,
} from '../../setup/proposalSetup';
import { shortenAddress } from '../../utils_for_tests/helpers';

export function runCreateTokenProposalTests() {
    describe('Instruction: create_token_proposal', () => {
        let ctx: TestContext;
        let program: Program<Programs>;
        let proposerKeypair: Keypair;
        let currentEpochId: anchor.BN;

        before(async () => {
            ctx = getInitializedContext();
            program = ctx.program;
            proposerKeypair = Keypair.generate(); // Un nouveau proposeur pour ces tests

            // Airdrop au proposeur
            const airdropSig = await ctx.provider.connection.requestAirdrop(proposerKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
            await ctx.provider.connection.confirmTransaction(airdropSig, "confirmed");
            
            console.log(`  [CreateProposalTests] Proposer for tests: ${shortenAddress(proposerKeypair.publicKey)}`);
        });

        beforeEach(async () => {
            // S'assurer qu'une époque est active avant chaque test de création de proposition
            currentEpochId = generateRandomBN(); // Générer un ID d'époque unique pour chaque test
            const epochPda = await ensureEpochIsActive(ctx, currentEpochId);
            ctx.epochManagementAddress = epochPda; // Mettre à jour le contexte avec l'adresse de l'époque active
            console.log(`  [CreateProposalTests] beforeEach: Epoch ${currentEpochId.toString()} (${shortenAddress(epochPda)}) is active.`);
        });

        it('should create a new token proposal successfully and verify initial state', async () => {
            const proposalDetails: TokenProposalDetails = {
                epochId: currentEpochId,
                name: "Test Token Alpha",
                symbol: "TTA",
                totalSupply: new anchor.BN(1000000),
                creatorAllocationPercentage: 15, // 15%
                description: "A great token for testing purposes.",
                imageUrl: "http://example.com/image.png",
                lockupPeriod: new anchor.BN(86400 * 7), // 7 jours
            };

            const proposalPda = await createProposalOnChain(ctx, proposerKeypair, proposalDetails);
            expect(proposalPda).to.exist;

            const proposalAccount = await program.account.proposal.fetch(proposalPda);
            
            expect(proposalAccount.proposer.equals(proposerKeypair.publicKey)).to.be.true;
            expect(proposalAccount.epochId.eq(proposalDetails.epochId)).to.be.true;
            expect(proposalAccount.name).to.equal(proposalDetails.name);
            expect(proposalAccount.symbol).to.equal(proposalDetails.symbol);
            expect(proposalAccount.totalSupply.eq(proposalDetails.totalSupply)).to.be.true;
            expect(proposalAccount.creatorAllocationPercentage).to.equal(proposalDetails.creatorAllocationPercentage);
            expect(proposalAccount.description).to.equal(proposalDetails.description);
            expect(proposalAccount.imageUrl).to.equal(proposalDetails.imageUrl);
            expect(proposalAccount.lockupPeriod.eq(proposalDetails.lockupPeriod)).to.be.true;
            expect(proposalAccount.totalSupportScore.isZero()).to.be.true;
            expect(proposalAccount.totalReclaimedScore.isZero()).to.be.true;
            expect(proposalAccount.status).to.deep.equal({ pending: {} }); // Statut initial
            expect(proposalAccount.creationTimestamp.gt(new anchor.BN(0))).to.be.true;
            // proposalAccount.result est Option<ProposalResult>, donc null ou { validated: {}, rejected: {}} initialement
            expect(proposalAccount.result).to.be.null; 

            console.log(`  [CreateProposalTests] Proposal "${proposalDetails.name}" created and initial state verified.`);
        });

        // TODO: Ajouter des tests pour les cas d'erreur:
        // - Époque non active / inexistante
        // - Frais de création (si ProgramConfig les définit et que le proposeur n'a pas assez de SOL - nécessite de simuler cela)
        // - Dépassement de la taille max pour les strings (name, symbol, description, imageUrl)
        // - Valeurs invalides (ex: creatorAllocationPercentage > 100)
        // - Tentative de création d'une proposition avec le même nom par le même proposeur dans la même époque (devrait échouer à cause du PDA)
    });
} 