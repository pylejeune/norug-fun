import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import {
  verifyAuthToken,
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/utils";
import { closeAllEpochs } from "./service";

export async function GET(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🚀 Fermeture de toutes les époques actives...`);

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
    const result = await closeAllEpochs();
    console.log(`[${requestId}] ✅ Opération terminée: ${result.message}`);

    return createSuccessResponse(requestId, result);
  } catch (error) {
    console.error(
      `[${requestId}] ❌ Erreur lors de la fermeture des époques:`,
      error
    );
    return createErrorResponse(requestId, error);
  }
}
