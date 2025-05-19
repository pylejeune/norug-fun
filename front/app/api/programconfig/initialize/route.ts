import { NextRequest } from "next/server";
import { randomUUID } from 'crypto';
import { verifyAuthToken, createSuccessResponse, createErrorResponse } from "@/lib/utils";
import { initializeProgramConfig } from "./service";

export async function GET(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🚀 Vérification de l'initialisation du ProgramConfig...`);

  // Vérification du token d'authentification
  if (!verifyAuthToken(request)) {
    console.error(`[${requestId}] ❌ Authentification échouée`);
    return createErrorResponse(requestId, {
      message: "Non autorisé",
      name: "AuthenticationError"
    }, 401);
  }

  try {
    const result = await initializeProgramConfig();
    console.log(`[${requestId}] ✅ Opération terminée: ${result.message}`);

    if (result.programConfig) {
      // Format de la réponse lorsque le ProgramConfig est initialisé
      const formattedResponse = {
        message: result.message,
        programConfig: {
          address: result.programConfig.address,
          adminAuthority: result.programConfig.adminAuthority,
          programId: result.programConfig.programId,
        }
      };

      return createSuccessResponse(requestId, formattedResponse);
    }

    // Si le ProgramConfig n'a pas été initialisé avec succès
    return createSuccessResponse(requestId, result);
  } catch (error) {
    console.error(`[${requestId}] ❌ Erreur lors de l'initialisation du ProgramConfig:`, error);
    return createErrorResponse(requestId, error);
  }
} 