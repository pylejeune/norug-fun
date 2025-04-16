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
    console.log("Valeurs attendues pour la proposition:");
    console.log(`- tokenName: ${tokenName}`);
    console.log(`- tokenSymbol: ${tokenSymbol}`);
    console.log(`- totalSupply: ${totalSupply.toString()}`);
    console.log(`- creatorAllocation: ${creatorAllocation}`);
    console.log(`- supporterAllocation: ${100 - creatorAllocation}`);
    console.log(`- solRaised: 0`);
    console.log(`- totalContributions: 0`);
    console.log(`- lockupPeriod: ${lockupPeriod.toString()}`);
    
    console.log("Valeurs réelles de la proposition:");
    console.log(`- tokenName: ${proposal.tokenName}`);
    console.log(`- tokenSymbol: ${proposal.tokenSymbol}`);
    console.log(`- totalSupply: ${proposal.totalSupply.toString()}`);
    console.log(`- creatorAllocation: ${proposal.creatorAllocation}`);
    console.log(`- supporterAllocation: ${proposal.supporterAllocation}`);
    console.log(`- solRaised: ${proposal.solRaised.toString()}`);
    console.log(`- totalContributions: ${proposal.totalContributions.toString()}`);
    console.log(`- lockupPeriod: ${proposal.lockupPeriod.toString()}`);
    
    expect(proposal.tokenName).to.equal(tokenName);
    expect(proposal.tokenSymbol).to.equal(tokenSymbol);
    expect(proposal.totalSupply.toString()).to.equal(totalSupply.toString());
    expect(proposal.creatorAllocation).to.equal(creatorAllocation);
    expect(proposal.supporterAllocation).to.equal(100 - creatorAllocation);
    expect(proposal.solRaised.toString()).to.equal("0");
    expect(proposal.totalContributions.toString()).to.equal("0");
    expect(proposal.lockupPeriod.toString()).to.equal(lockupPeriod.toString());
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
      console.log(`Statut: ${JSON.stringify(proposal.status)}`);

      // Vérifier que c'est bien la proposition que nous cherchons
      expect(proposal.epochId.toString()).to.equal(targetEpochId.toString());
      expect(proposal.creator.toString()).to.equal(targetCreator.toString());
      expect(proposal.tokenName).to.equal(targetTokenName);

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

  it("Met à jour une proposition de token existante", async () => {
    // Récupérer l'époque pour obtenir l'epoch_id correct
    const epoch = await program.account.epochManagement.fetch(epochPda);
    const epochId = epoch.epochId;
    
    // Construire le PDA de la proposition
    [proposalPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        provider.wallet.publicKey.toBuffer(),
        epochId.toArrayLike(Buffer, "le", 8),
        Buffer.from(tokenName),
      ],
      program.programId
    );

    console.log("\nTest de mise à jour de proposition:");
    console.log("----------------------------------\n");
    console.log(`proposalPda: ${proposalPda.toString()}`);
    console.log(`- epochId utilisé: ${epochId.toString()}`);

    // Nouvelles valeurs pour la mise à jour
    const newTokenName = "noRugTokenUpdated";
    const newTokenSymbol = "NRTU";
    const newTotalSupply = new anchor.BN(2000000);
    const newCreatorAllocation = 8;
    const newLockupPeriod = new anchor.BN(172800); // 2 jours en secondes

    // Mettre à jour la proposition
    const tx = await program.methods
      .updateProposal(
        newTokenName,
        newTokenSymbol,
        newTotalSupply,
        newCreatorAllocation,
        newLockupPeriod
      )
      .accounts({
        proposal: proposalPda,
        creator: provider.wallet.publicKey,
        epoch: epochPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction signature", tx);

    // Vérifier que la proposition a été mise à jour correctement
    const updatedProposal = await program.account.tokenProposal.fetch(proposalPda);
    console.log("Valeurs attendues pour la proposition mise à jour:");
    console.log(`- tokenName: ${newTokenName}`);
    console.log(`- tokenSymbol: ${newTokenSymbol}`);
    console.log(`- totalSupply: ${newTotalSupply.toString()}`);
    console.log(`- creatorAllocation: ${newCreatorAllocation}`);
    console.log(`- supporterAllocation: ${100 - newCreatorAllocation}`);
    console.log(`- lockupPeriod: ${newLockupPeriod.toString()}`);
    
    console.log("Valeurs réelles de la proposition mise à jour:");
    console.log(`- tokenName: ${updatedProposal.tokenName}`);
    console.log(`- tokenSymbol: ${updatedProposal.tokenSymbol}`);
    console.log(`- totalSupply: ${updatedProposal.totalSupply.toString()}`);
    console.log(`- creatorAllocation: ${updatedProposal.creatorAllocation}`);
    console.log(`- supporterAllocation: ${updatedProposal.supporterAllocation}`);
    console.log(`- lockupPeriod: ${updatedProposal.lockupPeriod.toString()}`);
    
    expect(updatedProposal.tokenName).to.equal(newTokenName);
    expect(updatedProposal.tokenSymbol).to.equal(newTokenSymbol);
    expect(updatedProposal.totalSupply.toString()).to.equal(newTotalSupply.toString());
    expect(updatedProposal.creatorAllocation).to.equal(newCreatorAllocation);
    expect(updatedProposal.supporterAllocation).to.equal(100 - newCreatorAllocation);
    expect(updatedProposal.lockupPeriod.toString()).to.equal(newLockupPeriod.toString());
  });

  it("Tente de mettre à jour une proposition avec un créateur non autorisé", async () => {
    // Créer un nouveau wallet pour simuler un utilisateur non autorisé
    const unauthorizedWallet = anchor.web3.Keypair.generate();
    
    // Récupérer l'époque pour obtenir l'epoch_id correct
    const epoch = await program.account.epochManagement.fetch(epochPda);
    const epochId = epoch.epochId;
    
    // Construire le PDA de la proposition
    [proposalPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        provider.wallet.publicKey.toBuffer(),
        epochId.toArrayLike(Buffer, "le", 8),
        Buffer.from(tokenName),
      ],
      program.programId
    );

    console.log("\nTest de mise à jour non autorisée:");
    console.log("----------------------------------\n");
    console.log(`proposalPda: ${proposalPda.toString()}`);
    console.log(`- Créateur non autorisé: ${unauthorizedWallet.publicKey.toString()}`);

    // Nouvelles valeurs pour la mise à jour
    const newTokenName = "noRugTokenUnauthorized";
    const newTokenSymbol = "NRTU";
    const newTotalSupply = new anchor.BN(3000000);
    const newCreatorAllocation = 5;
    const newLockupPeriod = new anchor.BN(259200); // 3 jours en secondes

    try {
      // Tenter de mettre à jour la proposition avec un créateur non autorisé
      await program.methods
        .updateProposal(
          newTokenName,
          newTokenSymbol,
          newTotalSupply,
          newCreatorAllocation,
          newLockupPeriod
        )
        .accounts({
          proposal: proposalPda,
          creator: unauthorizedWallet.publicKey,
          epoch: epochPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([unauthorizedWallet])
        .rpc();
      
      // Si nous arrivons ici, le test a échoué car l'erreur attendue n'a pas été levée
      expect.fail("La mise à jour aurait dû échouer avec un créateur non autorisé");
    } catch (error) {
      console.log("Erreur attendue:", error.message);
      expect(error.message).to.include("Le créateur n'est pas autorisé à effectuer cette action");
    }
  });

  it("Tente de mettre à jour une proposition avec une allocation de créateur trop élevée", async () => {
    // Récupérer l'époque pour obtenir l'epoch_id correct
    const epoch = await program.account.epochManagement.fetch(epochPda);
    const epochId = epoch.epochId;
    
    // Construire le PDA de la proposition
    [proposalPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        provider.wallet.publicKey.toBuffer(),
        epochId.toArrayLike(Buffer, "le", 8),
        Buffer.from(tokenName),
      ],
      program.programId
    );

    console.log("\nTest de mise à jour avec allocation trop élevée:");
    console.log("----------------------------------\n");
    console.log(`proposalPda: ${proposalPda.toString()}`);

    // Nouvelles valeurs pour la mise à jour avec une allocation trop élevée
    const newTokenName = "noRugTokenHighAllocation";
    const newTokenSymbol = "NRTH";
    const newTotalSupply = new anchor.BN(4000000);
    const newCreatorAllocation = 15; // Allocation supérieure à 10%
    const newLockupPeriod = new anchor.BN(345600); // 4 jours en secondes

    try {
      // Tenter de mettre à jour la proposition avec une allocation trop élevée
      await program.methods
        .updateProposal(
          newTokenName,
          newTokenSymbol,
          newTotalSupply,
          newCreatorAllocation,
          newLockupPeriod
        )
        .accounts({
          proposal: proposalPda,
          creator: provider.wallet.publicKey,
          epoch: epochPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      // Si nous arrivons ici, le test a échoué car l'erreur attendue n'a pas été levée
      expect.fail("La mise à jour aurait dû échouer avec une allocation trop élevée");
    } catch (error) {
      console.log("Erreur attendue:", error.message);
      expect(error.message).to.include("L'allocation du créateur ne peut pas dépasser 10%");
    }
  });

}); 