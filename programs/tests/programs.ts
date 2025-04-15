import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Programs } from "../target/types/programs";
import { PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { randomBytes } from "crypto";

describe("programs", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Programs as Program<Programs>;
  
  // Variables pour les tests
  let epochPda: PublicKey;
  let proposalPda: PublicKey;
  const tokenName = "noRugToken";
  const tokenSymbol = "NRT";
  const totalSupply = new anchor.BN(1000000);
  const creatorAllocation = 10;
  const lockupPeriod = new anchor.BN(86400); // 1 jour en secondes
 

  // Fonction pour générer un ID aléatoire
  const generateRandomId = () => {
    const buffer = randomBytes(8);
    return new anchor.BN(buffer.toString('hex'), 16);
  };

  const epochIdGeneral = generateRandomId();

  it("Initialise le programme", async () => {
    const tx = await program.methods.initialize().rpc();
    console.log("Transaction signature", tx);
  });

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

    console.log("Test de création de proposition:");
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

  it("Échoue si la plage de temps de l'époque est invalide", async () => {
    const epochId = generateRandomId();
    const startTime = new anchor.BN(Math.floor(Date.now() / 1000));
    const endTime = new anchor.BN(startTime.toNumber() - 3600); // 1 heure avant startTime

    [epochPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch"), epochId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    console.log("Test d'époque invalide:");
    console.log(`- startTime: ${startTime.toString()} (${new Date(startTime.toNumber() * 1000).toISOString()})`);
    console.log(`- endTime: ${endTime.toString()} (${new Date(endTime.toNumber() * 1000).toISOString()})`);
    console.log(`- Différence: ${startTime.toNumber() - endTime.toNumber()} secondes`);

    try {
      await program.methods
        .startEpoch(epochId, startTime, endTime)
        .accounts({
          authority: provider.wallet.publicKey,
          epochManagement: epochPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      expect.fail("La transaction aurait dû échouer");
    } catch (error) {
      console.log("Erreur attendue:", error.toString());
      expect(error.toString()).to.include("InvalidEpochTimeRange");
    }
  });

  it("Échoue si l'époque n'existe pas", async () => {
    const nonExistentEpochId = generateRandomId();
    const [nonExistentEpochPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch"), nonExistentEpochId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    try {
      await program.account.epochManagement.fetch(nonExistentEpochPda);
      expect.fail("La requête aurait dû échouer car l'époque n'existe pas");
    } catch (error) {
      console.log("Erreur attendue:", error.toString());
      expect(error.toString()).to.include("Account does not exist");
    }
  });

  it("Affiche la liste des époques actives", async () => {
    // Récupérer tous les comptes de type EpochManagement
    const allEpochs = await program.account.epochManagement.all();
    
    // Filtrer pour ne garder que les époques actives
    const activeEpochs = allEpochs.filter(epoch => 
      JSON.stringify(epoch.account.status) === JSON.stringify({ active: {} })
    );
    
    console.log("\nListe des époques actives:");
    console.log("-------------------------");
    
    if (activeEpochs.length === 0) {
      console.log("Aucune époque active trouvée");
    } else {
      activeEpochs.forEach((epoch, index) => {
        const account = epoch.account;
        console.log(`\nÉpoque active #${index + 1}:`);
        console.log(`- Adresse: ${epoch.publicKey.toString()}`);
        console.log(`- ID: ${account.epochId.toString()}`);
        console.log(`- Start Time: ${new Date(account.startTime.toNumber() * 1000).toISOString()}`);
        console.log(`- End Time: ${new Date(account.endTime.toNumber() * 1000).toISOString()}`);
        
        // Vérifier si l'époque est actuellement active (temps actuel entre startTime et endTime)
        const currentTime = Math.floor(Date.now() / 1000);
        const isCurrentlyActive = currentTime >= account.startTime.toNumber() && 
                                currentTime <= account.endTime.toNumber();
        console.log(`- Actuellement active: ${isCurrentlyActive}`);
        
        // Afficher le temps restant
        const timeRemaining = account.endTime.toNumber() - currentTime;
        const hoursRemaining = Math.floor(timeRemaining / 3600);
        const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);
        console.log(`- Temps restant: ${hoursRemaining}h ${minutesRemaining}m`);
      });
    }
    
    // Vérifier que nous avons au moins une époque active
    expect(activeEpochs.length).to.be.greaterThan(0);
    
    // Vérifier que toutes les époques affichées sont bien actives
    activeEpochs.forEach(epoch => {
      expect(JSON.stringify(epoch.account.status)).to.equal(JSON.stringify({ active: {} }));
    });
  });

  it("Affiche la liste des propositions de tokens", async () => {
    // Récupérer tous les comptes de type TokenProposal
    const allProposals = await program.account.tokenProposal.all();
    
    console.log("\nListe des propositions de tokens:");
    console.log("-------------------------------");
    
    if (allProposals.length === 0) {
      console.log("Aucune proposition de token trouvée");
    } else {
      allProposals.forEach((proposal, index) => {
        const account = proposal.account;
        console.log(`\nProposition #${index + 1}:`);
        console.log(`- Adresse: ${proposal.publicKey.toString()}`);
        console.log(`- Nom du token: ${account.tokenName}`);
        console.log(`- Symbole: ${account.tokenSymbol}`);
        console.log(`- Supply total: ${account.totalSupply.toString()}`);
        console.log(`- Allocation créateur: ${account.creatorAllocation}%`);
        console.log(`- Allocation supporters: ${account.supporterAllocation}%`);
        console.log(`- SOL levé: ${account.solRaised.toString()} lamports`);
        console.log(`- Nombre de contributeurs: ${account.totalContributions.toString()}`);
        console.log(`- Période de blocage: ${account.lockupPeriod.toString()} secondes`);
        
        // Afficher l'état de la proposition
        console.log(`- État: ${JSON.stringify(account.status)}`);
        
        // Afficher les informations sur l'époque associée
        console.log(`- Époque associée: ${account.epochId.toString()}`);
      });
    }
    
    // Vérifier que nous avons au moins une proposition (celle créée dans les tests précédents)
    expect(allProposals.length).to.be.greaterThan(0);
    
    // Vérifier que toutes les propositions ont des valeurs valides
    allProposals.forEach(proposal => {
      const account = proposal.account;
      expect(account.tokenName).to.be.a("string");
      expect(account.tokenSymbol).to.be.a("string");
      expect(account.totalSupply.toNumber()).to.be.greaterThan(0);
      expect(account.creatorAllocation).to.be.at.least(0);
      expect(account.creatorAllocation).to.be.at.most(10);
      expect(account.supporterAllocation).to.be.at.least(0);
      expect(account.supporterAllocation).to.be.at.most(90);
      expect(account.creatorAllocation + account.supporterAllocation).to.equal(100);
    });
  });


  it("Utilise get_epoch_state pour afficher une époque existante en fonction de son ID", async () => {
    // Créer une nouvelle époque pour ce test
    const newEpochId = epochIdGeneral;

    const [newEpochPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch"), newEpochId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    
    console.log(`\népoque existante avec l'ID: ${newEpochId.toString()}`);
    
    // Utiliser la fonction get_epoch_state pour récupérer l'état de l'époque
    try {
      await program.methods
        .getEpochState(newEpochId)
        .accounts({
          epochManagement: newEpochPda,
        })
        .rpc();
      
      console.log("Fonction get_epoch_state exécutée avec succès");
      
      // Récupérer les informations de l'époque
      const epoch = await program.account.epochManagement.fetch(newEpochPda);
      
      console.log("\nÉtat de l'époque récupéré via get_epoch_state:");
      console.log(`- ID: ${epoch.epochId.toString()}`);
      console.log(`- Start Time: ${new Date(epoch.startTime.toNumber() * 1000).toISOString()}`);
      console.log(`- End Time: ${new Date(epoch.endTime.toNumber() * 1000).toISOString()}`);
      console.log(`- Status: ${JSON.stringify(epoch.status)}`);
      
      // Vérifier que l'ID correspond
      expect(epoch.epochId.toString()).to.equal(newEpochId.toString());
      
      // Vérifier que l'époque a un statut actif
      expect(JSON.stringify(epoch.status)).to.equal(JSON.stringify({ active: {} }));
      
      // Vérifier que l'époque a une durée valide
      expect(epoch.endTime.toNumber()).to.be.greaterThan(epoch.startTime.toNumber());
      
      // Vérifier si l'époque est actuellement active
      const currentTime = Math.floor(Date.now() / 1000);
      const isCurrentlyActive = currentTime >= epoch.startTime.toNumber() && 
                              currentTime <= epoch.endTime.toNumber();
      console.log(`- Actuellement active: ${isCurrentlyActive}`);
      
      // Afficher le temps restant
      const timeRemaining = epoch.endTime.toNumber() - currentTime;
      const hoursRemaining = Math.floor(timeRemaining / 3600);
      const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);
      console.log(`- Temps restant: ${hoursRemaining}h ${minutesRemaining}m`);
      
    } catch (error) {
      console.error("Erreur lors de l'exécution de get_epoch_state:", error);
      throw error;
    }
  });

});
