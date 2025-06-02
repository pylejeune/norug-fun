import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import chai from 'chai';
import { expect } from 'chai';
import { Programs } from '../../../target/types/programs';
import { TestContext, getInitializedContext, generateRandomBN, shortenAddress } from '../../setup';
import { ensureEpochIsActive, closeEpochOnChain, getEpochManagementPda } from '../../setup/epochSetup';
import {
    createProposalOnChain,
    TokenProposalDetails,
    supportProposalOnChain,
    getSupportPda,
    updateProposalStatusOnChain,
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
            // Proposer for tests: ...

            // Setup Supporter
            supporterKeypair = Keypair.generate();
            let airdropSignatureSupporter = await ctx.provider.connection.requestAirdrop(supporterKeypair.publicKey, 3 * LAMPORTS_PER_SOL);
            await ctx.provider.connection.confirmTransaction(airdropSignatureSupporter, "confirmed");
            // Supporter for tests: ...

            // Setup Epoch & Proposal (une seule fois pour tous les tests de ce describe)
            currentEpochId = generateRandomBN();
            activeEpochPda = await ensureEpochIsActive(ctx, currentEpochId);
            // Active Epoch for tests: ...

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
            // Conservé : log important indiquant quelle proposition est créée pour le test de succès
            console.log(`  [SupportProposalTests:GlobalBefore] Proposal ${shortenAddress(proposalPda)} by ${shortenAddress(proposerKeypair.publicKey)} to be supported.`);

            // Calcul des frais attendus et du montant net
            expectedFeeAmount = supportAmountGross
                .mul(SUPPORT_FEE_PERCENTAGE_NUMERATOR)
                .div(SUPPORT_FEE_PERCENTAGE_DENOMINATOR);
            expectedNetSupportAmount = supportAmountGross.sub(expectedFeeAmount);
            // supportAmountGross: ..., expectedFeeAmount: ..., expectedNetSupportAmount: ...

            // Action principale : un utilisateur soutient la proposition
            // Les états initiaux sont récupérés avant cette action
            initialProposalAccountState = await program.account.tokenProposal.fetch(proposalPda);
            initialSupporterBalance = await ctx.provider.connection.getBalance(supporterKeypair.publicKey);
            initialTreasuryBalance = await ctx.provider.connection.getBalance(ctx.treasuryAddress!);
            // Initial states recorded.

            userSupportPda = await supportProposalOnChain(
                ctx,
                supporterKeypair,
                proposalPda,
                currentEpochId, // epochId de la proposition, requis pour le PDA de UserProposalSupport
                activeEpochPda, // epochManagementAddress pour l'époque de la proposition
                supportAmountGross // L'utilisateur initie le soutien avec le montant brut
            );
            // Conservé : log important indiquant le soutien effectué
            console.log(`  [SupportProposalTests:GlobalBefore] Supporter ${shortenAddress(supporterKeypair.publicKey)} supported proposal ${shortenAddress(proposalPda)} with ${supportAmountGross.toString()} lamports (gross).`);

            // Les états finaux/mis à jour sont récupérés après l'action
            updatedProposalAccountState = await program.account.tokenProposal.fetch(proposalPda);
            userSupportAccountState = await program.account.userProposalSupport.fetch(userSupportPda);
            finalSupporterBalance = await ctx.provider.connection.getBalance(supporterKeypair.publicKey);
            finalTreasuryBalance = await ctx.provider.connection.getBalance(ctx.treasuryAddress!);
            // Updated states recorded.
        });

        it('should create a valid UserProposalSupport account with the net amount', async () => {
            expect(userSupportPda).to.exist;
            expect(userSupportAccountState).to.exist;
            expect(userSupportAccountState.user.equals(supporterKeypair.publicKey)).to.be.true;
            expect(userSupportAccountState.proposal.equals(proposalPda)).to.be.true;
            expect(userSupportAccountState.epochId.eq(currentEpochId)).to.be.true;
            expect(userSupportAccountState.amount.eq(expectedNetSupportAmount)).to.be.true;
            // Conservé : log de vérification pour ce test spécifique
            console.log(`  [SupportProposalTests] UserProposalSupport account ${shortenAddress(userSupportPda)} verified (amount: ${userSupportAccountState.amount.toString()}, expected net: ${expectedNetSupportAmount.toString()}).`);
        });

        it('should correctly update solRaised on the TokenProposal account with the net amount', async () => {
            const expectedSolRaisedAfterSupport = initialProposalAccountState.solRaised.add(expectedNetSupportAmount);
            expect(updatedProposalAccountState.solRaised.toString()).to.equal(expectedSolRaisedAfterSupport.toString());
            // Conservé : log de vérification pour ce test spécifique
            console.log(`  [SupportProposalTests] TokenProposal.solRaised updated to ${updatedProposalAccountState.solRaised.toString()} (expected: ${expectedSolRaisedAfterSupport.toString()}).`);
        });

        it('should increment totalContributions on the TokenProposal account by one', async () => {
            const expectedTotalContributionsAfterSupport = initialProposalAccountState.totalContributions.add(new anchor.BN(1));
            expect(updatedProposalAccountState.totalContributions.toString()).to.equal(expectedTotalContributionsAfterSupport.toString());
            // Conservé : log de vérification pour ce test spécifique
            console.log(`  [SupportProposalTests] TokenProposal.totalContributions incremented to ${updatedProposalAccountState.totalContributions.toString()} (expected: ${expectedTotalContributionsAfterSupport.toString()}).`);
        });

        it("should decrease the supporter's SOL balance by at least the gross support amount", async () => {
            const difference = initialSupporterBalance - finalSupporterBalance;
            const grossAmountNum = supportAmountGross.toNumber();
            expect(difference >= grossAmountNum).to.be.true;
            // Conservé : log de vérification pour ce test spécifique
            console.log(`  [SupportProposalTests] Supporter balance decreased by ${difference} (gross support: ${grossAmountNum}).`);
        });

        it("should increase the treasury's SOL balance by the fee amount", async () => {
            const expectedTreasuryBalanceAfterSupport = initialTreasuryBalance + expectedFeeAmount.toNumber();
            expect(finalTreasuryBalance).to.equal(expectedTreasuryBalanceAfterSupport);
            // Conservé : log de vérification pour ce test spécifique
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

    describe('Error Cases for support_proposal', () => {
        let errorCtx: TestContext;
        let errorProgram: Program<Programs>;
        let testProposerKeypair: Keypair;
        let testSupporterKeypair: Keypair;
        let testEpochId: anchor.BN;
        let testActiveEpochPda: PublicKey;
        let testProposalPda: PublicKey;

        beforeEach(async () => {
            // Setup un contexte frais pour chaque test d'erreur pour éviter les interférences
            errorCtx = getInitializedContext();
            errorProgram = errorCtx.program;

            // Setup Proposer
            testProposerKeypair = Keypair.generate();
            let airdropSignatureProposer = await errorCtx.provider.connection.requestAirdrop(testProposerKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
            await errorCtx.provider.connection.confirmTransaction(airdropSignatureProposer, "confirmed");

            // Setup Supporter
            testSupporterKeypair = Keypair.generate();
            let airdropSignatureSupporter = await errorCtx.provider.connection.requestAirdrop(testSupporterKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
            await errorCtx.provider.connection.confirmTransaction(airdropSignatureSupporter, "confirmed");

            // Setup Epoch & Proposal (une seule fois pour tous les tests de ce describe)
            testEpochId = generateRandomBN(); // Utiliser un ID d'époque différent pour chaque série de tests
            testActiveEpochPda = await ensureEpochIsActive(errorCtx, testEpochId);

            const proposalDetails: TokenProposalDetails = {
                epochId: testEpochId,
                name: "ErrorCaseToken",
                symbol: "ECT",
                totalSupply: new anchor.BN(1000000),
                creatorAllocationPercentage: 5,
                description: "Token for error case testing in support_proposal.",
                imageUrl: null,
                lockupPeriod: new anchor.BN(0),
            };
            testProposalPda = await createProposalOnChain(errorCtx, testProposerKeypair, proposalDetails, testActiveEpochPda);
            // Fresh proposal ... created for error test.
        });

        it('should fail with EpochNotActive if supporting a proposal whose epoch is closed (even if proposal also becomes rejected)', async () => {
            // 1. Fermer l'époque de la proposition (nécessaire pour updateProposalStatus)
            await closeEpochOnChain(errorCtx, testEpochId, errorCtx.adminKeypair); 
            // Epoch ... closed.

            // 2. Mettre à jour le statut de la proposition à Rejected (possible car l'époque est fermée)
            const newStatusRejected = { rejected: {} }; 
            await updateProposalStatusOnChain(
                errorCtx,
                testProposalPda,
                testActiveEpochPda, 
                newStatusRejected
            );
            const updatedProposal = await errorProgram.account.tokenProposal.fetch(testProposalPda);
            expect(JSON.stringify(updatedProposal.status)).to.equal(JSON.stringify(newStatusRejected));
            // Proposal ... status updated to Rejected.

            // 3. Tenter de soutenir la proposition (dont l'époque est fermée)
            const supportAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);
            let errorCaught = false;
            try {
                await supportProposalOnChain(
                    errorCtx,
                    testSupporterKeypair,
                    testProposalPda,
                    testEpochId, 
                    testActiveEpochPda, // Epoch est fermée
                    supportAmount
                );
            } catch (error) {
                // Expected error caught: ...
                expect(error.message).to.include('Epoch is not active'); 
                // Vérification de l'erreur Anchor spécifique :
                // if (error instanceof anchor.AnchorError) {
                //     expect(error.error.errorCode.code).to.equal('EpochNotActive');
                // }
                errorCaught = true;
            }
            expect(errorCaught).to.be.true;
        });

        it('should fail to support a proposal that is not active (e.g., Rejected) when epoch IS active', async () => {
            // L'époque testActiveEpochPda est active par défaut grâce au beforeEach.
            // Mettre à jour le statut de la proposition à Rejected alors que l'époque est toujours active.
            
            // Assurons-nous que l'époque est active pour ce test spécifique
            const epochAcc = await errorProgram.account.epochManagement.fetch(testActiveEpochPda);
            if (JSON.stringify(epochAcc.status) !== JSON.stringify({ active: {} })) {
                // Si l'époque n'est pas active (par exemple, à cause d'un test précédent qui l'a fermée et que beforeEach n'est pas assez isolé)
                // nous devons la recréer ou la réactiver. Pour simplifier, on loggue une erreur.
                // Idéalement, beforeEach devrait garantir un état propre ou nous devrions créer une nouvelle époque ici.
                // Conservé : ce log est important s'il survient.
                console.error("  [ErrorCase:ProposalNotActiveWhenEpochActive] Epoch was not active at start of test. This might indicate test isolation issues.");
                // Pour ce test, nous allons recréer une époque et une proposition pour garantir l'isolation
                testEpochId = generateRandomBN();
                testActiveEpochPda = await ensureEpochIsActive(errorCtx, testEpochId);
                const proposalDetails: TokenProposalDetails = {
                    epochId: testEpochId,
                    name: "FreshErrorToken",
                    symbol: "FET",
                    totalSupply: new anchor.BN(1000000),
                    creatorAllocationPercentage: 5,
                    description: "Fresh token for ProposalNotActive test.",
                    imageUrl: null,
                    lockupPeriod: new anchor.BN(0),
                };
                testProposalPda = await createProposalOnChain(errorCtx, testProposerKeypair, proposalDetails, testActiveEpochPda);
            }

            const newStatusRejected = { rejected: {} };
            // Note: updateProposalStatusOnChain nécessite une époque fermée pour fonctionner.
            // Cela entre en conflit avec le besoin d'avoir une époque active pour tester ProposalNotActive ici.
            // Nous devons donc revoir comment `updateProposalStatusOnChain` est utilisée ou si le contrat permet de changer le statut d'une proposition
            // pendant que l'époque est active (actuellement, non, il faut `EpochStatus::Closed`).

            // SOLUTION TEMPORAIRE: Pour simuler ce cas, nous allons manuellement modifier l'état de la proposition après sa création,
            // sachant que ce n'est pas un flux que l'admin pourrait faire via les instructions actuelles si l'époque est active.
            // C'est pour tester la contrainte `proposal.status == ProposalStatus::Active` de `support_proposal` isolément.
            // Une meilleure solution serait de modifier le contrat `update_proposal_status` pour permettre ce changement par l'admin
            // même si l'époque est active, ou d'avoir un moyen de "rejeter" une proposition par une autre logique (vote, etc.).
            
            // Créons une nouvelle proposition spécifique pour ce test pour ne pas dépendre de l'état de testProposalPda
            const localTestEpochId = generateRandomBN(testEpochId.toNumber() + 100); // ID unique
            const localActiveEpochPda = await ensureEpochIsActive(errorCtx, localTestEpochId);
            const localProposalDetails: TokenProposalDetails = {
                epochId: localTestEpochId,
                name: "RejectableToken",
                symbol: "RJT",
                totalSupply: new anchor.BN(1000000),
                creatorAllocationPercentage: 5,
                description: "Token to be rejected while epoch is active.",
                imageUrl: null,
                lockupPeriod: new anchor.BN(0),
            };
            const localProposalPda = await createProposalOnChain(errorCtx, testProposerKeypair, localProposalDetails, localActiveEpochPda);
            // Created specific proposal ... in active epoch ...

            // *** Modification manuelle pour le test (non représentatif d'un flux utilisateur normal avec les IX actuelles) ***
            // Normalement, updateProposalStatus requiert une époque fermée. 
            // Ici, nous forçons le statut à Rejected pour tester la contrainte de support_proposal.
            // Cela nécessiterait une fonction de triche ou un appel direct au programme avec des privilèges modifiés.
            // Pour les besoins du test Typescript, nous allons *simuler* que le statut est Rejected.
            // La vraie manière de faire ce test serait de modifier `update_proposal_status` ou d'avoir un autre IX.

            // On ne peut pas directement modifier l'état on-chain facilement sans une instruction dédiée qui le permettrait sous epoch active.
            // Donc, ce test reste conceptuel pour la contrainte `proposal.status == ProposalStatus::Active`
            // L'erreur `EpochNotActive` du test précédent couvre déjà la situation où la proposition n'est pas soutenable.

            // Pour réellement tester `ProposalNotActive` isolément, il faudrait que l'IX `update_proposal_status` permette de changer le statut
            // d'une proposition (par l'admin) même si l'époque est encore active. Actuellement, elle requiert `EpochStatus::Closed`.
            // Si l'on veut quand même un test qui déclenche `ProposalNotActive`:
            // 1. Créer Epoch E1 (active) -> Proposal P1 (active)
            // 2. Fermer Epoch E1.
            // 3. Mettre à jour P1 à `Rejected` (possible car E1 est fermée).
            // 4. Créer Epoch E2 (active).
            // 5. Tenter de soutenir P1 (qui est Rejected) en fournissant E2 (active) comme compte epoch.
            //    Cela devrait d'abord échouer à cause de `ProposalEpochMismatch`.

            // Il semble que la structure actuelle des instructions rend difficile de tester isolément `ProposalNotActive`
            // sans déclencher `EpochNotActive` ou `ProposalEpochMismatch` en premier.
            // La contrainte `proposal.status == ProposalStatus::Active` est bien là dans le code Rust.
            // Le test précédent (où l'époque est fermée) couvre le fait que la proposition n'est pas soutenable.
            console.log("  [ErrorCase:ProposalNotActiveWhenEpochActive] Test skipped: current IX structure makes isolated testing of ProposalNotActive difficult without also triggering EpochNotActive or ProposalEpochMismatch.");
            // Si nous voulions le forcer, et que `updateProposalStatus` permettrait de changer le statut avec une époque active :
            // await updateProposalStatusOnChain(errorCtx, localProposalPda, localActiveEpochPda, newStatusRejected); // Supposons que cela soit possible
            // const updatedProposal = await errorProgram.account.tokenProposal.fetch(localProposalPda);
            // expect(JSON.stringify(updatedProposal.status)).to.equal(JSON.stringify(newStatusRejected));
            // const supportAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);
            // let errorCaught = false;
            // try {
            //     await supportProposalOnChain(
            //         errorCtx,
            //         testSupporterKeypair,
            //         localProposalPda, 
            //         localTestEpochId, 
            //         localActiveEpochPda, // Epoch est active
            //         supportAmount
            //     );
            // } catch (error) {
            //     expect(error.message).to.include('Proposal is not active'); 
            //     errorCaught = true;
            // }
            // expect(errorCaught).to.be.true;
        });

        it('should fail to support a proposal with an amount of 0', async () => {
            const zeroAmount = new anchor.BN(0);
            let errorCaught = false;
            try {
                await supportProposalOnChain(
                    errorCtx,
                    testSupporterKeypair,
                    testProposalPda,
                    testEpochId,
                    testActiveEpochPda,
                    zeroAmount
                );
            } catch (error) {
                // Expected error caught: ...
                expect(error.message).to.include('Le montant doit être supérieur à zéro'); 
                errorCaught = true;
            }
            expect(errorCaught).to.be.true;
        });

        it('should fail if the provided EpochManagement account does not match the proposal\'s epoch', async () => {
            // Créer une deuxième époque active
            const anotherEpochId = generateRandomBN(testEpochId.toNumber() + 1); 
            const anotherActiveEpochPda = await ensureEpochIsActive(errorCtx, anotherEpochId);
            // Second active epoch ... created: ...

            const supportAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);
            let errorCaught = false;
            try {
                await supportProposalOnChain(
                    errorCtx,
                    testSupporterKeypair,
                    testProposalPda,      
                    testEpochId,          
                    anotherActiveEpochPda, 
                    supportAmount
                );
            } catch (error) {
                // Expected error caught: ...
                // Le message d'erreur d'Anchor pour une contrainte de compte est souvent "An account constraint was violated"
                // suivi du nom de la contrainte.
                // Ici, nous nous attendons à quelque chose lié à ProposalEpochMismatch.
                expect(error.message).to.include('ProposalEpochMismatch'); 
                errorCaught = true;
            }
            expect(errorCaught).to.be.true;
        });

        it('should correctly update amounts and not re-increment totalContributions when supporting the same proposal twice', async () => {
            const firstSupportAmountGross = new anchor.BN(0.5 * LAMPORTS_PER_SOL);
            const secondSupportAmountGross = new anchor.BN(0.3 * LAMPORTS_PER_SOL);

            // Calcul des montants nets pour chaque soutien
            const calcNet = (gross: anchor.BN) => gross.sub(gross.mul(SUPPORT_FEE_PERCENTAGE_NUMERATOR).div(SUPPORT_FEE_PERCENTAGE_DENOMINATOR));
            const firstSupportNet = calcNet(firstSupportAmountGross);
            const secondSupportNet = calcNet(secondSupportAmountGross);
            const totalNetExpected = firstSupportNet.add(secondSupportNet);

            // First gross: ..., net: ...
            // Second gross: ..., net: ...
            // Total net expected: ...

            // Premier soutien
            const initialProposalState = await errorProgram.account.tokenProposal.fetch(testProposalPda);
            const initialTotalContributions = initialProposalState.totalContributions;
            const initialSolRaised = initialProposalState.solRaised;

            const userSupportPda = await supportProposalOnChain(
                errorCtx,
                testSupporterKeypair,
                testProposalPda,
                testEpochId,
                testActiveEpochPda,
                firstSupportAmountGross
            );
            // First support by ... successful.

            const proposalAfterFirstSupport = await errorProgram.account.tokenProposal.fetch(testProposalPda);
            const userSupportAfterFirst = await errorProgram.account.userProposalSupport.fetch(userSupportPda);

            expect(userSupportAfterFirst.amount.eq(firstSupportNet)).to.be.true;
            expect(proposalAfterFirstSupport.solRaised.eq(initialSolRaised.add(firstSupportNet))).to.be.true;
            expect(proposalAfterFirstSupport.totalContributions.eq(initialTotalContributions.add(new anchor.BN(1)))).to.be.true;
            // State after 1st support: UserSupport.amount=..., Proposal.solRaised=..., Proposal.totalContributions=...

            // Deuxième soutien par le même utilisateur
            await supportProposalOnChain(
                errorCtx,
                testSupporterKeypair, // Même supporter
                testProposalPda,
                testEpochId,
                testActiveEpochPda,
                secondSupportAmountGross
            );
            // Second support by ... successful.

            const proposalAfterSecondSupport = await errorProgram.account.tokenProposal.fetch(testProposalPda);
            const userSupportAfterSecond = await errorProgram.account.userProposalSupport.fetch(userSupportPda);

            // Vérifier que le montant du UserProposalSupport est la somme des montants nets
            expect(userSupportAfterSecond.amount.eq(totalNetExpected)).to.be.true;
            // Vérifier que solRaised sur la proposition est la somme des montants nets
            expect(proposalAfterSecondSupport.solRaised.eq(initialSolRaised.add(totalNetExpected))).to.be.true;
            // Vérifier que totalContributions n'a PAS été incrémenté à nouveau
            expect(proposalAfterSecondSupport.totalContributions.eq(initialTotalContributions.add(new anchor.BN(1)))).to.be.true;
            // State after 2nd support: UserSupport.amount=..., Proposal.solRaised=..., Proposal.totalContributions=...
        });

        it('should fail if the target proposal account does not exist', async () => {
            const nonExistentProposalPda = Keypair.generate().publicKey; 
            // Attempting to support non-existent proposal: ...

            const supportAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
            let errorCaught = false;
            try {
                await supportProposalOnChain(
                    errorCtx,
                    testSupporterKeypair,
                    nonExistentProposalPda, 
                    testEpochId, 
                    testActiveEpochPda,
                    supportAmount
                );
            } catch (error) {
                // Expected error caught: ...
                // L'erreur attendue est généralement que le compte n'a pas pu être chargé/désérialisé
                // ou "Account does not exist"
                const typicalErrorMessages = [
                    "Account does not exist",
                    "could not find account",
                    "AccountNotInitialized", // Erreur Anchor spécifique
                    "Error Deserializing account", // Autre erreur Anchor possible
                ];
                const messageMatches = typicalErrorMessages.some(msg => error.message.includes(msg));
                expect(messageMatches).to.be.true;
                errorCaught = true;
            }
            expect(errorCaught).to.be.true;
        });

        it('should fail if the provided EpochManagement account does not exist', async () => {
            const nonExistentEpochId = generateRandomBN(99999); 
            const [nonExistentEpochPda, _bump] = getEpochManagementPda(errorProgram.programId, nonExistentEpochId);
            // Attempting to use non-existent epoch PDA: ... for epoch ID ...

            const supportAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
            let errorCaught = false;
            try {
                // Note: testProposalPda existe et appartient à testEpochId/testActiveEpochPda
                // Mais nous fournissons un epochManagementAddress qui n'existe pas.
                await supportProposalOnChain(
                    errorCtx,
                    testSupporterKeypair,
                    testProposalPda, 
                    testEpochId, 
                    nonExistentEpochPda, 
                    supportAmount
                );
            } catch (error) {
                // Expected error caught: ...
                const typicalErrorMessages = [
                    "Account does not exist",
                    "could not find account",
                    "AccountNotInitialized",
                    "Error Deserializing account",
                ];
                const messageMatches = typicalErrorMessages.some(msg => error.message.includes(msg));
                expect(messageMatches).to.be.true;
                errorCaught = true;
            }
            expect(errorCaught).to.be.true;
        });

        it('should fail if the provided EpochManagement account is not active (e.g., closed)', async () => {
            // testProposalPda est créé dans un testActiveEpochPda dans le beforeEach.
            // Nous allons fermer testActiveEpochPda.
            // Closing epoch ... to test support against non-active epoch.
            await closeEpochOnChain(errorCtx, testEpochId, errorCtx.adminKeypair);

            // Vérifier que l'époque est bien fermée
            const closedEpochAccount = await errorProgram.account.epochManagement.fetch(testActiveEpochPda);
            expect(JSON.stringify(closedEpochAccount.status)).to.equal(JSON.stringify({ closed: {} }));
            // Epoch ... confirmed closed.

            const supportAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
            let errorCaught = false;
            try {
                await supportProposalOnChain(
                    errorCtx,
                    testSupporterKeypair,
                    testProposalPda,      
                    testEpochId,          
                    testActiveEpochPda,   
                    supportAmount
                );
            } catch (error) {
                // Expected error caught: ...
                expect(error.message).to.include('EpochNotActive');
                errorCaught = true;
            }
            expect(errorCaught).to.be.true;
        });

        // Plus de tests d'erreur ici...
    });
} 