import { NextRequest } from "next/server";
import { randomUUID } from 'crypto';
import { verifyAuthToken } from "../../../../lib/utils";
import { checkAndSimulateEndEpoch } from "./service";

interface EpochInfo {
  publicKey: string;
  epochId: string;
  startTime: string;
  endTime: string;
  status: string;
  processed: boolean | string;
  needsClosing: boolean;
  timeRemaining: string;
}

// Handler pour les requêtes GET
export async function GET(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🔍 Démarrage de la vérification et fermeture des époques`);

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
    // Vérifier et fermer les époques si nécessaire
    const result = await checkAndSimulateEndEpoch();
    
    // Filtrer pour ne garder que les époques actives
    let activeEpochs: EpochInfo[] = [];
    if (Array.isArray(result.epochs)) {
      activeEpochs = result.epochs.filter(epoch => epoch.status === 'active');
    } else if (result.epochs && typeof result.epochs === 'object') {
      // Si c'est un objet avec différents types d'époques
      Object.values(result.epochs).forEach((group: any) => {
        if (group.accounts && Array.isArray(group.accounts)) {
          activeEpochs = activeEpochs.concat(group.accounts.filter((acc: any) => acc.status === 'active'));
        }
      });
    }
    
    return new Response(JSON.stringify({
      success: result.success,
      details: {
        ...result.details,
        activeEpochsCount: activeEpochs.length
      },
      epochs: activeEpochs,
      newEpochCreated: result.newEpochCreated,
      timestamp: new Date().toISOString(),
      requestId,
    }), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Erreur lors de la vérification des époques:`, error);
    
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