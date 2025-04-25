console.log("\n\n=====================================");
console.log(">>> Démarrage tests: proposal.test.ts <<<");
console.log("=====================================\n");

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Programs } from "../target/types/programs";
import { PublicKey } from "@solana/web3.js";
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

  // --- Nouveau test pour support_proposal ---
  it("Supporte une proposition existante", async () => {
    // Utiliser l'epoch et la proposition créées dans les tests précédents
    // `epochPda` et `proposalPda` devraient être disponibles depuis les tests précédents
    expect(epochPda).to.exist;
    expect(proposalPda).to.exist;

    const supporter = provider.wallet; // Utiliser le wallet du provider comme supporter
    const supportAmount = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.1); // Supporter avec 0.1 SOL

    // Récupérer l'état initial de la proposition
    const proposalBefore = await program.account.tokenProposal.fetch(proposalPda);
    const initialSolRaised = proposalBefore.solRaised;
    const initialContributions = proposalBefore.totalContributions;

    // Récupérer les soldes initiaux
    const supporterBalanceBefore = await provider.connection.getBalance(supporter.publicKey);
    const proposalBalanceBefore = await provider.connection.getBalance(proposalPda);

    // Calculer le PDA pour le compte UserProposalSupport
    const [userSupportPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("support"),
        proposalBefore.epochId.toArrayLike(Buffer, "le", 8), // Utiliser l'epochId de la proposition
        supporter.publicKey.toBuffer(),
        proposalPda.toBuffer(),
      ],
      program.programId
    );

    console.log("\nTest de support de proposition:");
    console.log("----------------------------------\n");
    console.log(`- Supporter: ${supporter.publicKey.toString()}`);
    console.log(`- Proposition PDA: ${proposalPda.toString()}`);
    console.log(`- Epoch PDA: ${epochPda.toString()}`);
    console.log(`- Epoch ID: ${proposalBefore.epochId.toString()}`);
    console.log(`- User Support PDA: ${userSupportPda.toString()}`);
    console.log(`- Montant du support (lamports): ${supportAmount.toString()}`);
    console.log(`- SOL levés avant: ${initialSolRaised.toString()}`);
    console.log(`- Contributions avant: ${initialContributions.toString()}`);

    // Appeler l'instruction supportProposal
    const tx = await program.methods
      .supportProposal(supportAmount)
      .accounts({
        user: supporter.publicKey,
        epoch: epochPda, // Le compte de l'epoch active
        proposal: proposalPda, // Le compte de la proposition active
        userSupport: userSupportPda, // Le compte à créer
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction signature", tx);

    // --- Vérifications --- 

    // 1. Vérifier le compte UserProposalSupport créé
    const userSupportAccount = await program.account.userProposalSupport.fetch(userSupportPda);
    expect(userSupportAccount.epochId.toString()).to.equal(proposalBefore.epochId.toString());
    expect(userSupportAccount.user.toString()).to.equal(supporter.publicKey.toString());
    expect(userSupportAccount.proposal.toString()).to.equal(proposalPda.toString());
    expect(userSupportAccount.amount.toString()).to.equal(supportAmount.toString());
    console.log("Compte UserProposalSupport vérifié.");

    // 2. Vérifier la mise à jour de la proposition
    const proposalAfter = await program.account.tokenProposal.fetch(proposalPda);
    const expectedSolRaised = initialSolRaised.add(supportAmount);
    const expectedContributions = initialContributions.add(new anchor.BN(1));
    expect(proposalAfter.solRaised.toString()).to.equal(expectedSolRaised.toString());
    expect(proposalAfter.totalContributions.toString()).to.equal(expectedContributions.toString());
    console.log(`SOL levés après: ${proposalAfter.solRaised.toString()} (attendu: ${expectedSolRaised.toString()})`);
    console.log(`Contributions après: ${proposalAfter.totalContributions.toString()} (attendu: ${expectedContributions.toString()})`);

    // 3. Vérifier les soldes (approximatif pour le supporter à cause des frais)
    const supporterBalanceAfter = await provider.connection.getBalance(supporter.publicKey);
    const proposalBalanceAfter = await provider.connection.getBalance(proposalPda);
    expect(proposalBalanceAfter).to.equal(proposalBalanceBefore + supportAmount.toNumber()); // Le compte proposal reçoit exactement le montant
    expect(supporterBalanceAfter).to.be.lessThan(supporterBalanceBefore - supportAmount.toNumber()); // Le supporter paie le montant + frais
    console.log("Soldes SOL vérifiés.");
  });

  // --- Nouveau test pour supporter une deuxième fois --- 
  it("Supporte une proposition une deuxième fois", async () => {
    // Utiliser les mêmes epoch, proposition et supporter que le test précédent
    expect(epochPda).to.exist;
    expect(proposalPda).to.exist;

    const supporter = provider.wallet; // Le même supporter
    const supportAmount2 = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.05); // Nouveau montant: 0.05 SOL

    // Récupérer l'état APRÈS le premier support (qui est l'état AVANT le second)
    const proposalBeforeSecondSupport = await program.account.tokenProposal.fetch(proposalPda);
    const initialSolRaised = proposalBeforeSecondSupport.solRaised;
    const initialContributions = proposalBeforeSecondSupport.totalContributions; // Devrait être 1

    // Calculer le PDA pour le compte UserProposalSupport (c'est le même)
    const [userSupportPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("support"),
        proposalBeforeSecondSupport.epochId.toArrayLike(Buffer, "le", 8),
        supporter.publicKey.toBuffer(),
        proposalPda.toBuffer(),
      ],
      program.programId
    );

    const userSupportBeforeSecond = await program.account.userProposalSupport.fetch(userSupportPda);
    const initialUserSupportAmount = userSupportBeforeSecond.amount; // Montant après le 1er support

    console.log("\nTest de support de proposition (deuxième fois):");
    console.log("------------------------------------------------");
    console.log(`- Supporter: ${supporter.publicKey.toString()}`);
    console.log(`- Proposition PDA: ${proposalPda.toString()}`);
    console.log(`- User Support PDA: ${userSupportPda.toString()}`);
    console.log(`- Montant du 2ème support (lamports): ${supportAmount2.toString()}`);
    console.log(`- SOL levés avant 2ème: ${initialSolRaised.toString()}`);
    console.log(`- Contributions avant 2ème: ${initialContributions.toString()} (attendu: 1)`);
    console.log(`- Montant UserSupport avant 2ème: ${initialUserSupportAmount.toString()}`);

    // Appeler l'instruction supportProposal à nouveau
    const tx = await program.methods
      .supportProposal(supportAmount2) // Avec le nouveau montant
      .accounts({
        user: supporter.publicKey,
        epoch: epochPda, 
        proposal: proposalPda, 
        userSupport: userSupportPda, // Le même compte UserProposalSupport
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction signature (2ème support)", tx);

    // --- Vérifications --- 

    // 1. Vérifier la mise à jour du compte UserProposalSupport
    const userSupportAfterSecond = await program.account.userProposalSupport.fetch(userSupportPda);
    const expectedUserSupportAmount = initialUserSupportAmount.add(supportAmount2);
    expect(userSupportAfterSecond.amount.toString()).to.equal(expectedUserSupportAmount.toString());
    console.log(`Montant UserSupport après 2ème: ${userSupportAfterSecond.amount.toString()} (attendu: ${expectedUserSupportAmount.toString()})`);

    // 2. Vérifier la mise à jour de la proposition
    const proposalAfterSecondSupport = await program.account.tokenProposal.fetch(proposalPda);
    const expectedSolRaised = initialSolRaised.add(supportAmount2);
    // Les contributions ne doivent PAS augmenter car c'est le même supporter
    const expectedContributions = initialContributions; 
    expect(proposalAfterSecondSupport.solRaised.toString()).to.equal(expectedSolRaised.toString());
    expect(proposalAfterSecondSupport.totalContributions.toString()).to.equal(expectedContributions.toString()); 
    console.log(`SOL levés après 2ème: ${proposalAfterSecondSupport.solRaised.toString()} (attendu: ${expectedSolRaised.toString()})`);
    console.log(`Contributions après 2ème: ${proposalAfterSecondSupport.totalContributions.toString()} (attendu: ${expectedContributions.toString()})`); // Doit rester à 1

    // 3. Pas besoin de revérifier les soldes SOL en détail, mais s'assurer que ça a fonctionné.
    console.log("Vérifications du 2ème support terminées.");
  });

}); 