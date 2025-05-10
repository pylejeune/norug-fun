import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Programs } from "../target/types/programs";
import { BN } from "@coral-xyz/anchor";
import { expect } from "chai";

describe("epoch_scheduler", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Programs as Program<Programs>;

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
        authority: provider.wallet.publicKey,
        epochManagement: epochManagementPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Vérifier que l'époque est active
    let epoch = await program.account.epochManagement.fetch(epochManagementPDA);
    expect(JSON.stringify(epoch.status)).to.equal(JSON.stringify({ active: {} }));

    // Simuler la fermeture de l'époque
    await program.methods
      .endEpoch(epochId)
      .accounts({
        epochManagement: epochManagementPDA,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Vérifier que l'époque est maintenant fermée
    epoch = await program.account.epochManagement.fetch(epochManagementPDA);
    expect(JSON.stringify(epoch.status)).to.equal(JSON.stringify({ closed: {} }));
  });
}); 