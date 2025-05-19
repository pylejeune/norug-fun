import { NextRequest } from "next/server";
import { randomUUID } from 'crypto';
import { 
  verifyAuthToken, 
  createSuccessResponse, 
  createErrorResponse, 
  generateRandomTokenName, 
  generateRandomTokenSymbol,
  generateRandomImageUrl
} from "../../../../lib/utils";
import { createProposal } from "./service";

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🚀 Création d'une nouvelle proposition...`);

  // Vérification du token d'authentification
  if (!verifyAuthToken(request)) {
    console.error(`[${requestId}] ❌ Authentification échouée`);
    return createErrorResponse(requestId, {
      message: "Non autorisé",
      name: "AuthenticationError"
    }, 401);
  }

  try {
    // Extraction des données de la requête ou utilisation des valeurs par défaut
    const body = await request.json().catch(() => ({}));
    
    const {
      tokenName = generateRandomTokenName(),
      tokenSymbol = generateRandomTokenSymbol(),
      description = "Description de la proposition par défaut",
      totalSupply = 1000000,
      creatorAllocation = 5,
      lockupPeriod = 86400, // 1 jour en secondes
      imageUrl = null,
      epochId = null
    } = body;

    console.log(`[${requestId}] 📝 Données de la proposition:`, {
      tokenName,
      tokenSymbol,
      description,
      totalSupply,
      creatorAllocation,
      lockupPeriod,
      imageUrl,
      epochId
    });

    const result = await createProposal({
      tokenName,
      tokenSymbol,
      description,
      totalSupply,
      creatorAllocation,
      lockupPeriod,
      imageUrl,
      epochId
    });

    console.log(`[${requestId}] ✅ Proposition créée avec succès:`, result);

    return createSuccessResponse(requestId, {
      success: true,
      proposal: result
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Erreur lors de la création de la proposition:`, error);
    return createErrorResponse(requestId, error);
  }
} 