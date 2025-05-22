import { NextRequest } from "next/server";
import { randomUUID } from 'crypto';
import { verifyAuthToken, createSuccessResponse, createErrorResponse } from "@/lib/utils";
import { createEpoch } from "../service";

export async function GET(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🚀 Création d'une époque de 48 heures...`);

  // Vérification du token d'authentification
  if (!verifyAuthToken(request)) {
    console.error(`[${requestId}] ❌ Authentification échouée`);
    return createErrorResponse(requestId, {
      message: "Non autorisé",
      name: "AuthenticationError"
    }, 401);
  }

  try {
    const result = await createEpoch(48 * 60); // 48 heures en minutes
    console.log(`[${requestId}] ✅ Opération terminée: ${result.message}`);

    return createSuccessResponse(requestId, result);
  } catch (error) {
    console.error(`[${requestId}] ❌ Erreur lors de la création de l'époque:`, error);
    return createErrorResponse(requestId, error);
  }
} 