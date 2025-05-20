import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { 
  getAdminKeypair, 
  getProgram, 
  createAnchorWallet, 
  RPC_ENDPOINT,
  idl as CRON_IDL
} from "@/lib/utils";

interface CloseEpochResult {
  success: boolean;
  message: string;
  closedEpochs?: {
    id: string;
    signature: string;
    status: string;
  }[];
  activeEpochs?: {
    id: string;
    startTime: string;
    endTime: string;
    status: string;
  }[];
  error?: string;
}

/**
 * Ferme toutes les époques actives
 */
export async function closeAllEpochs(): Promise<CloseEpochResult> {
  const connection = new Connection(RPC_ENDPOINT);
  const adminKeypair = getAdminKeypair();
  const wallet = createAnchorWallet(adminKeypair);
  const program = getProgram(connection, CRON_IDL, wallet);

  if (!program) {
    throw new Error("Programme non initialisé");
  }

  console.log("🔍 Recherche des époques actives...");
  
  try {
    // Récupérer toutes les époques
    const allEpochs = await (program.account as any).epochManagement.all();
    console.log(`📊 Nombre total d'époques trouvées: ${allEpochs.length}`);

    // Filtrer les époques actives
    const activeEpochs = allEpochs.filter((epoch: any) => {
      try {
        return epoch.account.status && Object.keys(epoch.account.status)[0] === 'active';
      } catch (err) {
        return false;
      }
    });

    // Vérifier et fermer les époques expirées
    const now = Math.floor(Date.now() / 1000);
    const expiredEpochs = activeEpochs.filter((epoch: any) => {
      return epoch.account.endTime.toNumber() < now;
    });

    console.log(`📊 Nombre d'époques actives: ${activeEpochs.length}`);
    console.log(`📊 Nombre d'époques expirées à fermer: ${expiredEpochs.length}`);

    if (expiredEpochs.length === 0) {
      // Retourner les époques actives même si aucune n'est fermée
      const formattedActiveEpochs = activeEpochs.map((epoch: any) => ({
        id: epoch.account.epochId.toString(),
        startTime: new Date(epoch.account.startTime.toNumber() * 1000).toISOString(),
        endTime: new Date(epoch.account.endTime.toNumber() * 1000).toISOString(),
        status: 'active'
      }));
      
      return {
        success: true,
        message: "Aucune époque expirée à fermer",
        activeEpochs: formattedActiveEpochs
      };
    }

    const closedEpochs = [];
    const errors = [];

    // Fermer chaque époque expirée
    for (const epoch of expiredEpochs) {
      try {
        const epochId = epoch.account.epochId;
        console.log(`\n🔄 Fermeture de l'époque ${epochId.toString()}...`);

        // Dériver la PDA pour epoch_management
        const [epochManagementPDA] = await PublicKey.findProgramAddressSync(
          [
            Buffer.from("epoch"),
            epochId.toArrayLike(Buffer, "le", 8)
          ],
          program.programId
        );

        // Dériver la PDA pour la configuration
        const [configPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("config")],
          program.programId
        );

        // Construction des comptes pour la transaction
        const accounts = {
          epochManagement: epochManagementPDA,
          authority: adminKeypair.publicKey,
          program_config: configPDA,
          systemProgram: SystemProgram.programId,
        };

        console.log("📋 Comptes utilisés pour la transaction:", accounts);
        console.log("🔑 Signataire utilisé:", adminKeypair.publicKey.toString());

        // Envoyer la transaction
        const signature = await (program.methods as any)
          .endEpoch(epochId)
          .accounts(accounts)
          .signers([adminKeypair])
          .rpc();

        console.log(`✅ Époque ${epochId.toString()} fermée avec succès! Signature: ${signature}`);

        // Vérification immédiate
        try {
          const status = await connection.getSignatureStatus(signature);
          console.log(`📊 Statut initial: ${JSON.stringify(status || {})}`);
        } catch (statusErr) {
          console.log(`⚠️ Impossible de récupérer le statut initial: ${statusErr instanceof Error ? statusErr.message : String(statusErr)}`);
        }

        closedEpochs.push({
          id: epochId.toString(),
          signature,
          status: "closed"
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Erreur lors de la fermeture de l'époque:`, errorMsg);
        errors.push(`Époque ${epoch.account.epochId.toString()}: ${errorMsg}`);
      }
    }

    // Récupérer les époques qui sont toujours actives après la fermeture
    const updatedActiveEpochs = (await (program.account as any).epochManagement.all()).filter((epoch: any) => {
      try {
        return epoch.account.status && Object.keys(epoch.account.status)[0] === 'active';
      } catch (err) {
        return false;
      }
    });

    // Formater les époques actives pour la réponse
    const formattedActiveEpochs = updatedActiveEpochs.map((epoch: any) => ({
      id: epoch.account.epochId.toString(),
      startTime: new Date(epoch.account.startTime.toNumber() * 1000).toISOString(),
      endTime: new Date(epoch.account.endTime.toNumber() * 1000).toISOString(),
      status: 'active'
    }));

    return {
      success: true,
      message: `Fermeture terminée. ${closedEpochs.length} époque(s) fermée(s), ${errors.length} erreur(s).`,
      closedEpochs,
      activeEpochs: formattedActiveEpochs,
      error: errors.length > 0 ? errors.join("; ") : undefined
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Erreur lors de la fermeture des époques:", errorMsg);
    
    return {
      success: false,
      message: "Erreur lors de la fermeture des époques",
      error: errorMsg
    };
  }
} 