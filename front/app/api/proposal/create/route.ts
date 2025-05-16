import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { randomUUID } from 'crypto';
import { 
  verifyAuthToken, 
  createSuccessResponse, 
  createErrorResponse, 
  generateRandomTokenName, 
  generateRandomTokenSymbol
} from "../../../../lib/utils";
import { createProposal } from "./service";
import { generateAndUploadRandomImage, ipfsToHttp } from "./image-service";

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🚀 Création d'une nouvelle proposition...`);

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
      epochId = null,
    } = body;

    // Génération d'une image aléatoire sur IPFS si aucune n'est fournie
    let finalImageUrl = imageUrl;
    if (!imageUrl) {
      console.log(`[${requestId}] 🖼️ Génération d'une image aléatoire sur IPFS...`);
      try {
        finalImageUrl = await generateAndUploadRandomImage();
        console.log(`[${requestId}] ✅ Image générée et uploadée sur IPFS: ${finalImageUrl}`);
      } catch (imageError) {
        console.error(`[${requestId}] ⚠️ Erreur lors de la génération d'image:`, imageError);
        // Continuer sans image en cas d'erreur
        finalImageUrl = null;
      }
    }

    console.log(`[${requestId}] 📝 Données de la proposition:`, {
      tokenName,
      tokenSymbol,
      description,
      totalSupply,
      creatorAllocation,
      lockupPeriod,
      imageUrl: finalImageUrl,
      epochId
    });

    const result = await createProposal({
      tokenName,
      tokenSymbol,
      description,
      totalSupply,
      creatorAllocation,
      lockupPeriod,
      imageUrl: finalImageUrl,
      epochId
    });

    // Ajouter l'URL HTTP de l'image à la réponse
    const ipfsImageUrl = finalImageUrl || '';
    const httpImageUrl = ipfsToHttp(ipfsImageUrl);

    console.log(`[${requestId}] ✅ Proposition créée avec succès:`, result);

    return createSuccessResponse(requestId, {
      success: true,
      proposal: {
        ...result,
        imageUrl: ipfsImageUrl,
        imageHttpUrl: httpImageUrl
      }
    });
  } catch (error) {
    console.error(
      `[${requestId}] ❌ Erreur lors de la création de la proposition:`,
      error
    );
    return createErrorResponse(requestId, error);
  }
}
