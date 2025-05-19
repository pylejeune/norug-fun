import { NextRequest } from "next/server";
import { randomUUID } from 'crypto';
import { verifyAuthToken } from "../../../../lib/utils";
import { getAllEpochs } from "./service";

// Handler pour les requêtes GET
export async function GET(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🔍 Requête d'information sur les époques`);

  // Vérification du token d'authentification
  if (!verifyAuthToken(request)) {
    console.error(`[${requestId}] ❌ Authentification échouée`);
    return new Response(JSON.stringify({
      success: false,
      error: "Non autorisé",
      message: "Non autorisé",
      timestamp: new Date().toISOString(),
      requestId,
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Récupérer les informations sur les époques
    const result = await getAllEpochs();
    
    return new Response(JSON.stringify({
      success: true,
      epochs: result,
      timestamp: new Date().toISOString(),
      requestId,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Erreur lors de la récupération des époques:`, error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      requestId,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 