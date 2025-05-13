console.log("\n\n=====================================");
console.log(">>> Démarrage tests: proposal.test.ts <<<");
console.log("=====================================\n");

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Programs } from "../target/types/programs";
import { PublicKey } from "@solana/web3.js";

// Importer et configurer chai AVANT d'importer expect
import chai from "chai";

// Importer expect de chai APRÈS la configuration
import { expect } from "chai";

import { generateRandomId, setupTestEnvironment } from "./utils.test";

describe("Tests des propositions de tokens", () => {
  const { provider, program } = setupTestEnvironment();
  let proposalPda: PublicKey;
  let epochPda: PublicKey;
  let treasuryPda: PublicKey;
  const TREASURY_SEED = Buffer.from("treasury");

  // Constantes pour les tests
  const tokenName = "noRugToken";
  const tokenSymbol = "NRT";
  const totalSupply = new anchor.BN(1000000);
  const creatorAllocation = 10;
  const lockupPeriod = new anchor.BN(86400); // 1 jour en secondes
  const epochIdGeneral = generateRandomId();

  // Constantes pour les frais de support (dupliquées de constants.rs pour usage dans les tests)
  const SUPPORT_FEE_PERCENTAGE_NUMERATOR = new anchor.BN(5);
  const SUPPORT_FEE_PERCENTAGE_DENOMINATOR = new anchor.BN(1000);

  // Constantes pour la distribution des frais de support (pourcentages)
  const TREASURY_DISTRIBUTION_MARKETING_PERCENT = 10;
  const TREASURY_DISTRIBUTION_TEAM_PERCENT = 40;
  const TREASURY_DISTRIBUTION_OPERATIONS_PERCENT = 5;
  const TREASURY_DISTRIBUTION_INVESTMENTS_PERCENT = 44;
  const TREASURY_DISTRIBUTION_CRANK_PERCENT = 1;

  it("Démarre une nouvelle époque", async () => {
    const epochId = epochIdGeneral;
    const startTime = new anchor.BN(Math.floor(Date.now() / 1000));
    const endTime = new anchor.BN(startTime.toNumber() + 86400); // 1 jour

    [epochPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch"), epochId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .startEpoch(epochId, startTime, endTime)
      .accounts({
        authority: provider.wallet.publicKey,
        epochManagement: epochPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction signature", tx);
    console.log("\nCreation nouvelle epoch:");
    console.log("----------------------------------\n");

    // Vérifier que l'époque a été créée correctement
    const epoch = await program.account.epochManagement.fetch(epochPda);
    console.log("Valeurs attendues pour l'époque:");
    console.log(`- epochId: ${epochId.toString()}`);
    console.log(`- startTime: ${startTime.toString()}`);
    console.log(`- endTime: ${endTime.toString()}`);
    console.log(`- status: { active: {} }`);
    
    console.log("Valeurs réelles de l'époque:");
    console.log(`- epochId: ${epoch.epochId.toString()}`);
    console.log(`- startTime: ${epoch.startTime.toString()}`);
    console.log(`- endTime: ${epoch.endTime.toString()}`);
    console.log(`- status: ${JSON.stringify(epoch.status)}`);
    
    expect(epoch.epochId.toString()).to.equal(epochId.toString());
    expect(epoch.startTime.toString()).to.equal(startTime.toString());
    expect(epoch.endTime.toString()).to.equal(endTime.toString());
    expect(epoch.status).to.deep.equal({ active: {} });
  });

  it("Initialise le compte Treasury", async () => {
    [treasuryPda] = PublicKey.findProgramAddressSync(
      [TREASURY_SEED],
      program.programId
    );

    console.log("\nInitialisation de la Trésorerie:");
    console.log("----------------------------------");
    console.log(`- Treasury PDA: ${treasuryPda.toBase58()}`);

    const initialTreasuryAuthority = provider.wallet.publicKey;

    try {
      // Essayer de récupérer le compte d'abord
      const existingTreasuryAccount = await program.account.treasury.fetch(treasuryPda);
      console.log("- Compte Treasury déjà initialisé.");
      // Vérifier si l'autorité est correcte (optionnel mais bonne pratique)
      expect(existingTreasuryAccount.authority.toBase58()).to.equal(initialTreasuryAuthority.toBase58());
    } catch (error) {
      // Si le compte n'existe pas, l'erreur "Account does not exist" sera levée, nous pouvons alors l'initialiser
      if (error.message.includes("Account does not exist") || error.message.includes("Account not found")) {
        console.log("- Compte Treasury non trouvé, initialisation...");
        await program.methods
          .initializeTreasury(initialTreasuryAuthority)
          .accounts({
            treasury: treasuryPda,
            authority: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
        console.log("- Compte Treasury initialisé avec succès.");
      } else {
        // Si c'est une autre erreur, la relancer
        throw error;
      }
    }

    // Vérifications finales dans tous les cas (initialisé maintenant ou déjà existant)
    const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
    expect(treasuryAccount.authority.toBase58()).to.equal(initialTreasuryAuthority.toBase58());
    // Les soldes peuvent ne pas être à zéro s'ils ont été modifiés par un test précédent,
    // donc ces vérifications ne sont pertinentes que pour une VRAIE première initialisation.
    // Pour ce test, nous nous assurons surtout que le compte existe et que l'autorité est correcte.
    // Si nous voulions tester les soldes à zéro, il faudrait une méthode pour réinitialiser la trésorerie
    // ou s'assurer que ce test s'exécute dans un environnement complètement frais.
    // Pour l'instant, on commente les vérifications de solde strictes à zéro.
    // expect(treasuryAccount.marketing.solBalance.toNumber()).to.equal(0);
    // expect(treasuryAccount.team.solBalance.toNumber()).to.equal(0);
    // expect(treasuryAccount.operations.solBalance.toNumber()).to.equal(0);
    // expect(treasuryAccount.investments.solBalance.toNumber()).to.equal(0);
    // expect(treasuryAccount.crank.solBalance.toNumber()).to.equal(0);
  });

  it("Crée une nouvelle proposition de token et vérifie les frais", async () => {
    const epoch = await program.account.epochManagement.fetch(epochPda);
    const epochId = epoch.epochId;
    const creatorAllocation = 10; 
    const description = "Ceci est la description test pour noRugToken.";
    const imageUrl = null; 
    const PROPOSAL_CREATION_FEE_LAMPORTS = 5000000;

    [proposalPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        provider.wallet.publicKey.toBuffer(),
        epochId.toArrayLike(Buffer, "le", 8),
        Buffer.from(tokenName),
      ],
      program.programId
    );

    console.log("\nTest de création de proposition (avec frais):");
    console.log("---------------------------------------------");
    console.log(`- proposalPda: ${proposalPda.toString()}`);
    console.log(`- epochId utilisé: ${epochId.toString()}`);
    console.log(`- treasuryPda: ${treasuryPda.toBase58()}`);

    const creatorBalanceBefore = await provider.connection.getBalance(provider.wallet.publicKey);
    const treasuryAccountBefore = await program.account.treasury.fetch(treasuryPda);
    const treasuryOperationsBalanceBefore = treasuryAccountBefore.operations.solBalance.toNumber();
    const treasuryPdaBalanceBefore = await provider.connection.getBalance(treasuryPda);

    const tx = await program.methods
      .createProposal(
        tokenName,
        tokenSymbol,
        description,
        imageUrl,
        totalSupply,
        creatorAllocation,
        lockupPeriod
      )
      .accounts({ 
        creator: provider.wallet.publicKey,
        tokenProposal: proposalPda,
        epoch: epochPda,
        treasury: treasuryPda, 
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction signature", tx);

    const creatorBalanceAfter = await provider.connection.getBalance(provider.wallet.publicKey);
    const treasuryAccountAfter = await program.account.treasury.fetch(treasuryPda);
    const treasuryOperationsBalanceAfter = treasuryAccountAfter.operations.solBalance.toNumber();
    const treasuryPdaBalanceAfter = await provider.connection.getBalance(treasuryPda);

    console.log("\nVérification des Frais de Création de Proposition:");
    console.log(`- Solde Créateur Avant: ${creatorBalanceBefore}`);
    console.log(`- Solde Créateur Après: ${creatorBalanceAfter}`);
    console.log(`- Diminution attendue pour le créateur (au moins): ${PROPOSAL_CREATION_FEE_LAMPORTS}`);
    expect(creatorBalanceBefore - creatorBalanceAfter).to.be.gte(PROPOSAL_CREATION_FEE_LAMPORTS);

    console.log(`- Solde PDA Trésorerie Avant: ${treasuryPdaBalanceBefore}`);
    console.log(`- Solde PDA Trésorerie Après: ${treasuryPdaBalanceAfter}`);
    expect(treasuryPdaBalanceAfter - treasuryPdaBalanceBefore).to.equal(PROPOSAL_CREATION_FEE_LAMPORTS);
    
    console.log(`- Solde Opérations Trésorerie Avant: ${treasuryOperationsBalanceBefore}`);
    console.log(`- Solde Opérations Trésorerie Après: ${treasuryOperationsBalanceAfter}`);
    expect(treasuryOperationsBalanceAfter - treasuryOperationsBalanceBefore).to.equal(PROPOSAL_CREATION_FEE_LAMPORTS);

    expect(treasuryAccountAfter.marketing.solBalance.toNumber()).to.equal(treasuryAccountBefore.marketing.solBalance.toNumber());
    expect(treasuryAccountAfter.team.solBalance.toNumber()).to.equal(treasuryAccountBefore.team.solBalance.toNumber());
    expect(treasuryAccountAfter.investments.solBalance.toNumber()).to.equal(treasuryAccountBefore.investments.solBalance.toNumber());
    expect(treasuryAccountAfter.crank.solBalance.toNumber()).to.equal(treasuryAccountBefore.crank.solBalance.toNumber());
    console.log("- Frais correctement transférés et distribués à Operations.");

    // --- Vérifications existantes pour la proposition ---
    const proposal = await program.account.tokenProposal.fetch(proposalPda);
    const remainingAllocation = 100 - creatorAllocation;
    const expectedSupporterAllocation = Math.ceil(remainingAllocation / 2);
    expect(proposal.supporterAllocation).to.equal(expectedSupporterAllocation);
    expect(proposal.description).to.equal(description);
    expect(proposal.imageUrl).to.be.null;
    expect(proposal.tokenName).to.equal(tokenName);
    expect(proposal.tokenSymbol).to.equal(tokenSymbol);
    expect(proposal.totalSupply.toString()).to.equal(totalSupply.toString());
    expect(proposal.creatorAllocation).to.equal(creatorAllocation);
    expect(proposal.solRaised.toString()).to.equal("0");
    expect(proposal.totalContributions.toString()).to.equal("0");
    expect(proposal.lockupPeriod.toString()).to.equal(lockupPeriod.toString());

    // --- Vérification ajoutée pour creationTimestamp ---
    expect(proposal.creationTimestamp).to.exist;
    expect(proposal.creationTimestamp).to.be.instanceOf(anchor.BN);
    expect(proposal.creationTimestamp.gtn(0)).to.be.true;
  });

  // --- Tests Granulaires pour support_proposal ---
  const supporter = provider.wallet;
  const supportAmount1_BN = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1); // 0.1 SOL
  const supportAmount2_BN = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.05); // 0.05 SOL
  
  let userSupportPda: PublicKey;
  let proposalEpochId: anchor.BN;
  
  // Variables pour stocker les soldes avant/après et les montants calculés pour le 1er support
  let supporterBalanceBefore1: number;
  let proposalBalanceBefore1: number;
  let treasuryPdaBalanceBefore1: number;
  let treasurySubAccountsBefore1: { marketing: anchor.BN, team: anchor.BN, operations: anchor.BN, investments: anchor.BN, crank: anchor.BN };
  let expectedFeeAmount1: anchor.BN;
  let expectedNetSupportAmount1: anchor.BN;

  // Variables pour le 2ème support
  let supporterBalanceBefore2: number;
  let proposalBalanceBefore2: number;
  let treasuryPdaBalanceBefore2: number;
  let treasurySubAccountsBefore2: { marketing: anchor.BN, team: anchor.BN, operations: anchor.BN, investments: anchor.BN, crank: anchor.BN };
  let expectedFeeAmount2: anchor.BN;
  let expectedNetSupportAmount2: anchor.BN;

  it("Vérifie le calcul du PDA UserProposalSupport avant le premier support", async () => {
    expect(proposalPda).to.exist; // Assure que la proposition a été créée
    const proposal = await program.account.tokenProposal.fetch(proposalPda);
    proposalEpochId = proposal.epochId; // Stocker pour les tests suivants

    [userSupportPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("support"),
        proposalEpochId.toArrayLike(Buffer, "le", 8),
        supporter.publicKey.toBuffer(),
        proposalPda.toBuffer(),
      ],
      program.programId
    );
    console.log("\nCalcul UserSupport PDA:");
    console.log("--------------------------");
    console.log(`- Epoch ID: ${proposalEpochId.toString()}`);
    console.log(`- Supporter: ${supporter.publicKey.toString()}`);
    console.log(`- Proposition: ${proposalPda.toString()}`);
    console.log(`- PDA Calculé: ${userSupportPda.toString()}`);
    expect(userSupportPda).to.exist;

    // Vérifier qu'il n'existe pas encore
    try {
      await program.account.userProposalSupport.fetch(userSupportPda);
      // Si fetch réussit, c'est une erreur car il ne devrait pas exister
      expect.fail("Le compte UserProposalSupport ne devrait pas exister avant le premier support.");
    } catch (error) {
      // S'attendre à une erreur "Account does not exist"
      expect(error.message).to.contain("Account does not exist");
      console.log("- Compte UserProposalSupport non trouvé (attendu). OK.");
    }
  });

  it("Supporte une proposition active pour la première fois (avec frais)", async () => {
    console.log("\nSupport (1ère fois avec frais): Exécution");
    console.log("------------------------------------------");

    // Calcul des frais et du montant net attendus pour le 1er support
    expectedFeeAmount1 = supportAmount1_BN
      .mul(SUPPORT_FEE_PERCENTAGE_NUMERATOR)
      .div(SUPPORT_FEE_PERCENTAGE_DENOMINATOR);
    expectedNetSupportAmount1 = supportAmount1_BN.sub(expectedFeeAmount1);

    console.log(`- Montant brut du support (1): ${supportAmount1_BN.toString()}`);
    console.log(`- Frais attendus (1): ${expectedFeeAmount1.toString()}`);
    console.log(`- Montant net attendu pour la proposition (1): ${expectedNetSupportAmount1.toString()}`);

    // Stocker les soldes AVANT la transaction
    supporterBalanceBefore1 = await provider.connection.getBalance(supporter.publicKey);
    proposalBalanceBefore1 = await provider.connection.getBalance(proposalPda);
    treasuryPdaBalanceBefore1 = await provider.connection.getBalance(treasuryPda);
    const treasuryAccBefore = await program.account.treasury.fetch(treasuryPda);
    treasurySubAccountsBefore1 = {
        marketing: treasuryAccBefore.marketing.solBalance,
        team: treasuryAccBefore.team.solBalance,
        operations: treasuryAccBefore.operations.solBalance,
        investments: treasuryAccBefore.investments.solBalance,
        crank: treasuryAccBefore.crank.solBalance,
    };

    console.log(`- Solde supporter avant (1): ${supporterBalanceBefore1}`);
    console.log(`- Solde proposition avant (1): ${proposalBalanceBefore1}`);
    console.log(`- Solde PDA Trésorerie avant (1): ${treasuryPdaBalanceBefore1}`);

    const tx = await program.methods
      .supportProposal(supportAmount1_BN)
      .accounts({
        user: supporter.publicKey,
        epoch: epochPda,
        proposal: proposalPda,
        userSupport: userSupportPda,
        treasury: treasuryPda, // Ajout du compte treasury
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log(`- Transaction signature (1er support avec frais): ${tx}`);
    expect(tx).to.be.a('string'); 
  });

  it("Vérifie les transferts et soldes après le premier support (avec frais)", async () => {
    const proposalBalanceAfter1 = await provider.connection.getBalance(proposalPda);
    const treasuryPdaBalanceAfter1 = await provider.connection.getBalance(treasuryPda);
    const treasuryAccAfter1 = await program.account.treasury.fetch(treasuryPda);

    console.log("\nVérification Soldes (après 1er support avec frais):");
    console.log("-------------------------------------------------------");

    // Vérification solde Proposition (doit augmenter du montant NET)
    const expectedProposalBalanceAfter1 = proposalBalanceBefore1 + expectedNetSupportAmount1.toNumber();
    console.log(`- Solde proposition après (1): ${proposalBalanceAfter1} (attendu: ${expectedProposalBalanceAfter1})`);
    expect(proposalBalanceAfter1).to.equal(expectedProposalBalanceAfter1);

    // Vérification solde PDA Trésorerie (doit augmenter des FRAIS)
    const expectedTreasuryPdaBalanceAfter1 = treasuryPdaBalanceBefore1 + expectedFeeAmount1.toNumber();
    console.log(`- Solde PDA Trésorerie après (1): ${treasuryPdaBalanceAfter1} (attendu: ${expectedTreasuryPdaBalanceAfter1})`);
    expect(treasuryPdaBalanceAfter1).to.equal(expectedTreasuryPdaBalanceAfter1);

    // Vérification distribution interne trésorerie
    let calculatedDistributionTotal1 = new anchor.BN(0);
    const marketingIncrease1 = treasuryAccAfter1.marketing.solBalance.sub(treasurySubAccountsBefore1.marketing);
    const teamIncrease1 = treasuryAccAfter1.team.solBalance.sub(treasurySubAccountsBefore1.team);
    const operationsIncrease1 = treasuryAccAfter1.operations.solBalance.sub(treasurySubAccountsBefore1.operations);
    const investmentsIncrease1 = treasuryAccAfter1.investments.solBalance.sub(treasurySubAccountsBefore1.investments);
    const crankIncrease1 = treasuryAccAfter1.crank.solBalance.sub(treasurySubAccountsBefore1.crank);

    const expectedMarketing1 = expectedFeeAmount1.mul(new anchor.BN(TREASURY_DISTRIBUTION_MARKETING_PERCENT)).div(new anchor.BN(100));
    calculatedDistributionTotal1 = calculatedDistributionTotal1.add(expectedMarketing1);
    const expectedTeam1 = expectedFeeAmount1.mul(new anchor.BN(TREASURY_DISTRIBUTION_TEAM_PERCENT)).div(new anchor.BN(100));
    calculatedDistributionTotal1 = calculatedDistributionTotal1.add(expectedTeam1);
    const expectedOperations1 = expectedFeeAmount1.mul(new anchor.BN(TREASURY_DISTRIBUTION_OPERATIONS_PERCENT)).div(new anchor.BN(100));
    calculatedDistributionTotal1 = calculatedDistributionTotal1.add(expectedOperations1);
    const expectedInvestments1 = expectedFeeAmount1.mul(new anchor.BN(TREASURY_DISTRIBUTION_INVESTMENTS_PERCENT)).div(new anchor.BN(100));
    calculatedDistributionTotal1 = calculatedDistributionTotal1.add(expectedInvestments1);
    
    // Le reste va au crank
    const expectedCrank1 = expectedFeeAmount1.sub(calculatedDistributionTotal1);

    console.log(`  Distribution Trésorerie (1):`);
    console.log(`  - Marketing: ${marketingIncrease1.toString()} (attendu: ${expectedMarketing1.toString()})`);
    console.log(`  - Team: ${teamIncrease1.toString()} (attendu: ${expectedTeam1.toString()})`);
    console.log(`  - Operations: ${operationsIncrease1.toString()} (attendu: ${expectedOperations1.toString()})`);
    console.log(`  - Investments: ${investmentsIncrease1.toString()} (attendu: ${expectedInvestments1.toString()})`);
    console.log(`  - Crank (reliquat): ${crankIncrease1.toString()} (attendu: ${expectedCrank1.toString()})`);

    expect(marketingIncrease1.eq(expectedMarketing1)).to.be.true;
    expect(teamIncrease1.eq(expectedTeam1)).to.be.true;
    expect(operationsIncrease1.eq(expectedOperations1)).to.be.true;
    expect(investmentsIncrease1.eq(expectedInvestments1)).to.be.true;
    expect(crankIncrease1.eq(expectedCrank1)).to.be.true;
    expect(marketingIncrease1.add(teamIncrease1).add(operationsIncrease1).add(investmentsIncrease1).add(crankIncrease1).eq(expectedFeeAmount1)).to.be.true;
  });
  
  it("Vérifie la mise à jour des champs de TokenProposal après le premier support (avec frais)", async () => {
    const proposal = await program.account.tokenProposal.fetch(proposalPda);
    console.log("\nVérification Champs Proposition (après 1er support avec frais):");
    console.log("------------------------------------------------------------------");
    console.log(`- solRaised: ${proposal.solRaised.toString()} (attendu: ${expectedNetSupportAmount1.toString()})`);
    console.log(`- totalContributions: ${proposal.totalContributions.toString()} (attendu: 1)`);
    expect(proposal.solRaised.eq(expectedNetSupportAmount1)).to.be.true;
    expect(proposal.totalContributions.toString()).to.equal("1");
  });

  it("Vérifie la création et le contenu du compte UserProposalSupport après le premier support (avec frais)", async () => {
    const userSupport = await program.account.userProposalSupport.fetch(userSupportPda);
    console.log("\nVérification Compte UserSupport (après 1er support avec frais):");
    console.log("-----------------------------------------------------------------");
    expect(userSupport.epochId.toString()).to.equal(proposalEpochId.toString());
    expect(userSupport.user.toString()).to.equal(supporter.publicKey.toString());
    expect(userSupport.proposal.toString()).to.equal(proposalPda.toString());
    console.log(`- Amount: ${userSupport.amount.toString()} (attendu: ${expectedNetSupportAmount1.toString()})`);
    expect(userSupport.amount.eq(expectedNetSupportAmount1)).to.be.true;
  });

  it("Vérifie la diminution du solde du supporter après le premier support (avec frais)", async () => {
    const supporterBalanceAfter1 = await provider.connection.getBalance(supporter.publicKey);
    console.log("\nVérification Solde Supporter (après 1er support avec frais):");
    console.log("---------------------------------------------------------------");
    console.log(`- Solde supporter après (1): ${supporterBalanceAfter1}`);
    // Le supporter paie le montant BRUT + frais de transaction Solana (difficile à prédire exactement)
    // Donc on vérifie que la diminution est au moins le montant BRUT.
    expect(supporterBalanceAfter1).to.be.lessThan(supporterBalanceBefore1 - supportAmount1_BN.toNumber());
    console.log("- Solde a diminué d'au moins le montant brut du support. OK.");
  });

  it("Supporte la même proposition active une deuxième fois (avec frais)", async () => {
    console.log("\nSupport (2ème fois avec frais): Exécution");
    console.log("------------------------------------------");

    // Calcul des frais et du montant net attendus pour le 2ème support
    expectedFeeAmount2 = supportAmount2_BN
      .mul(SUPPORT_FEE_PERCENTAGE_NUMERATOR)
      .div(SUPPORT_FEE_PERCENTAGE_DENOMINATOR);
    expectedNetSupportAmount2 = supportAmount2_BN.sub(expectedFeeAmount2);

    console.log(`- Montant brut du support (2): ${supportAmount2_BN.toString()}`);
    console.log(`- Frais attendus (2): ${expectedFeeAmount2.toString()}`);
    console.log(`- Montant net attendu pour la proposition (2): ${expectedNetSupportAmount2.toString()}`);

    // Stocker les soldes AVANT la deuxième transaction
    supporterBalanceBefore2 = await provider.connection.getBalance(supporter.publicKey);
    proposalBalanceBefore2 = await provider.connection.getBalance(proposalPda); // Solde après le 1er support
    treasuryPdaBalanceBefore2 = await provider.connection.getBalance(treasuryPda); // Solde après le 1er support
    const treasuryAccBefore2 = await program.account.treasury.fetch(treasuryPda);
    treasurySubAccountsBefore2 = {
        marketing: treasuryAccBefore2.marketing.solBalance,
        team: treasuryAccBefore2.team.solBalance,
        operations: treasuryAccBefore2.operations.solBalance,
        investments: treasuryAccBefore2.investments.solBalance,
        crank: treasuryAccBefore2.crank.solBalance,
    };
    
    console.log(`- Solde supporter avant (2): ${supporterBalanceBefore2}`);
    console.log(`- Solde proposition avant (2): ${proposalBalanceBefore2}`);
    console.log(`- Solde PDA Trésorerie avant (2): ${treasuryPdaBalanceBefore2}`);

    const tx = await program.methods
      .supportProposal(supportAmount2_BN) 
      .accounts({
        user: supporter.publicKey,
        epoch: epochPda,
        proposal: proposalPda,
        userSupport: userSupportPda, 
        treasury: treasuryPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log(`- Transaction signature (2ème support avec frais): ${tx}`);
    expect(tx).to.be.a('string');
  });

  it("Vérifie les transferts et soldes après le deuxième support (avec frais)", async () => {
    const proposalBalanceAfter2 = await provider.connection.getBalance(proposalPda);
    const treasuryPdaBalanceAfter2 = await provider.connection.getBalance(treasuryPda);
    const treasuryAccAfter2 = await program.account.treasury.fetch(treasuryPda);
    
    console.log("\nVérification Soldes (après 2ème support avec frais):");
    console.log("-------------------------------------------------------");

    const expectedProposalBalanceAfter2 = proposalBalanceBefore2 + expectedNetSupportAmount2.toNumber();
    console.log(`- Solde proposition après (2): ${proposalBalanceAfter2} (attendu: ${expectedProposalBalanceAfter2})`);
    expect(proposalBalanceAfter2).to.equal(expectedProposalBalanceAfter2);

    const expectedTreasuryPdaBalanceAfter2 = treasuryPdaBalanceBefore2 + expectedFeeAmount2.toNumber();
    console.log(`- Solde PDA Trésorerie après (2): ${treasuryPdaBalanceAfter2} (attendu: ${expectedTreasuryPdaBalanceAfter2})`);
    expect(treasuryPdaBalanceAfter2).to.equal(expectedTreasuryPdaBalanceAfter2);
    
    // Vérification distribution interne trésorerie pour le 2ème support
    let calculatedDistributionTotal2 = new anchor.BN(0);
    const marketingIncrease2 = treasuryAccAfter2.marketing.solBalance.sub(treasurySubAccountsBefore2.marketing);
    const teamIncrease2 = treasuryAccAfter2.team.solBalance.sub(treasurySubAccountsBefore2.team);
    const operationsIncrease2 = treasuryAccAfter2.operations.solBalance.sub(treasurySubAccountsBefore2.operations);
    const investmentsIncrease2 = treasuryAccAfter2.investments.solBalance.sub(treasurySubAccountsBefore2.investments);
    const crankIncrease2 = treasuryAccAfter2.crank.solBalance.sub(treasurySubAccountsBefore2.crank);

    const expectedMarketing2 = expectedFeeAmount2.mul(new anchor.BN(TREASURY_DISTRIBUTION_MARKETING_PERCENT)).div(new anchor.BN(100));
    calculatedDistributionTotal2 = calculatedDistributionTotal2.add(expectedMarketing2);
    const expectedTeam2 = expectedFeeAmount2.mul(new anchor.BN(TREASURY_DISTRIBUTION_TEAM_PERCENT)).div(new anchor.BN(100));
    calculatedDistributionTotal2 = calculatedDistributionTotal2.add(expectedTeam2);
    const expectedOperations2 = expectedFeeAmount2.mul(new anchor.BN(TREASURY_DISTRIBUTION_OPERATIONS_PERCENT)).div(new anchor.BN(100));
    calculatedDistributionTotal2 = calculatedDistributionTotal2.add(expectedOperations2);
    const expectedInvestments2 = expectedFeeAmount2.mul(new anchor.BN(TREASURY_DISTRIBUTION_INVESTMENTS_PERCENT)).div(new anchor.BN(100));
    calculatedDistributionTotal2 = calculatedDistributionTotal2.add(expectedInvestments2);
    const expectedCrank2 = expectedFeeAmount2.sub(calculatedDistributionTotal2); // Le reste va au crank

    console.log(`  Distribution Trésorerie (2):`);
    console.log(`  - Marketing: ${marketingIncrease2.toString()} (attendu: ${expectedMarketing2.toString()})`);
    console.log(`  - Team: ${teamIncrease2.toString()} (attendu: ${expectedTeam2.toString()})`);
    console.log(`  - Operations: ${operationsIncrease2.toString()} (attendu: ${expectedOperations2.toString()})`);
    console.log(`  - Investments: ${investmentsIncrease2.toString()} (attendu: ${expectedInvestments2.toString()})`);
    console.log(`  - Crank (reliquat): ${crankIncrease2.toString()} (attendu: ${expectedCrank2.toString()})`);
    
    expect(marketingIncrease2.eq(expectedMarketing2)).to.be.true;
    expect(teamIncrease2.eq(expectedTeam2)).to.be.true;
    expect(operationsIncrease2.eq(expectedOperations2)).to.be.true;
    expect(investmentsIncrease2.eq(expectedInvestments2)).to.be.true;
    expect(crankIncrease2.eq(expectedCrank2)).to.be.true;
    expect(marketingIncrease2.add(teamIncrease2).add(operationsIncrease2).add(investmentsIncrease2).add(crankIncrease2).eq(expectedFeeAmount2)).to.be.true;
  });

  it("Vérifie la mise à jour des champs de TokenProposal après le deuxième support (avec frais)", async () => {
    const proposal = await program.account.tokenProposal.fetch(proposalPda);
    const expectedTotalSolRaised = expectedNetSupportAmount1.add(expectedNetSupportAmount2);
    console.log("\nVérification Champs Proposition (après 2ème support avec frais):");
    console.log("-----------------------------------------------------------------");
    console.log(`- solRaised: ${proposal.solRaised.toString()} (attendu: ${expectedTotalSolRaised.toString()})`);
    console.log(`- totalContributions: ${proposal.totalContributions.toString()} (attendu: 1)`); 
    expect(proposal.solRaised.eq(expectedTotalSolRaised)).to.be.true;
    expect(proposal.totalContributions.toString()).to.equal("1"); 
  });

  it("Vérifie la mise à jour du montant cumulé dans UserProposalSupport après le deuxième support (avec frais)", async () => {
    const userSupport = await program.account.userProposalSupport.fetch(userSupportPda);
    const expectedTotalUserAmount = expectedNetSupportAmount1.add(expectedNetSupportAmount2);
    console.log("\nVérification Compte UserSupport (après 2ème support avec frais):");
    console.log("-----------------------------------------------------------------");
    console.log(`- Amount: ${userSupport.amount.toString()} (attendu: ${expectedTotalUserAmount.toString()})`);
    expect(userSupport.amount.eq(expectedTotalUserAmount)).to.be.true;
  });

  it("Vérifie la diminution du solde du supporter après le deuxième support (avec frais)", async () => {
    const supporterBalanceAfter2 = await provider.connection.getBalance(supporter.publicKey);
    console.log("\nVérification Solde Supporter (après 2ème support avec frais):");
    console.log("----------------------------------------------------------------");
    console.log(`- Solde supporter après (2): ${supporterBalanceAfter2}`);
    expect(supporterBalanceAfter2).to.be.lessThan(supporterBalanceBefore2 - supportAmount2_BN.toNumber());
    console.log("- Solde a diminué d'au moins le montant brut du 2ème support. OK.");
  });

  it("Échoue lors d'une tentative de support avec un montant nul (logique de frais non applicable ici)", async () => {
    console.log("\nTest Échec: Montant nul");
    console.log("-------------------------");
    try {
      await program.methods
        .supportProposal(new anchor.BN(0))
        .accounts({
          user: supporter.publicKey,
          epoch: epochPda,
          proposal: proposalPda,
          userSupport: userSupportPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("Devrait échouer car le montant est nul");
    } catch (error) {
      // console.error(error);
      expect(error).to.be.instanceOf(anchor.AnchorError);
      const anchorError = error as anchor.AnchorError;
      expect(anchorError.error.errorCode.code).to.equal("AmountMustBeGreaterThanZero"); // Vérifier le nom de l'erreur
      console.log(`- Erreur attendue (${anchorError.error.errorCode.code}: ${anchorError.error.errorCode.number}). OK.`);
    }
  });

  // Helper pour créer une epoch et une proposition, puis la passer à un statut final
  async function setupFinalizedProposal(status: 'Validated' | 'Rejected', testId: string): Promise<PublicKey> {
    const testEpochId = generateRandomId();
    const testTokenName = `finalProp-${testId}`; 
    const testStartTime = new anchor.BN(Math.floor(Date.now() / 1000) - 20); // Start in the past
    const testEndTime = new anchor.BN(Math.floor(Date.now() / 1000) - 10);   // End in the past

    const [testEpochPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch"), testEpochId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [testProposalPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        provider.wallet.publicKey.toBuffer(),
        testEpochId.toArrayLike(Buffer, "le", 8),
        Buffer.from(testTokenName),
      ],
      program.programId
    );

    // 1. Créer l'époque
    await program.methods
      .startEpoch(testEpochId, testStartTime, testEndTime)
      .accounts({ authority: provider.wallet.publicKey, epochManagement: testEpochPda })
      .rpc();
    
    // 2. Créer la proposition
    await program.methods
      .createProposal(testTokenName, "FNP", "Finalized Prop", null, new anchor.BN(100), 5, new anchor.BN(0))
      .accounts({ creator: provider.wallet.publicKey, tokenProposal: testProposalPda, epoch: testEpochPda })
      .rpc();

    // 3. Fermer l'époque (nécessaire pour update_proposal_status)
    await program.methods
      .endEpoch()
      .accounts({ authority: provider.wallet.publicKey, epochManagement: testEpochPda })
      .rpc();
    
    // 4. Mettre à jour le statut (nécessite l'autorité admin, ici on triche un peu en utilisant celle du provider)
    // IMPORTANT: Assurez-vous que ProgramConfig est initialisé et que provider.wallet est l'admin
    // Pour ce test, on suppose que c'est le cas via setupTestEnvironment ou un test précédent.
    const configPda = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId)[0];
    await program.methods
      .updateProposalStatus(status === 'Validated' ? { validated: {} } : { rejected: {} })
      .accounts({
        authority: provider.wallet.publicKey, // Doit être l'admin configuré
        epochManagement: testEpochPda,
        proposal: testProposalPda,
        programConfig: configPda,
      })
      .rpc();

    return testProposalPda;
  }
}); 