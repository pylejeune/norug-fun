import {
  createAnchorWallet,
  idl as CRON_IDL,
  getAdminKeypair,
  getAdminKeypairProgramConfig,
  getProgram,
  RPC_ENDPOINT,
} from "@/lib/utils";
import { BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";

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
  const adminKeypair = getAdminKeypairProgramConfig();
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
 * Close all active epochs
 */
export async function closeAllEpochs(): Promise<CloseEpochResult> {
  const connection = new Connection(RPC_ENDPOINT);
  const adminKeypair = getAdminKeypairProgramConfig();
  const wallet = createAnchorWallet(adminKeypair);
  const program = getProgram(connection, CRON_IDL, wallet);

  if (!program) {
    throw new Error("Program not initialized");
  }

  console.log("🔍 Searching for active epochs...");

  try {
    // Get all epochs
    const allEpochs = await (program.account as any).epochManagement.all();
    console.log(`📊 Total number of epochs found: ${allEpochs.length}`);

    // Filter active epochs
    const activeEpochs = allEpochs.filter((epoch: any) => {
      try {
        return (
          epoch.account.status &&
          Object.keys(epoch.account.status)[0] === "active"
        );
      } catch (err) {
        return false;
      }
    });

    console.log(`📊 Number of active epochs: ${activeEpochs.length}`);
    console.log(`🔄 Will close ALL active epochs regardless of their end time`);

    if (activeEpochs.length === 0) {
      return {
        success: true,
        message: "No active epochs to close",
        activeEpochs: [],
      };
    }

    const closedEpochs = [];
    const errors = [];

    // Close ALL active epochs (regardless of end time)
    for (const epoch of activeEpochs) {
      try {
        const epochId = epoch.account.epochId;
        console.log(`\n🔄 Force closing epoch ${epochId.toString()}...`);

        // Derive PDA for epoch_management
        const [epochManagementPDA] = await PublicKey.findProgramAddressSync(
          [Buffer.from("epoch"), epochId.toArrayLike(Buffer, "le", 8)],
          program.programId
        );

        // Derive PDA for configuration
        const [configPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("config")],
          program.programId
        );

        // Build accounts for transaction
        const accounts = {
          epochManagement: epochManagementPDA,
          authority: adminKeypair.publicKey,
          program_config: configPDA,
          systemProgram: SystemProgram.programId,
        };

        console.log("📋 Accounts used for transaction:", accounts);
        console.log("🔑 Signer used:", adminKeypair.publicKey.toString());

        // Send transaction
        const signature = await (program.methods as any)
          .endEpoch(epochId)
          .accounts(accounts)
          .signers([adminKeypair])
          .rpc();

        console.log(
          `✅ Epoch ${epochId.toString()} force closed successfully! Signature: ${signature}`
        );

        // Immediate verification
        try {
          const status = await connection.getSignatureStatus(signature);
          console.log(`📊 Initial status: ${JSON.stringify(status || {})}`);
        } catch (statusErr) {
          console.log(
            `⚠️ Unable to retrieve initial status: ${statusErr instanceof Error ? statusErr.message : String(statusErr)}`
          );
        }

        closedEpochs.push({
          id: epochId.toString(),
          signature,
          status: "closed",
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error force closing epoch:`, errorMsg);
        errors.push(`Epoch ${epoch.account.epochId.toString()}: ${errorMsg}`);
      }
    }

    // Get remaining active epochs after closing (should be 0 if all went well)
    const updatedActiveEpochs = (
      await (program.account as any).epochManagement.all()
    ).filter((epoch: any) => {
      try {
        return (
          epoch.account.status &&
          Object.keys(epoch.account.status)[0] === "active"
        );
      } catch (err) {
        return false;
      }
    });

    // Format active epochs for response
    const formattedActiveEpochs = updatedActiveEpochs.map((epoch: any) => ({
      id: epoch.account.epochId.toString(),
      startTime: new Date(
        epoch.account.startTime.toNumber() * 1000
      ).toISOString(),
      endTime: new Date(epoch.account.endTime.toNumber() * 1000).toISOString(),
      status: "active",
    }));

    return {
      success: true,
      message: `Force closing completed. ${closedEpochs.length} epoch(s) force closed, ${errors.length} error(s). ${formattedActiveEpochs.length} epoch(s) remain active.`,
      closedEpochs,
      activeEpochs: formattedActiveEpochs,
      error: errors.length > 0 ? errors.join("; ") : undefined,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Error force closing all epochs:", errorMsg);

    return {
      success: false,
      message: "Error force closing all epochs",
      error: errorMsg,
    };
  }
}
