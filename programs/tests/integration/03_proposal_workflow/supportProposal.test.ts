import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
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

export function runSupportProposalTests() {
    describe('Instruction: support_proposal', () => {
        let ctx: TestContext;
        let program: Program<Programs>;
        
        let proposerKeypair: Keypair;
        let supporterKeypair: Keypair;

        let currentEpochId: anchor.BN;
        let activeEpochPda: PublicKey; // PDA de EpochManagement pour l'époque active
        let proposalPda: PublicKey;    // PDA de la TokenProposal créée

        const supportAmount = new anchor.BN(1 * LAMPORTS_PER_SOL); // Exemple: 1 SOL de support

        before(async () => {
            ctx = getInitializedContext();
            program = ctx.program;

            // Setup Proposer
            proposerKeypair = Keypair.generate();
            let airdropSignatureProposer = await ctx.provider.connection.requestAirdrop(proposerKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
            await ctx.provider.connection.confirmTransaction(airdropSignatureProposer, "confirmed");
            console.log(`  [SupportProposalTests] Proposer for tests: ${shortenAddress(proposerKeypair.publicKey)}`);

            // Setup Supporter
            supporterKeypair = Keypair.generate();
            let airdropSignatureSupporter = await ctx.provider.connection.requestAirdrop(supporterKeypair.publicKey, 3 * LAMPORTS_PER_SOL); // Un peu plus pour le supporter
            await ctx.provider.connection.confirmTransaction(airdropSignatureSupporter, "confirmed");
            console.log(`  [SupportProposalTests] Supporter for tests: ${shortenAddress(supporterKeypair.publicKey)}`);

            // Setup Epoch & Proposal (une seule fois pour tous les tests de ce describe)
            currentEpochId = generateRandomBN();
            activeEpochPda = await ensureEpochIsActive(ctx, currentEpochId);
            console.log(`  [SupportProposalTests] Active Epoch for tests: ${currentEpochId.toString()} (${shortenAddress(activeEpochPda)})`);

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
            console.log(`  [SupportProposalTests] Proposal to be supported: ${shortenAddress(proposalPda)}`);
        });

        it('should allow a user to successfully support an active proposal', async () => {
            const initialProposalAccount = await program.account.tokenProposal.fetch(proposalPda);
            const initialSupporterBalance = await ctx.provider.connection.getBalance(supporterKeypair.publicKey);
            const initialTreasuryBalance = await ctx.provider.connection.getBalance(ctx.treasuryAddress!);

            const userSupportPda = await supportProposalOnChain(
                ctx,
                supporterKeypair,
                proposalPda,
                currentEpochId, // epochId de la proposition, requis pour le PDA de UserProposalSupport
                activeEpochPda, // epochManagementAddress pour l'époque de la proposition
                supportAmount
            );
            expect(userSupportPda).to.exist;

            // 1. Vérifier le compte UserProposalSupport
            const userSupportAccount = await program.account.userProposalSupport.fetch(userSupportPda);
            expect(userSupportAccount.user.equals(supporterKeypair.publicKey)).to.be.true;
            expect(userSupportAccount.proposal.equals(proposalPda)).to.be.true;
            expect(userSupportAccount.epochId.eq(currentEpochId)).to.be.true;
            expect(userSupportAccount.amount.eq(supportAmount)).to.be.true;
            console.log(`  [SupportProposalTests] UserProposalSupport account ${shortenAddress(userSupportPda)} verified.`);

            // 2. Vérifier la mise à jour du compte TokenProposal
            const updatedProposalAccount = await program.account.tokenProposal.fetch(proposalPda);
            const expectedSolRaised = initialProposalAccount.solRaised.add(supportAmount);
            const expectedTotalContributions = initialProposalAccount.totalContributions.add(supportAmount);
            expect(updatedProposalAccount.solRaised.eq(expectedSolRaised)).to.be.true;
            expect(updatedProposalAccount.totalContributions.eq(expectedTotalContributions)).to.be.true;
            console.log(`  [SupportProposalTests] TokenProposal account ${shortenAddress(proposalPda)} updated state verified.`);

            // 3. Vérifier le solde du supporter
            // Il faut prendre en compte les frais de transaction.
            // Pour une estimation simple, on vérifie que le solde a diminué d'AU MOINS le supportAmount.
            // Une vérification plus précise nécessiterait de calculer les frais exacts.
            const finalSupporterBalance = await ctx.provider.connection.getBalance(supporterKeypair.publicKey);
            expect(finalSupporterBalance <= initialSupporterBalance - supportAmount.toNumber()).to.be.true;
            console.log(`  [SupportProposalTests] Supporter balance change verified (approximately).`);

            // 4. Vérifier le solde de la trésorerie
            const finalTreasuryBalance = await ctx.provider.connection.getBalance(ctx.treasuryAddress!);
            expect(finalTreasuryBalance).to.equal(initialTreasuryBalance + supportAmount.toNumber());
            console.log(`  [SupportProposalTests] Treasury balance increase verified.`);
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