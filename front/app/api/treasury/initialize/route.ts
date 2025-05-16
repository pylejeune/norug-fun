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
    
    // Afficher les détails de la treasury si disponibles
    if (result.treasury) {
      console.log(`[${requestId}] 📊 Détails de la Treasury:`);
      console.log(`[${requestId}] 🔑 Adresse: ${result.treasury.address}`);
      console.log(`[${requestId}] 👤 Autorité: ${result.treasury.authority}`);
      console.log(`[${requestId}] 💰 Sous-comptes:`);
      console.log(`[${requestId}]   - Marketing: ${result.treasury.accounts.marketing.balance} SOL (Dernier retrait: ${result.treasury.accounts.marketing.lastWithdrawal})`);
      console.log(`[${requestId}]   - Team: ${result.treasury.accounts.team.balance} SOL (Dernier retrait: ${result.treasury.accounts.team.lastWithdrawal})`);
      console.log(`[${requestId}]   - Operations: ${result.treasury.accounts.operations.balance} SOL (Dernier retrait: ${result.treasury.accounts.operations.lastWithdrawal})`);
      console.log(`[${requestId}]   - Investments: ${result.treasury.accounts.investments.balance} SOL (Dernier retrait: ${result.treasury.accounts.investments.lastWithdrawal})`);
      console.log(`[${requestId}]   - Crank: ${result.treasury.accounts.crank.balance} SOL (Dernier retrait: ${result.treasury.accounts.crank.lastWithdrawal})`);
    }

    return createSuccessResponse(requestId, result);
  } catch (error) {
    return createErrorResponse(requestId, error);
  }
} 