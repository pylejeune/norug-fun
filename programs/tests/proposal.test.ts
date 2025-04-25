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

  // Constantes pour les tests
  const tokenName = "noRugToken";
  const tokenSymbol = "NRT";
  const totalSupply = new anchor.BN(1000000);
  const creatorAllocation = 10;
  const lockupPeriod = new anchor.BN(86400); // 1 jour en secondes
  const epochIdGeneral = generateRandomId();

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

  it("Crée une nouvelle proposition de token", async () => {
    // Récupérer l'époque pour obtenir l'epoch_id correct
    const epoch = await program.account.epochManagement.fetch(epochPda);
    const epochId = epoch.epochId;
    
    // Définir l'allocation créateur pour ce test
    const creatorAllocation = 10; 
    const description = "Ceci est la description test pour noRugToken.";
    const imageUrl = null; // Tester Option::None

    [proposalPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        provider.wallet.publicKey.toBuffer(),
        epochId.toArrayLike(Buffer, "le", 8),
        Buffer.from(tokenName),
      ],
      program.programId
    );

    console.log("\nTest de création de proposition:");
    console.log("----------------------------------\n");
    console.log(`proposalPda: ${proposalPda.toString()}`);
    console.log(`- epochId utilisé: ${epochId.toString()}`);
    console.log(`- tokenName: ${tokenName}`);

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
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction signature", tx);

    // Vérifier que la proposition a été créée correctement
    const proposal = await program.account.tokenProposal.fetch(proposalPda);

    // --- Vérification du calcul de supporter_allocation --- 
    const remainingAllocation = 100 - creatorAllocation;
    const expectedSupporterAllocation = Math.ceil(remainingAllocation / 2); // Calcul attendu
    console.log("\nVérification Allocation Supporter:");
    console.log(`- Creator Allocation: ${creatorAllocation}%`);
    console.log(`- Remaining Allocation: ${remainingAllocation}%`);
    console.log(`- Expected Supporter Allocation (ceil(remaining/2)): ${expectedSupporterAllocation}%`);
    console.log(`- Actual Supporter Allocation: ${proposal.supporterAllocation}%`);
    expect(proposal.supporterAllocation).to.equal(expectedSupporterAllocation);
    // ------------------------------------------------------

    console.log("\nVérifications pour les nouveaux champs:");
    expect(proposal.description).to.equal(description);
    expect(proposal.imageUrl).to.be.null;

    console.log("\nValeurs attendues pour la proposition:");
    console.log(`- tokenName: ${tokenName}`);
    console.log(`- tokenSymbol: ${tokenSymbol}`);
    console.log(`- totalSupply: ${totalSupply.toString()}`);
    console.log(`- creatorAllocation: ${creatorAllocation}`);
    console.log(`- supporterAllocation: ${expectedSupporterAllocation}`);
    console.log(`- solRaised: 0`);
    console.log(`- totalContributions: 0`);
    console.log(`- lockupPeriod: ${lockupPeriod.toString()}`);
    console.log(`- description: ${description}`);
    console.log(`- imageUrl: ${imageUrl}`);
    
    console.log("Valeurs réelles de la proposition:");
    console.log(`- tokenName: ${proposal.tokenName}`);
    console.log(`- tokenSymbol: ${proposal.tokenSymbol}`);
    console.log(`- totalSupply: ${proposal.totalSupply.toString()}`);
    console.log(`- creatorAllocation: ${proposal.creatorAllocation}`);
    console.log(`- supporterAllocation: ${proposal.supporterAllocation}`);
    console.log(`- solRaised: ${proposal.solRaised.toString()}`);
    console.log(`- totalContributions: ${proposal.totalContributions.toString()}`);
    console.log(`- lockupPeriod: ${proposal.lockupPeriod.toString()}`);
    console.log(`- description: ${proposal.description}`);
    console.log(`- imageUrl: ${proposal.imageUrl}`);
    
    expect(proposal.tokenName).to.equal(tokenName);
    expect(proposal.tokenSymbol).to.equal(tokenSymbol);
    expect(proposal.totalSupply.toString()).to.equal(totalSupply.toString());
    expect(proposal.creatorAllocation).to.equal(creatorAllocation);
    expect(proposal.supporterAllocation).to.equal(expectedSupporterAllocation);
    expect(proposal.solRaised.toString()).to.equal("0");
    expect(proposal.totalContributions.toString()).to.equal("0");
    expect(proposal.lockupPeriod.toString()).to.equal(lockupPeriod.toString());
    expect(proposal.description).to.equal(description);
    expect(proposal.imageUrl).to.be.null;
  });

  it("Affiche la liste des propositions de tokens", async () => {
    const allProposals = await program.account.tokenProposal.all();
    
    console.log("\nListe des propositions de tokens:");
    console.log("-------------------------------");
    
    if (allProposals.length === 0) {
      console.log("Aucune proposition trouvée");
    } else {
      allProposals.forEach((proposal, index) => {
        const account = proposal.account;
        console.log(`\nProposition #${index + 1}:`);
        console.log(`- Token Name: ${account.tokenName}`);
        console.log(`- Token Symbol: ${account.tokenSymbol}`);
        console.log(`- Total Supply: ${account.totalSupply.toString()}`);
        console.log(`- Creator Allocation: ${account.creatorAllocation}%`);
        console.log(`- Supporter Allocation: ${account.supporterAllocation}%`);
        console.log(`- SOL Raised: ${account.solRaised.toString()}`);
        console.log(`- Total Contributions: ${account.totalContributions.toString()}`);
        console.log(`- Lockup Period: ${account.lockupPeriod.toString()} secondes`);
      });
    }
    
    expect(allProposals.length).to.be.greaterThan(0);
  });

  it("Affiche les détails d'une proposition de token spécifique", async () => {
    // Paramètres de recherche
    const targetEpochId = epochIdGeneral; // L'époque que nous cherchons
    const targetCreator = provider.wallet.publicKey; // Le créateur que nous cherchons
    const targetTokenName = tokenName; // Le nom du token que nous cherchons

    // Construire le PDA de la proposition que nous cherchons
    [proposalPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        targetCreator.toBuffer(),
        targetEpochId.toArrayLike(Buffer, "le", 8),
        Buffer.from(targetTokenName),
      ],
      program.programId
    );

    console.log("\nRecherche de la proposition spécifique:");
    console.log("--------------------------------");
    console.log(`Époque recherchée: ${targetEpochId.toString()}`);
    console.log(`Créateur recherché: ${targetCreator.toString()}`);
    console.log(`Nom du token recherché: ${targetTokenName}`);
    console.log(`Adresse de la proposition: ${proposalPda.toString()}`);

    try {
      // Récupérer la proposition spécifique
      const proposal = await program.account.tokenProposal.fetch(proposalPda);
      
      console.log("\nDétails de la proposition trouvée:");
      console.log("--------------------------------");
      console.log(`ID de l'époque: ${proposal.epochId.toString()}`);
      console.log(`Créateur: ${proposal.creator.toString()}`);
      console.log(`Nom du token: ${proposal.tokenName}`);
      console.log(`Symbole du token: ${proposal.tokenSymbol}`);
      console.log(`Supply totale: ${proposal.totalSupply.toString()}`);
      console.log(`Allocation créateur: ${proposal.creatorAllocation}%`);
      console.log(`Allocation supporters: ${proposal.supporterAllocation}%`);
      console.log(`SOL levés: ${proposal.solRaised.toString()}`);
      console.log(`Contributions totales: ${proposal.totalContributions.toString()}`);
      console.log(`Période de blocage: ${proposal.lockupPeriod.toString()} secondes`);
      console.log(`Description: ${proposal.description}`);
      console.log(`Image URL: ${proposal.imageUrl}`);
      console.log(`Statut: ${JSON.stringify(proposal.status)}`);

      // Vérifier que c'est bien la proposition que nous cherchons
      expect(proposal.epochId.toString()).to.equal(targetEpochId.toString());
      expect(proposal.creator.toString()).to.equal(targetCreator.toString());
      expect(proposal.tokenName).to.equal(targetTokenName);
      expect(proposal.description).to.equal("Ceci est la description test pour noRugToken.");
      expect(proposal.imageUrl).to.be.null;

      // Appeler getProposalDetails pour vérifier que tout fonctionne
      const tx = await program.methods
        .getProposalDetails(targetEpochId)
        .accounts({
          proposal: proposalPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("\nTransaction getProposalDetails exécutée avec succès");
      console.log(`Signature de la transaction: ${tx}`);
    } catch (error) {
      console.log("\nErreur lors de la récupération de la proposition:");
      console.log(error);
      throw error;
    }
  });

  // --- Tests Granulaires pour support_proposal ---
  const supporter = provider.wallet;
  const supportAmount1 = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1); // 0.1 SOL
  const supportAmount2 = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.05); // 0.05 SOL
  let userSupportPda: PublicKey;
  let proposalEpochId: anchor.BN;
  let supporterBalanceBefore1: number;
  let proposalBalanceBefore1: number;
  let supporterBalanceBefore2: number;
  let proposalBalanceBefore2: number;

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

  it("Supporte une proposition active pour la première fois", async () => {
    console.log("\nSupport (1ère fois): Exécution");
    console.log("-------------------------------");
    // Stocker les soldes AVANT la transaction
    supporterBalanceBefore1 = await provider.connection.getBalance(supporter.publicKey);
    proposalBalanceBefore1 = await provider.connection.getBalance(proposalPda);
    console.log(`- Solde supporter avant: ${supporterBalanceBefore1}`);
    console.log(`- Solde proposition avant: ${proposalBalanceBefore1}`);
    console.log(`- Montant du support: ${supportAmount1.toString()}`);

    const tx = await program.methods
      .supportProposal(supportAmount1)
      .accounts({
        user: supporter.publicKey,
        epoch: epochPda,
        proposal: proposalPda,
        userSupport: userSupportPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log(`- Transaction signature (1er support): ${tx}`);
    expect(tx).to.be.a('string'); // Simple vérification que la tx a réussi
  });

  it("Vérifie le transfert de SOL vers TokenProposal après le premier support", async () => {
    const proposalBalanceAfter1 = await provider.connection.getBalance(proposalPda);
    const expectedProposalBalance = proposalBalanceBefore1 + supportAmount1.toNumber();
    console.log("\nVérification Solde Proposition (après 1er support):");
    console.log("---------------------------------------------------");
    console.log(`- Solde proposition après: ${proposalBalanceAfter1}`);
    console.log(`- Solde proposition attendu: ${expectedProposalBalance}`);
    expect(proposalBalanceAfter1).to.equal(expectedProposalBalance);
  });

  it("Vérifie la mise à jour des champs de TokenProposal après le premier support", async () => {
    const proposal = await program.account.tokenProposal.fetch(proposalPda);
    console.log("\nVérification Champs Proposition (après 1er support):");
    console.log("---------------------------------------------------");
    console.log(`- solRaised: ${proposal.solRaised.toString()} (attendu: ${supportAmount1.toString()})`);
    console.log(`- totalContributions: ${proposal.totalContributions.toString()} (attendu: 1)`);
    expect(proposal.solRaised.toString()).to.equal(supportAmount1.toString());
    expect(proposal.totalContributions.toString()).to.equal("1");
  });

  it("Vérifie la création et le contenu du compte UserProposalSupport après le premier support", async () => {
    const userSupport = await program.account.userProposalSupport.fetch(userSupportPda);
    console.log("\nVérification Compte UserSupport (après 1er support):");
    console.log("---------------------------------------------------");
    expect(userSupport.epochId.toString()).to.equal(proposalEpochId.toString());
    expect(userSupport.user.toString()).to.equal(supporter.publicKey.toString());
    expect(userSupport.proposal.toString()).to.equal(proposalPda.toString());
    expect(userSupport.amount.toString()).to.equal(supportAmount1.toString());
    console.log(`- Epoch ID: ${userSupport.epochId.toString()}`);
    console.log(`- User: ${userSupport.user.toString()}`);
    console.log(`- Proposal: ${userSupport.proposal.toString()}`);
    console.log(`- Amount: ${userSupport.amount.toString()} (attendu: ${supportAmount1.toString()})`);
  });

  it("Vérifie la diminution du solde du supporter après le premier support", async () => {
    const supporterBalanceAfter1 = await provider.connection.getBalance(supporter.publicKey);
    console.log("\nVérification Solde Supporter (après 1er support):");
    console.log("--------------------------------------------------");
    console.log(`- Solde supporter après: ${supporterBalanceAfter1}`);
    expect(supporterBalanceAfter1).to.be.lessThan(supporterBalanceBefore1 - supportAmount1.toNumber());
    console.log("- Solde a diminué d'au moins le montant du support. OK.");
  });

  it("Supporte la même proposition active une deuxième fois avec un montant différent", async () => {
    console.log("\nSupport (2ème fois): Exécution");
    console.log("-------------------------------");
    // Stocker les soldes AVANT la deuxième transaction
    supporterBalanceBefore2 = await provider.connection.getBalance(supporter.publicKey);
    proposalBalanceBefore2 = await provider.connection.getBalance(proposalPda); // Ce sera le solde après le 1er support
    console.log(`- Solde supporter avant: ${supporterBalanceBefore2}`);
    console.log(`- Solde proposition avant: ${proposalBalanceBefore2}`);
    console.log(`- Montant du 2ème support: ${supportAmount2.toString()}`);

    const tx = await program.methods
      .supportProposal(supportAmount2) // Utiliser le deuxième montant
      .accounts({
        user: supporter.publicKey,
        epoch: epochPda,
        proposal: proposalPda,
        userSupport: userSupportPda, // Le même PDA
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log(`- Transaction signature (2ème support): ${tx}`);
    expect(tx).to.be.a('string');
  });

  it("Vérifie le transfert de SOL vers TokenProposal après le deuxième support", async () => {
    const proposalBalanceAfter2 = await provider.connection.getBalance(proposalPda);
    const expectedProposalBalance = proposalBalanceBefore2 + supportAmount2.toNumber();
    console.log("\nVérification Solde Proposition (après 2ème support):");
    console.log("---------------------------------------------------");
    console.log(`- Solde proposition après: ${proposalBalanceAfter2}`);
    console.log(`- Solde proposition attendu: ${expectedProposalBalance}`);
    expect(proposalBalanceAfter2).to.equal(expectedProposalBalance);
  });

  it("Vérifie la mise à jour des champs de TokenProposal après le deuxième support", async () => {
    const proposal = await program.account.tokenProposal.fetch(proposalPda);
    const expectedSolRaised = supportAmount1.add(supportAmount2);
    console.log("\nVérification Champs Proposition (après 2ème support):");
    console.log("----------------------------------------------------");
    console.log(`- solRaised: ${proposal.solRaised.toString()} (attendu: ${expectedSolRaised.toString()})`);
    console.log(`- totalContributions: ${proposal.totalContributions.toString()} (attendu: 1)`); // Doit rester 1
    expect(proposal.solRaised.toString()).to.equal(expectedSolRaised.toString());
    expect(proposal.totalContributions.toString()).to.equal("1"); // Vérifier que ça n'a pas bougé
  });

  it("Vérifie la mise à jour du montant cumulé dans UserProposalSupport après le deuxième support", async () => {
    const userSupport = await program.account.userProposalSupport.fetch(userSupportPda);
    const expectedAmount = supportAmount1.add(supportAmount2);
    console.log("\nVérification Compte UserSupport (après 2ème support):");
    console.log("----------------------------------------------------");
    console.log(`- Amount: ${userSupport.amount.toString()} (attendu: ${expectedAmount.toString()})`);
    expect(userSupport.amount.toString()).to.equal(expectedAmount.toString());
  });

  it("Vérifie la diminution du solde du supporter après le deuxième support", async () => {
    const supporterBalanceAfter2 = await provider.connection.getBalance(supporter.publicKey);
    console.log("\nVérification Solde Supporter (après 2ème support):");
    console.log("---------------------------------------------------");
    console.log(`- Solde supporter après: ${supporterBalanceAfter2}`);
    expect(supporterBalanceAfter2).to.be.lessThan(supporterBalanceBefore2 - supportAmount2.toNumber());
    console.log("- Solde a diminué d'au moins le montant du 2ème support. OK.");
  });

  it("Échoue lors d'une tentative de support avec un montant nul", async () => {
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

  // it("Échoue lors d'une tentative de support sur une proposition Validated", async () => {
  //   console.log("\nTest Échec: Support sur proposition Validated");
  //   console.log("----------------------------------------------");
  //   const validatedProposalPda = await setupFinalizedProposal('Validated', 'val');
  //   const proposalInfo = await program.account.tokenProposal.fetch(validatedProposalPda);
  //   const epochId = proposalInfo.epochId;
  //   const [tempEpochPda] = PublicKey.findProgramAddressSync( [Buffer.from("epoch"), epochId.toArrayLike(Buffer, "le", 8)], program.programId);
    
  //   const [tempUserSupportPda] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from("support"),
  //       epochId.toArrayLike(Buffer, "le", 8),
  //       supporter.publicKey.toBuffer(),
  //       validatedProposalPda.toBuffer(),
  //     ],
  //     program.programId
  //   );

  //   // Revenir à try/catch mais vérifier l'erreur client
  //   try {
  //     await program.methods
  //       .supportProposal(supportAmount1)
  //       .accounts({
  //         user: supporter.publicKey,
  //         epoch: tempEpochPda,
  //         proposal: validatedProposalPda,
  //         userSupport: tempUserSupportPda, 
  //         systemProgram: anchor.web3.SystemProgram.programId,
  //       })
  //       .rpc();
  //     expect.fail("Devrait échouer car la proposition est Validated");
  //   } catch (error) {
  //     // Vérifier que l'erreur existe et n'est PAS une AnchorError 
  //     // OU qu'elle contient le message spécifique du client (plus fragile)
  //     expect(error).to.exist;
  //     // expect(error.message).to.contain("Account `epochManagement` not provided."); // Alternative plus fragile
  //     console.log(`- Erreur client attendue capturée lors de la tentative de support sur une proposition Validated. OK.`);
  //   }
  // });

  // it("Échoue lors d'une tentative de support sur une proposition Rejected", async () => {
  //   console.log("\nTest Échec: Support sur proposition Rejected");
  //   console.log("---------------------------------------------");
  //   const rejectedProposalPda = await setupFinalizedProposal('Rejected', 'rej');
  //   const proposalInfo = await program.account.tokenProposal.fetch(rejectedProposalPda);
  //   const epochId = proposalInfo.epochId;
  //   const [tempEpochPda] = PublicKey.findProgramAddressSync( [Buffer.from("epoch"), epochId.toArrayLike(Buffer, "le", 8)], program.programId);

  //   const [tempUserSupportPda] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from("support"),
  //       epochId.toArrayLike(Buffer, "le", 8),
  //       supporter.publicKey.toBuffer(),
  //       rejectedProposalPda.toBuffer(),
  //     ],
  //     program.programId
  //   );

  //   // Revenir à try/catch mais vérifier l'erreur client
  //   try {
  //     await program.methods
  //       .supportProposal(supportAmount1)
  //       .accounts({
  //         user: supporter.publicKey,
  //         epoch: tempEpochPda, 
  //         proposal: rejectedProposalPda,
  //         userSupport: tempUserSupportPda,
  //         systemProgram: anchor.web3.SystemProgram.programId,
  //       })
  //       .rpc();
  //     expect.fail("Devrait échouer car la proposition est Rejected");
  //   } catch (error) {
  //     // Vérifier que l'erreur existe et n'est PAS une AnchorError 
  //     // OU qu'elle contient le message spécifique du client (plus fragile)
  //     expect(error).to.exist;
  //     // expect(error.message).to.contain("Account `epochManagement` not provided."); // Alternative plus fragile
  //     console.log(`- Erreur client attendue capturée lors de la tentative de support sur une proposition Rejected. OK.`);
  //   } 
  // });

}); 