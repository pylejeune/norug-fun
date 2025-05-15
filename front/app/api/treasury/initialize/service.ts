import * as anchor from "@coral-xyz/anchor";
import { getProgram, getAdminKeypair, createAnchorWallet, RPC_ENDPOINT } from "../../shared/utils";
import { PublicKey, Connection } from "@solana/web3.js";

interface TreasuryInitializeResult {
  success: boolean;
  message: string;
}

/**
 * Vérifie si la treasury est déjà initialisée et l'initialise si nécessaire
 * @returns Résultat de l'opération avec statut et message
 */
export async function initializeTreasury(): Promise<TreasuryInitializeResult> {
  const connection = new Connection(RPC_ENDPOINT);
  const adminKeypair = getAdminKeypair();
  const wallet = createAnchorWallet(adminKeypair);
  const program = getProgram(connection, wallet);

  if (!program) {
    throw new Error("Programme non initialisé");
  }

  // Vérifier si la treasury est déjà initialisée
  const [treasuryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    program.programId
  );

  try {
    // Essayer de récupérer le compte treasury
    // Utilisation de fetchNullable avec type any pour contourner l'erreur de type
    const treasuryAccount = await (program.account as any).treasury.fetchNullable(treasuryPDA);
    
    if (treasuryAccount) {
      return { 
        success: true, 
        message: "La treasury est déjà initialisée." 
      };
    }

    // Si on arrive ici, la treasury n'existe pas et doit être initialisée
    const tx = program.methods.initializeTreasury(adminKeypair.publicKey)
      .accounts({
        treasury: treasuryPDA,
        authority: adminKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([adminKeypair]);
    
    await tx.rpc();

    return { 
      success: true, 
      message: "Treasury initialisée avec succès." 
    };
  } catch (error: unknown) {
    console.error("Erreur lors de la vérification/initialisation de la treasury:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { 
      success: false, 
      message: `Erreur lors de l'opération: ${errorMessage}` 
    };
  }
} 