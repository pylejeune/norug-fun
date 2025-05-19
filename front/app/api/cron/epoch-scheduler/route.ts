import { NextRequest } from "next/server";
import { randomUUID } from 'crypto';
import { verifyAuthToken, getAdminKeypair, createAnchorWallet, RPC_ENDPOINT } from "../../../../lib/utils";
import { getAllEpochs } from "./service";
import { Connection } from "@solana/web3.js";

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
    const connection = new Connection(RPC_ENDPOINT);
    const adminKeypair = getAdminKeypair();
    const wallet = createAnchorWallet(adminKeypair);
    
    // Récupérer les informations sur les époques
    const result = await getAllEpochs(connection, wallet);
    
    // Calculer les statistiques
    const stats = {
      total: Array.isArray(result) ? result.length : 0,
      active: Array.isArray(result) ? result.filter(epoch => epoch.status === 'active').length : 0,
      closed: Array.isArray(result) ? result.filter(epoch => epoch.status === 'closed').length : 0,
      needsClosing: Array.isArray(result) ? result.filter(epoch => epoch.needsClosing).length : 0
    };
    
    return new Response(JSON.stringify({
      success: true,
      epochs: result,
      stats: {
        ...stats,
        summary: `Total: ${stats.total} époques (${stats.active} actives, ${stats.closed} fermées, ${stats.needsClosing} à fermer)`
      },
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