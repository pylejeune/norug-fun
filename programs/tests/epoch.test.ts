console.log("\n\n=====================================");
console.log(">>> Démarrage tests: epoch.test.ts <<<");
console.log("=====================================\n");

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Programs } from "../target/types/programs";
import { PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { generateRandomId, setupTestEnvironment } from "./utils.test";

describe("Tests des époques", () => {
  const { provider, program } = setupTestEnvironment();
  let epochPda: PublicKey;
  const epochIdGeneral = generateRandomId();


  it("Démarre une nouvelle epoch", async () => {
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

    console.log("\n Creation epoch");
    console.log("-------------------------\n");
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

  it("Échoue si la plage de temps de l'époque est invalide", async () => {
    const epochId = generateRandomId();
    const startTime = new anchor.BN(Math.floor(Date.now() / 1000));
    const endTime = new anchor.BN(startTime.toNumber() - 3600); // 1 heure avant startTime

    [epochPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch"), epochId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    console.log("\nTest epoch mauvais endTime:");
    console.log("-------------------------\n");
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

    console.log("\n Test Epoch account non existant");
    console.log("-------------------------\n");

    try {
      await program.account.epochManagement.fetch(nonExistentEpochPda);
      expect.fail("La requête aurait dû échouer car l'époque n'existe pas");
    } catch (error) {
      console.log("Erreur attendue:", error.toString());
      expect(error.toString()).to.include("Account does not exist");
    }
  });

  it("Affiche la liste des époques actives", async () => {
    const allEpochs = await program.account.epochManagement.all();
    const activeEpochs = allEpochs.filter(epoch => 
      JSON.stringify(epoch.account.status) === JSON.stringify({ active: {} })
    );
    
    console.log("\nListe des époques actives:");
    console.log("-------------------------\n");
    
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
        
        // Vérifier si l'époque est actuellement active
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
    
    expect(activeEpochs.length).to.be.greaterThan(0);
    activeEpochs.forEach(epoch => {
      expect(JSON.stringify(epoch.account.status)).to.equal(JSON.stringify({ active: {} }));
    });
  });

  it("Utilise get_epoch_state pour afficher une époque existante en fonction de son ID", async () => {
    // Créer une nouvelle époque pour ce test
    const newEpochId = epochIdGeneral;

    const [newEpochPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch"), newEpochId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    console.log("\n Etat d'une epoch par son ID");
    console.log("-------------------------\n");
    
    console.log(`\népoque existante avec l'ID: ${newEpochId.toString()}`);
    
    // Utiliser la fonction get_epoch_state pour récupérer l'état de l'époque
    try {
      await program.methods
        .getEpochState(newEpochId)
        .accounts({
          epochManagement: newEpochPda,
        })
        .rpc();
      
      
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

  it("Clôture une époque existante avec end_epoch", async () => {
    // Créer une nouvelle époque pour ce test
    const newEpochId = generateRandomId();
    const startTime = new anchor.BN(Math.floor(Date.now() / 1000));
    const endTime = new anchor.BN(startTime.toNumber() + 86400); // 1 jour

    const [newEpochPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch"), newEpochId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    console.log("\n Cloture epoch");
    console.log("-------------------------\n");

    // Créer l'époque
    await program.methods
      .startEpoch(newEpochId, startTime, endTime)
      .accounts({
        authority: provider.wallet.publicKey,
        epochManagement: newEpochPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log(`\nÉpoque créée avec l'ID: ${newEpochId.toString()}`);
    
    // Vérifier que l'époque est active
    let epoch = await program.account.epochManagement.fetch(newEpochPda);
    expect(JSON.stringify(epoch.status)).to.equal(JSON.stringify({ active: {} }));
    
    // Clôturer l'époque
    await program.methods
      .endEpoch(newEpochId)
      .accounts({
        epochManagement: newEpochPda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log("Époque clôturée avec succès");
    
    // Vérifier que l'époque est maintenant closed
    epoch = await program.account.epochManagement.fetch(newEpochPda);
    console.log(`- Nouveau statut: ${JSON.stringify(epoch.status)}`);
    expect(JSON.stringify(epoch.status)).to.equal(JSON.stringify({ closed: {} }));
  });

  it("Échoue si on essaie de clôturer une époque déjà closed", async () => {
    // Récupérer une époque inactive
    const allEpochs = await program.account.epochManagement.all();
    const inactiveEpochs = allEpochs.filter(epoch => 
      JSON.stringify(epoch.account.status) === JSON.stringify({ closed: {} })
    );

    expect(inactiveEpochs.length).to.be.greaterThan(0, "Aucune époque closed trouvée");

    // Utiliser la première époque inactive
    const inactiveEpoch = inactiveEpochs[0];
    const inactiveEpochId = inactiveEpoch.account.epochId;
    
    // Trouver le PDA de l'époque inactive
    const [inactiveEpochPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch"), inactiveEpochId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    
    console.log(`\nTest de clôture d'une époque déjà inactive (ID: ${inactiveEpochId.toString()})`);
    
    // Essayer de clôturer l'époque inactive
    try {
      await program.methods
        .endEpoch(inactiveEpochId)
        .accounts({
          epochManagement: inactiveEpochPda,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      expect.fail("La transaction aurait dû échouer");
    } catch (error) {
      console.log("Erreur attendue:", error.toString());
      expect(error.toString()).to.include("EpochAlreadyInactive");
    }
  });

  it("Affiche la liste des époques avec un statut closed", async () => {
    const allEpochs = await program.account.epochManagement.all();
    const closedEpochs = allEpochs.filter(epoch => 
      JSON.stringify(epoch.account.status) === JSON.stringify({ closed: {} })
    );
    
    console.log("\nListe des époques avec statut closed:");
    console.log("----------------------------------");
    
    if (closedEpochs.length === 0) {
      console.log("Aucune époque avec statut closed trouvée");
    } else {
      closedEpochs.forEach((epoch, index) => {
        const account = epoch.account;
        console.log(`\nÉpoque closed #${index + 1}:`);
        console.log(`- Adresse: ${epoch.publicKey.toString()}`);
        console.log(`- ID: ${account.epochId.toString()}`);
        console.log(`- Start Time: ${new Date(account.startTime.toNumber() * 1000).toISOString()}`);
        console.log(`- End Time: ${new Date(account.endTime.toNumber() * 1000).toISOString()}`);
        
        // Vérifier si l'époque est actuellement active (ne devrait pas l'être)
        const currentTime = Math.floor(Date.now() / 1000);
        const isCurrentlyActive = currentTime >= account.startTime.toNumber() && 
                                currentTime <= account.endTime.toNumber();
        console.log(`- Actuellement active: ${isCurrentlyActive}`);
        
        // Afficher le temps écoulé depuis la fin
        const timeElapsed = currentTime - account.endTime.toNumber();
        const hoursElapsed = Math.floor(timeElapsed / 3600);
        const minutesElapsed = Math.floor((timeElapsed % 3600) / 60);
        console.log(`- Temps écoulé depuis la fin: ${hoursElapsed}h ${minutesElapsed}m`);
      });
    }
    
    // Vérifier que toutes les époques affichées ont bien le statut closed
    closedEpochs.forEach(epoch => {
      expect(JSON.stringify(epoch.account.status)).to.equal(JSON.stringify({ closed: {} }));
    });
  });

}); 