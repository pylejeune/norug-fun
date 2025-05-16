import {
  createErrorResponse,
  createSuccessResponse,
  verifyAuthToken,
} from "@/lib/utils";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { runCrankLogic } from "./service";
import { verifyAuthToken, createSuccessResponse, createErrorResponse } from "../../../../lib/utils";

// Handler pour les requêtes GET
export async function GET(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🚀 Démarrage de l'exécution du crank...`);

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
    // Exécuter la logique du crank directement
    const result = await runCrankLogic();
    console.log(`\n[${requestId}] ✅ Exécution du crank terminée`);

    // Si le traitement a réussi
    if (result.success) {
      console.log(`[${requestId}] 📊 Résumé: ${result.message}`);
      if (result.details) {
        console.log(
          `[${requestId}] 📈 Détails: ${result.details.processedCount} époque(s) traitée(s)`
        );
      }
    } else {
      console.log(
        `[${requestId}] ⚠️ Le crank a rencontré un problème: ${result.message}`
      );
    }

    return createSuccessResponse(requestId, result);
  } catch (error) {
    return createErrorResponse(requestId, error);
  }
}
