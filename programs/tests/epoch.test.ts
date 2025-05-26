console.log("\n\n=====================================");
console.log(">>> Démarrage tests: epoch.test.ts <<<");
console.log("=====================================\n");

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Programs } from "../target/types/programs";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import { generateRandomId, setupTestEnvironment } from "./utils.test";

// Seed fixe pour l'autorité admin des tests
const ADMIN_SEED = Uint8Array.from([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]);

describe("Tests des époques", () => {
  const { provider, program } = setupTestEnvironment();
  let epochPda: PublicKey;
  let adminAuthority: Keypair;
  let programConfigPda: PublicKey;

  before(async () => {
    adminAuthority = Keypair.fromSeed(ADMIN_SEED);
    const adminInfo = await provider.connection.getAccountInfo(adminAuthority.publicKey);
    if (!adminInfo || adminInfo.lamports < 2 * LAMPORTS_PER_SOL) {
      const sig = await provider.connection.requestAirdrop(adminAuthority.publicKey, 2 * LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(sig, "confirmed");
    }
    
    [programConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    try {
      await program.methods
        .initializeProgramConfig(adminAuthority.publicKey)
        .accounts({
          programConfig: programConfigPda,
          authority: adminAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([adminAuthority])
        .rpc();
      console.log("ProgramConfig initialized in epoch.test.ts.");
    } catch (error) {
      const errorString = (error as Error).toString();
      if (errorString.includes("already in use") || errorString.includes("custom program error: 0x0")) {
        console.log("ProgramConfig already initialized in epoch.test.ts.");
      } else {
        throw error;
      }
    }
  });

  it("Démarre une nouvelle epoch", async () => {
    const epochId = generateRandomId();
    const startTime = new anchor.BN(Math.floor(Date.now() / 1000));
    const endTime = new anchor.BN(startTime.toNumber() + 1); // 1 jour

    [epochPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch"), epochId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .startEpoch(epochId, startTime, endTime)
      .accounts({
        authority: adminAuthority.publicKey,
        programConfig: programConfigPda,
        epochManagement: epochPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .signers([adminAuthority])
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
          authority: adminAuthority.publicKey,
          programConfig: programConfigPda,
          epochManagement: epochPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([adminAuthority])
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
        authority: adminAuthority.publicKey,
        programConfig: programConfigPda,
        epochManagement: newEpochPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .signers([adminAuthority])
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
        authority: adminAuthority.publicKey,
        programConfig: programConfigPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .signers([adminAuthority])
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
          authority: adminAuthority.publicKey,
          programConfig: programConfigPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([adminAuthority])
        .rpc();
      
      expect.fail("La transaction aurait dû échouer");
    } catch (error) {
      console.log("Erreur attendue:", error.toString());
      expect(error.toString()).to.include("EpochAlreadyInactive");
    }
  });

}); 