import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  getAdminKeypair,
  getProgram,
  createAnchorWallet,
  RPC_ENDPOINT,
  idl as CRON_IDL,
} from "@/lib/utils";

interface EpochResult {
  success: boolean;
  message: string;
  epoch?: {
    id: string;
    startTime: string;
    endTime: string;
    duration: number;
    signature?: string;
  };
  error?: string;
}

/**
 * Crée une nouvelle époque avec la durée spécifiée en minutes
 * @param durationMinutes Durée de l'époque en minutes
 */
export async function createEpoch(
  durationMinutes: number
): Promise<EpochResult> {
  const connection = new Connection(RPC_ENDPOINT);
  const adminKeypair = getAdminKeypair();
  const wallet = createAnchorWallet(adminKeypair);
  const program = getProgram(connection, CRON_IDL, wallet);

  if (!program) {
    throw new Error("Programme non initialisé");
  }

  console.log(
    `🔄 Création d'une nouvelle époque de ${durationMinutes} minutes...`
  );

  try {
    // Générer un nouvel ID d'époque (timestamp actuel)
    const newEpochId = new BN(Math.floor(Date.now() / 1000));

    // Définir les heures de début et de fin
    const startTime = new BN(Math.floor(Date.now() / 1000));
    const durationSeconds = durationMinutes * 60;
    const endTime = new BN(startTime.toNumber() + durationSeconds);

    // Dériver la PDA pour epoch_management avec l'epochId
    const [epochManagementPDA] = await PublicKey.findProgramAddressSync(
      [Buffer.from("epoch"), newEpochId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    console.log(
      "🔑 PDA généré pour la nouvelle epoch_management:",
      epochManagementPDA.toString()
    );
    console.log(`⏰ Paramètres de la nouvelle époque:`);
    console.log(`- ID: ${newEpochId.toString()}`);
    console.log(
      `- Début: ${new Date(startTime.toNumber() * 1000).toISOString()}`
    );
    console.log(`- Fin: ${new Date(endTime.toNumber() * 1000).toISOString()}`);
    console.log(`- Durée: ${durationMinutes} minutes`);

    // Construction des comptes pour la transaction
    const accounts = {
      authority: adminKeypair.publicKey,
      epochManagement: epochManagementPDA,
      systemProgram: SystemProgram.programId,
    };

    console.log("📋 Comptes utilisés pour la transaction:", accounts);
    console.log("🔑 Signataire utilisé:", adminKeypair.publicKey.toString());

    // Utilisation directe de la méthode Anchor
    console.log(
      "🚀 Envoi de la transaction avec program.methods.startEpoch..."
    );
    const signature = await (program.methods as any)
      .startEpoch(newEpochId, startTime, endTime)
      .accounts(accounts)
      .signers([adminKeypair])
      .rpc();

    console.log(
      `✅ Transaction pour créer une nouvelle époque envoyée! Signature: ${signature}`
    );

    // Vérification immédiate
    try {
      const status = await connection.getSignatureStatus(signature);
      console.log(`📊 Statut initial: ${JSON.stringify(status || {})}`);
    } catch (statusErr) {
      console.log(
        `⚠️ Impossible de récupérer le statut initial: ${statusErr instanceof Error ? statusErr.message : String(statusErr)}`
      );
    }

    return {
      success: true,
      message: "Nouvelle époque créée avec succès",
      epoch: {
        id: newEpochId.toString(),
        startTime: new Date(startTime.toNumber() * 1000).toISOString(),
        endTime: new Date(endTime.toNumber() * 1000).toISOString(),
        duration: durationMinutes,
        signature,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Erreur lors de la création de l'époque:", errorMsg);

    return {
      success: false,
      message: "Erreur lors de la création de l'époque",
      error: errorMsg,
    };
  }
}
