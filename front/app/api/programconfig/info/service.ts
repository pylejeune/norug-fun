import { PublicKey, Connection } from "@solana/web3.js";
import { getProgram, getAdminKeypair, createAnchorWallet, RPC_ENDPOINT } from "../../cron/shared/utils";

interface ProgramConfigInfo {
  success: boolean;
  message: string;
  programConfig?: {
    address: string;
    adminAuthority: string;
    programId: string;
    exists: boolean;
  };
}

/**
 * Récupère les informations du ProgramConfig
 * @returns Résultat de l'opération avec les informations du ProgramConfig
 */
export async function getProgramConfigInfo(): Promise<ProgramConfigInfo> {
  const connection = new Connection(RPC_ENDPOINT);
  const adminKeypair = getAdminKeypair();
  const wallet = createAnchorWallet(adminKeypair);
  const program = getProgram(connection, wallet);

  if (!program) {
    throw new Error("Programme non initialisé");
  }

  console.log("🔍 Récupération des informations du ProgramConfig...");

  // Générer le PDA pour le compte ProgramConfig
  const [programConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  console.log(`🔑 PDA du ProgramConfig: ${programConfigPDA.toString()}`);

  try {
    // Récupérer le compte ProgramConfig
    let programConfigAccount = null;
    let exists = false;
    
    try {
      if (program.account && typeof program.account === 'object') {
        // Vérifier si programConfig existe dans le program
        if ((program.account as any).programConfig) {
          programConfigAccount = await (program.account as any).programConfig.fetchNullable(programConfigPDA);
          exists = !!programConfigAccount;
          console.log("ProgramConfig trouvé:", exists ? "Oui" : "Non");
        } else {
          console.log("Le compte programConfig n'existe pas dans program.account");
        }
      }
    } catch (fetchError) {
      console.error("Erreur lors de la récupération du compte ProgramConfig:", fetchError);
    }
    
    // Vérifier si le compte existe sur la blockchain
    const accountInfo = await connection.getAccountInfo(programConfigPDA);
    exists = exists || !!accountInfo;
    console.log("Compte ProgramConfig sur la blockchain:", accountInfo ? "Existe" : "N'existe pas");
    
    if (programConfigAccount) {
      // Retourner les informations du ProgramConfig
      return { 
        success: true, 
        message: "Informations du ProgramConfig récupérées avec succès.",
        programConfig: {
          address: programConfigPDA.toString(),
          adminAuthority: programConfigAccount.adminAuthority.toString(),
          programId: program.programId.toString(),
          exists: true
        }
      };
    } else {
      // Le compte n'existe pas ou ne peut pas être récupéré
      return {
        success: true,
        message: "Le ProgramConfig n'est pas initialisé ou n'est pas accessible.",
        programConfig: {
          address: programConfigPDA.toString(),
          adminAuthority: adminKeypair.publicKey.toString(), // Utilisation de la clé admin actuelle
          programId: program.programId.toString(),
          exists: exists
        }
      };
    }
  } catch (error: unknown) {
    console.error("Erreur lors de la récupération des informations du ProgramConfig:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { 
      success: false, 
      message: `Erreur lors de la récupération des informations: ${errorMessage}` 
    };
  }
} 