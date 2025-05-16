// front/app/api/treasury/balance/route.ts
import { NextRequest } from "next/server";
import { randomUUID } from 'crypto';
import { verifyAuthToken, createSuccessResponse, createErrorResponse } from "../../shared/utils";
import { getProgram, getAdminKeypair, createAnchorWallet, RPC_ENDPOINT } from "../../shared/utils";
import { PublicKey, Connection } from "@solana/web3.js";

export async function GET(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🚀 Vérification de la balance de la treasury...`);

  // Vérification du token d'authentification
  if (!verifyAuthToken(request)) {
    console.error(`[${requestId}] ❌ Authentification échouée`);
    return createErrorResponse(requestId, {
      message: "Non autorisé",
      name: "AuthenticationError"
    }, 401);
  }

  try {
    const connection = new Connection(RPC_ENDPOINT);
    const adminKeypair = getAdminKeypair();
    const wallet = createAnchorWallet(adminKeypair);
    const program = getProgram(connection, wallet);

    if (!program) {
      throw new Error("Programme non initialisé");
    }

    // Vérifier si la treasury est initialisée
    const [treasuryPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    );

    // Récupérer le compte treasury
    const treasuryAccount = await (program.account as any).treasury.fetchNullable(treasuryPDA);
    
    if (!treasuryAccount) {
      return createErrorResponse(requestId, {
        message: "La treasury n'est pas initialisée.",
      }, 404);
    }

    // Formater la réponse
    const balance = treasuryAccount.sol_balance / 1_000_000_000; // Convertir en SOL

    return createSuccessResponse(requestId, {
      balance,
      address: treasuryPDA.toString(),
      authority: treasuryAccount.authority.toString(),
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Erreur lors de la récupération de la balance:`, error);
    return createErrorResponse(requestId, error);
  }
}