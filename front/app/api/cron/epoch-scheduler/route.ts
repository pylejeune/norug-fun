import { verifyAuthToken } from "@/lib/utils";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { checkAndSimulateEndEpoch } from "./service";

// Handler pour les requêtes GET
export async function GET(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🚀 Démarrage de la vérification des époques...`);

  // Vérification du token d'authentification
  if (!verifyAuthToken(request)) {
    console.error(`[${requestId}] ❌ Authentification échouée`);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Non autorisé",
        errorType: "AuthenticationError",
        timestamp: new Date().toISOString(),
        requestId,
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Vérifier et simuler la fermeture des époques si nécessaire
    const results = await checkAndSimulateEndEpoch();
    console.log(`\n[${requestId}] ✅ Vérification terminée`);
    console.log(
      `[${requestId}] 📊 Résumé: ${results.details.epochsChecked} époque(s) vérifiée(s), ${results.details.epochsToClose} époque(s) à fermer, ${results.details.epochsClosed} époque(s) fermée(s)`
    );

    // Ajouter information sur la création d'une nouvelle époque si applicable
    if (results.newEpochCreated) {
      console.log(
        `[${requestId}] 🆕 Nouvelle époque créée: ${
          results.newEpochCreated.success ? "Oui" : "Non"
        }`
      );
      if (results.newEpochCreated.success) {
        console.log(
          `[${requestId}] 🆔 ID de la nouvelle époque: ${results.newEpochCreated.epochId}`
        );
      }
    }

    return new Response(
      JSON.stringify({
        ...results,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT,
        requestId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorType = error instanceof Error ? error.name : typeof error;
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(
      `[${requestId}] ❌ Erreur lors de l'exécution:`,
      errorMsg,
      errorStack
    );
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
        errorType,
        stack: errorStack,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT,
        requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
