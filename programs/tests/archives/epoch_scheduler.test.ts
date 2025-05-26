import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Programs } from "../target/types/programs";
import { BN } from "@coral-xyz/anchor";
import { expect } from "chai";

// Seed fixe pour l'autorité admin des tests (COHÉRENT AVEC LES AUTRES FICHIERS)
const ADMIN_SEED = Uint8Array.from([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]);

describe("epoch_scheduler", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Programs as Program<Programs>;
  let adminAuthority: Keypair; // MODIFIÉ: Sera Keypair.fromSeed(ADMIN_SEED)
  let programConfigPda: PublicKey;

  before(async () => {
    adminAuthority = Keypair.fromSeed(ADMIN_SEED); // MODIFIÉ: Utiliser la seed
    const connection = provider.connection;

    // Financer adminAuthority si nécessaire
    const adminInfo = await connection.getAccountInfo(adminAuthority.publicKey);
    if (!adminInfo || adminInfo.lamports < 2 * anchor.web3.LAMPORTS_PER_SOL) {
      const sig = await connection.requestAirdrop(adminAuthority.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, "confirmed");
      console.log(`Admin authority ${adminAuthority.publicKey.toBase58()} (from seed) funded in epoch_scheduler.`);
    } else {
      console.log(`Admin authority ${adminAuthority.publicKey.toBase58()} (from seed) already funded in epoch_scheduler.`);
    }

    // Dériver le PDA pour ProgramConfig
    [programConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    // Initialiser ProgramConfig (gestion de l'initialisation multiple)
    try {
      await program.methods
        .initializeProgramConfig(adminAuthority.publicKey)
        .accounts({
          programConfig: programConfigPda,
          authority: adminAuthority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([adminAuthority]) // MODIFIÉ: adminAuthority (Keypair) est le signataire
        .rpc();
      console.log("ProgramConfig initialized in epoch_scheduler.test.ts");
    } catch (error) {
      const errorString = (error as Error).toString();
      if (errorString.includes("already in use") || errorString.includes("custom program error: 0x0")) {
        console.log("ProgramConfig already initialized in epoch_scheduler.test.ts.");
      } else {
        throw error;
      }
    }
  });

  it("Vérifie et ferme les époques actives", async () => {
    // Créer une nouvelle époque pour le test
    const epochId = new BN(Math.floor(Math.random() * 1000000));
    const startTime = new BN(Math.floor(Date.now() / 1000) - 60); // Commence il y a 1 minute
    const endTime = new BN(Math.floor(Date.now() / 1000) - 30); // Se termine il y a 30 secondes

    // Générer le PDA pour l'époque
    const [epochManagementPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch"), epochId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Créer l'époque
    await program.methods
      .startEpoch(epochId, startTime, endTime)
      .accounts({
        authority: adminAuthority.publicKey, // Utiliser adminAuthority.publicKey
        programConfig: programConfigPda,
        epochManagement: epochManagementPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .signers([adminAuthority]) // MODIFIÉ: adminAuthority (Keypair) est le signataire
      .rpc();

    // Vérifier que l'époque est active
    let epoch = await program.account.epochManagement.fetch(epochManagementPDA);
    expect(JSON.stringify(epoch.status)).to.equal(JSON.stringify({ active: {} }));

    // Simuler la fermeture de l'époque
    await program.methods
      .endEpoch(epochId)
      .accounts({
        authority: adminAuthority.publicKey, // Utiliser adminAuthority.publicKey
        programConfig: programConfigPda,
        epochManagement: epochManagementPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .signers([adminAuthority]) // MODIFIÉ: adminAuthority (Keypair) est le signataire
      .rpc();

    // Vérifier que l'époque est maintenant fermée
    epoch = await program.account.epochManagement.fetch(epochManagementPDA);
    expect(JSON.stringify(epoch.status)).to.equal(JSON.stringify({ closed: {} }));
  });
}); 