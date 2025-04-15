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
    const allEpochs = await program.account.epochManagement.all();
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
  
}); 