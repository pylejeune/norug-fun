import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import { expect } from 'chai';
import { Programs } from '../../../target/types/programs'; // Garder Programs
import { TestContext, getInitializedContext, generateRandomBN, shortenAddress } from '../../setup';
import { ensureEpochIsActive } from '../../setup/epochSetup';
import {
    createProposalOnChain,
    TokenProposalDetails,
} from '../../setup/proposalSetup';

export function runCreateTokenProposalTests() {
    describe('Instruction: create_token_proposal', () => {
        let ctx: TestContext;
        let program: Program<Programs>;
        let proposerKeypair: Keypair;
        let currentEpochId: anchor.BN;
        let activeEpochPda: PublicKey;

        before(async () => {
            ctx = getInitializedContext();
            program = ctx.program;
            proposerKeypair = Keypair.generate();

            const airdropSig = await ctx.provider.connection.requestAirdrop(proposerKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
            await ctx.provider.connection.confirmTransaction(airdropSig, "confirmed");
            
            console.log(`  [CreateProposalTests] Proposer for tests: ${shortenAddress(proposerKeypair.publicKey)}`);
        });

        beforeEach(async () => {
            currentEpochId = generateRandomBN();
            activeEpochPda = await ensureEpochIsActive(ctx, currentEpochId);
            console.log(`  [CreateProposalTests] beforeEach: Epoch ${currentEpochId.toString()} (${shortenAddress(activeEpochPda)}) is active.`);
        });

        it('should create a new token proposal successfully and verify initial state', async () => {
            const proposalDetails: TokenProposalDetails = {
                epochId: currentEpochId,
                name: "Test Token Alpha",
                symbol: "TTA",
                totalSupply: new anchor.BN(1000000),
                creatorAllocationPercentage: 15,
                description: "A great token for testing purposes.",
                imageUrl: "http://example.com/image.png",
                lockupPeriod: new anchor.BN(86400 * 7),
            };

            const proposalPda = await createProposalOnChain(ctx, proposerKeypair, proposalDetails, activeEpochPda);
            expect(proposalPda).to.exist;

            const proposalAccount = await program.account.tokenProposal.fetch(proposalPda);
            
            expect(proposalAccount.creator.equals(proposerKeypair.publicKey)).to.be.true;
            expect(proposalAccount.epochId.eq(proposalDetails.epochId)).to.be.true;
            expect(proposalAccount.tokenName).to.equal(proposalDetails.name);
            expect(proposalAccount.tokenSymbol).to.equal(proposalDetails.symbol);
            expect(proposalAccount.creatorAllocation).to.equal(proposalDetails.creatorAllocationPercentage);
            expect(proposalAccount.description).to.equal(proposalDetails.description);
            expect(proposalAccount.imageUrl).to.equal(proposalDetails.imageUrl);
            expect(proposalAccount.totalSupply.eq(proposalDetails.totalSupply)).to.be.true;
            expect(proposalAccount.lockupPeriod.eq(proposalDetails.lockupPeriod)).to.be.true;

            expect(proposalAccount.solRaised.isZero()).to.be.true;
            expect(proposalAccount.totalContributions.isZero()).to.be.true;
            expect((proposalAccount.status as any)).to.deep.equal({ active: {} });
            expect(proposalAccount.creationTimestamp.gt(new anchor.BN(0))).to.be.true;

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