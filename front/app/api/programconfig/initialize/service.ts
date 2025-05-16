import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { getProgram, getAdminKeypairProgramConfig, createAnchorWallet, RPC_ENDPOINT, SHARED_IDL } from "../../../../lib/utils";

interface ProgramConfigResult {
  success: boolean;
  message: string;
  programConfig?: {
    address: string;
    adminAuthority: string;
    programId: string;
  };
}

/**
 * Vérifie si le ProgramConfig est déjà initialisé et l'initialise si nécessaire
 * @returns Résultat de l'opération avec statut et message
 */
export async function initializeProgramConfig(): Promise<ProgramConfigResult> {
  const connection = new Connection(RPC_ENDPOINT);
  const adminKeypair = getAdminKeypairProgramConfig();
  const wallet = createAnchorWallet(adminKeypair);
  const program = getProgram(connection, SHARED_IDL, wallet);

  if (!program) {
    throw new Error("Programme non initialisé");
  }

  console.log("🔍 Vérification/Initialisation du ProgramConfig...");

  // Générer le PDA pour le compte ProgramConfig
  const [programConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  console.log(`🔑 PDA du ProgramConfig calculé: ${programConfigPDA.toString()}`);

  try {
    // Essayer de récupérer le compte ProgramConfig existant
    let programConfigAccount = null;
    
    try {
      if (program.account && typeof program.account === 'object') {
        // Vérifier si programConfig existe
        if ((program.account as any).programConfig) {
          programConfigAccount = await (program.account as any).programConfig.fetchNullable(programConfigPDA);
          console.log("ProgramConfig trouvé:", programConfigAccount ? "Oui" : "Non");
        } else {
          console.log("Le compte programConfig n'existe pas dans program.account");
        }
      }
    } catch (fetchError) {
      console.error("Erreur lors de la récupération du compte ProgramConfig:", fetchError);
    }
    
    // Vérifier si le compte existe indépendamment de l'IDL
    const accountInfo = await connection.getAccountInfo(programConfigPDA);
    console.log("Compte ProgramConfig sur la blockchain:", accountInfo ? "Existe" : "N'existe pas");
    
    if (programConfigAccount) {
      // Le compte existe déjà, retourner ses informations
      return { 
        success: true, 
        message: "Le ProgramConfig est déjà initialisé.",
        programConfig: {
          address: programConfigPDA.toString(),
          adminAuthority: programConfigAccount.adminAuthority.toString(),
          programId: program.programId.toString()
        }
      };
    }

    // Si on arrive ici, le ProgramConfig n'existe pas et doit être initialisé
    console.log("🔧 Initialisation du ProgramConfig...");
    
    const tx = await (program as any).methods.initializeProgramConfig(adminKeypair.publicKey)
      .accounts({
        programConfig: programConfigPDA,
        authority: adminKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Transaction:", tx);

    // Récupérer les informations du ProgramConfig après initialisation
    let newProgramConfigAccount = null;
    try {
      if ((program.account as any).programConfig) {
        newProgramConfigAccount = await (program.account as any).programConfig.fetch(programConfigPDA);
        console.log("✅ ProgramConfig initialisé et récupéré avec succès");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du ProgramConfig après initialisation:", error);
    }

    if (newProgramConfigAccount) {
      return { 
        success: true, 
        message: "ProgramConfig initialisé avec succès.",
        programConfig: {
          address: programConfigPDA.toString(),
          adminAuthority: newProgramConfigAccount.adminAuthority.toString(),
          programId: program.programId.toString()
        }
      };
    } else {
      return { 
        success: true, 
        message: "ProgramConfig initialisé avec succès, mais les détails ne sont pas disponibles."
      };
    }
  } catch (error: unknown) {
    console.error("Erreur lors de la vérification/initialisation du ProgramConfig:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { 
      success: false, 
      message: `Erreur lors de l'opération: ${errorMessage}` 
    };
  }
} 