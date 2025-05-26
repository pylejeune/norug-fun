import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import {
  verifyAuthToken,
  createSuccessResponse,
  createErrorResponse,
  getAdminKeypair,
  getAdminKeypairProgramConfig,
  createAnchorWallet,
  getProgram,
  RPC_ENDPOINT,
  idl as SHARED_IDL,
} from "@/lib/utils";
import { PublicKey, Connection } from "@solana/web3.js";

export async function GET(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(
    `[${requestId}] 🔑 Récupération des informations de clés pour ProgramConfig...`
  );

  // Vérification du token d'authentification
  if (!verifyAuthToken(request)) {
    console.error(`[${requestId}] ❌ Authentification échouée`);
    return createErrorResponse(
      requestId,
      {
        message: "Non autorisé",
        name: "AuthenticationError",
      },
      401
    );
  }

  try {
    // Récupérer les keypairs depuis les différentes méthodes
    const adminKeypair = getAdminKeypair();
    const programConfigKeypair = getAdminKeypairProgramConfig();

    // Récupérer l'admin actuel depuis ProgramConfig
    const connection = new Connection(RPC_ENDPOINT);
    const wallet = createAnchorWallet(adminKeypair);
    const program = getProgram(connection, SHARED_IDL, wallet);

    if (!program) {
      throw new Error("Programme non initialisé");
    }

    // Générer le PDA pour le compte ProgramConfig
    const [programConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    console.log(`PDA du ProgramConfig: ${programConfigPDA.toString()}`);

    // Variables pour stocker les informations
    let currentAdmin = "Non initialisé";
    let programConfigExists = false;

    // Récupérer les informations du compte ProgramConfig s'il existe
    try {
      if ((program.account as any).programConfig) {
        const programConfigAccount = await (
          program.account as any
        ).programConfig.fetchNullable(programConfigPDA);
        if (programConfigAccount) {
          currentAdmin = programConfigAccount.adminAuthority.toString();
          programConfigExists = true;
        }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du ProgramConfig:", error);
    }

    // Vérifier si l'un des keypairs correspond à l'admin actuel
    const adminKeypairIsCurrentAdmin =
      currentAdmin === adminKeypair.publicKey.toString();
    const programConfigKeypairIsCurrentAdmin =
      currentAdmin === programConfigKeypair.publicKey.toString();

    // Préparer la réponse
    const keyInfo = {
      message: "Informations des clés pour ProgramConfig",
      programConfig: {
        exists: programConfigExists,
        address: programConfigPDA.toString(),
        currentAdmin: currentAdmin,
      },
      keypairs: {
        adminKeypair: {
          publicKey: adminKeypair.publicKey.toString(),
          isCurrentAdmin: adminKeypairIsCurrentAdmin,
          source: "getAdminKeypair()",
          variableEnv: "ADMIN_SEED_BASE64",
        },
        programConfigKeypair: {
          publicKey: programConfigKeypair.publicKey.toString(),
          isCurrentAdmin: programConfigKeypairIsCurrentAdmin,
          source: "getAdminKeypairProgramConfig()",
          variableEnv: "ADMIN_PROGRAMCONFIG_SEED_BASE64",
        },
      },
      instructions: {
        message:
          "Pour mettre à jour le ProgramConfig, vous devez utiliser la clé qui est actuellement définie comme admin.",
        action: programConfigExists
          ? "Utilisez la clé correspondant à l'admin actuel indiqué ci-dessus."
          : "Le ProgramConfig n'est pas encore initialisé, utilisez n'importe quelle clé pour l'initialiser.",
      },
    };

    return createSuccessResponse(requestId, keyInfo);
  } catch (error) {
    console.error(
      `[${requestId}] ❌ Erreur lors de la récupération des informations:`,
      error
    );
    return createErrorResponse(requestId, error);
  }
}
