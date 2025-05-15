import { NextRequest } from "next/server";
import { randomUUID } from 'crypto';
import { verifyAuthToken, createSuccessResponse, createErrorResponse } from "../../shared/utils";
import { initializeTreasury } from "./service";

export async function GET(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🚀 Vérification de l'initialisation de la treasury...`);

  // Vérification du token d'authentification
  if (!verifyAuthToken(request)) {
    console.error(`[${requestId}] ❌ Authentification échouée`);
    return createErrorResponse(requestId, {
      message: "Non autorisé",
      name: "AuthenticationError"
    }, 401);
  }

  try {
    const result = await initializeTreasury();
    console.log(`[${requestId}] ✅ Opération terminée: ${result.message}`);

    return createSuccessResponse(requestId, result);
  } catch (error) {
    return createErrorResponse(requestId, error);
  }
} 