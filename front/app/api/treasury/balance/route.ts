// front/app/api/treasury/balance/route.ts
import {
  createErrorResponse,
  createSuccessResponse,
  verifyAuthToken,
} from "@/lib/utils";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { fetchTreasuryBalance } from "./service";

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🔍 Requête de récupération du solde du treasury`);

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
    const balance = await fetchTreasuryBalance();
    return createSuccessResponse(requestId, { balance });
  } catch (error) {
    return createErrorResponse(requestId, error);
  }
}
