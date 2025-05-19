import { NextRequest } from "next/server";
import { randomUUID } from 'crypto';
import { Connection } from "@solana/web3.js";
import { 
  verifyAuthToken, 
  createSuccessResponse, 
  createErrorResponse,
  getProgram,
  getAdminKeypair,
  createAnchorWallet,
  RPC_ENDPOINT,
  CRON_IDL
} from "../../../../lib/utils";
import { closeAllEpochs } from "../../epoch/close-all/service";
import { createEpoch } from "../../epoch/service";

export async function GET(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🚀 Vérification planifiée des époques...`);

  // Vérification du token d'authentification pour les appels Cron
  if (!verifyAuthToken(request)) {
    console.error(`[${requestId}] ❌ Authentification échouée pour scheduler`);
    return createErrorResponse(requestId, {
      message: "Non autorisé",
      name: "AuthenticationError"
    }, 401);
  }

  try {
    // Initialisation de la connexion
    const connection = new Connection(RPC_ENDPOINT);
    const adminKeypair = getAdminKeypair();
    const wallet = createAnchorWallet(adminKeypair);
    const program = getProgram(connection, CRON_IDL, wallet);

    if (!program) {
      throw new Error("Programme non initialisé");
    }

    console.log(`[${requestId}] 🔍 Vérification des époques...`);

    // Récupérer toutes les époques
    const allEpochs = await (program.account as any).epochManagement.all();
    console.log(`[${requestId}] 📊 Nombre total d'époques: ${allEpochs.length}`);

    // Filtrer les époques actives
    const activeEpochs = allEpochs.filter((epoch: any) => {
      try {
        return epoch.account.status && Object.keys(epoch.account.status)[0] === 'active';
      } catch (err) {
        return false;
      }
    });
    console.log(`[${requestId}] 📊 Nombre d'époques actives: ${activeEpochs.length}`);

    // Vérifier si des époques sont expirées
    const now = Math.floor(Date.now() / 1000);
    const expiredEpochs = activeEpochs.filter((epoch: any) => {
      return epoch.account.endTime.toNumber() < now;
    });
    console.log(`[${requestId}] 📊 Nombre d'époques expirées: ${expiredEpochs.length}`);

    let result: any = { success: true };
    let newEpochCreated = false;

    // Si des époques sont expirées, les fermer
    if (expiredEpochs.length > 0) {
      console.log(`[${requestId}] 🔄 Fermeture des époques expirées...`);
      result = await closeAllEpochs();
      console.log(`[${requestId}] ✅ Résultat fermeture: ${result.message}`);
      
      // Vérifier s'il reste des époques actives après la fermeture
      if (!result.activeEpochs || result.activeEpochs.length === 0) {
        console.log(`[${requestId}] 🔄 Aucune époque active, création d'une nouvelle époque...`);
        
        // Créer une nouvelle époque de 48 heures
        const newEpochResult = await createEpoch(48 * 60);
        if (newEpochResult.success) {
          console.log(`[${requestId}] ✅ Nouvelle époque créée avec succès: ${newEpochResult.epoch?.id}`);
          newEpochCreated = true;
          
          // Ajouter la nouvelle époque au résultat
          result.newEpoch = newEpochResult.epoch;
        } else {
          console.error(`[${requestId}] ❌ Erreur lors de la création d'une nouvelle époque:`, newEpochResult.error);
        }
      } else {
        console.log(`[${requestId}] ℹ️ Il reste ${result.activeEpochs.length} époque(s) active(s), pas besoin d'en créer une nouvelle.`);
      }
    } else {
      // Aucune époque expirée, mais vérifions s'il existe au moins une époque active
      if (activeEpochs.length === 0) {
        console.log(`[${requestId}] 🔄 Aucune époque active, création d'une nouvelle époque...`);
        
        // Créer une nouvelle époque de 48 heures
        const newEpochResult = await createEpoch(48 * 60);
        if (newEpochResult.success) {
          console.log(`[${requestId}] ✅ Nouvelle époque créée avec succès: ${newEpochResult.epoch?.id}`);
          newEpochCreated = true;
          
          // Mettre à jour le résultat
          result = {
            success: true,
            message: "Aucune époque expirée, mais une nouvelle époque a été créée",
            activeEpochs: activeEpochs.map((epoch: any) => ({
              id: epoch.account.epochId.toString(),
              startTime: new Date(epoch.account.startTime.toNumber() * 1000).toISOString(),
              endTime: new Date(epoch.account.endTime.toNumber() * 1000).toISOString(),
              status: 'active'
            })),
            newEpoch: newEpochResult.epoch
          };
        } else {
          console.error(`[${requestId}] ❌ Erreur lors de la création d'une nouvelle époque:`, newEpochResult.error);
        }
      } else {
        console.log(`[${requestId}] ✅ Aucune époque expirée, et ${activeEpochs.length} époque(s) active(s).`);
        
        // Formater le résultat avec les époques actives
        result = {
          success: true,
          message: "Aucune époque expirée à fermer",
          activeEpochs: activeEpochs.map((epoch: any) => ({
            id: epoch.account.epochId.toString(),
            startTime: new Date(epoch.account.startTime.toNumber() * 1000).toISOString(),
            endTime: new Date(epoch.account.endTime.toNumber() * 1000).toISOString(),
            status: 'active'
          }))
        };
      }
    }

    console.log(`[${requestId}] ✅ Vérification des époques terminée. Époques expirées fermées: ${expiredEpochs.length}, Nouvelle époque créée: ${newEpochCreated}`);

    return createSuccessResponse(requestId, result);
  } catch (error) {
    console.error(`[${requestId}] ❌ Erreur lors de la vérification des époques:`, error);
    return createErrorResponse(requestId, error);
  }
} 