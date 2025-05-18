import { NextRequest } from "next/server";
import { randomUUID } from 'crypto';
import { verifyAuthToken, createSuccessResponse, createErrorResponse } from "../../cron/shared/utils";
import { getProgramConfigInfo } from "./service";

export async function GET(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🚀 Récupération des informations du ProgramConfig...`);

  // Vérification du token d'authentification
  if (!verifyAuthToken(request)) {
    console.error(`[${requestId}] ❌ Authentification échouée`);
    return createErrorResponse(requestId, {
      message: "Non autorisé",
      name: "AuthenticationError"
    }, 401);
  }

  try {
    const result = await getProgramConfigInfo();
    console.log(`[${requestId}] ✅ Opération terminée: ${result.message}`);

    if (result.programConfig) {
      // Format de la réponse avec les informations du ProgramConfig
      const formattedResponse = {
        message: result.message,
        programConfig: {
          address: result.programConfig.address,
          adminAuthority: result.programConfig.adminAuthority,
          programId: result.programConfig.programId,
          exists: result.programConfig.exists,
        }
      };

      return createSuccessResponse(requestId, formattedResponse);
    }

    // Si aucune information n'a pu être récupérée
    return createSuccessResponse(requestId, result);
  } catch (error) {
    console.error(`[${requestId}] ❌ Erreur lors de la récupération des informations:`, error);
    return createErrorResponse(requestId, error);
  }
} 