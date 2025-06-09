import {
  createAnchorWallet,
  idl as CRON_IDL,
  getAdminKeypair,
  getProgram,
  RPC_ENDPOINT,
} from "@/lib/utils";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";

interface CloseExpiredEpochsResult {
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
 * Close only expired epochs and keep alive ones active
 */
export async function closeExpiredEpochs(): Promise<CloseExpiredEpochsResult> {
  const connection = new Connection(RPC_ENDPOINT);
  const adminKeypair = getAdminKeypair();
  const wallet = createAnchorWallet(adminKeypair);
  const program = getProgram(connection, CRON_IDL, wallet);

  if (!program) {
    throw new Error("Program not initialized");
  }

  console.log("🔍 Searching for expired epochs...");

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

    // Check and close expired epochs only
    const now = Math.floor(Date.now() / 1000);
    const expiredEpochs = activeEpochs.filter((epoch: any) => {
      return epoch.account.endTime.toNumber() < now;
    });

    console.log(`📊 Number of active epochs: ${activeEpochs.length}`);
    console.log(
      `📊 Number of expired epochs to close: ${expiredEpochs.length}`
    );

    if (expiredEpochs.length === 0) {
      // Return active epochs even if none are closed
      const formattedActiveEpochs = activeEpochs.map((epoch: any) => ({
        id: epoch.account.epochId.toString(),
        startTime: new Date(
          epoch.account.startTime.toNumber() * 1000
        ).toISOString(),
        endTime: new Date(
          epoch.account.endTime.toNumber() * 1000
        ).toISOString(),
        status: "active",
      }));

      return {
        success: true,
        message: "No expired epochs to close",
        activeEpochs: formattedActiveEpochs,
      };
    }

    const closedEpochs = [];
    const errors = [];

    // Close each expired epoch
    for (const epoch of expiredEpochs) {
      try {
        const epochId = epoch.account.epochId;
        console.log(`\n🔄 Closing expired epoch ${epochId.toString()}...`);

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
          `✅ Expired epoch ${epochId.toString()} closed successfully! Signature: ${signature}`
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
        console.error(`❌ Error closing expired epoch:`, errorMsg);
        errors.push(`Epoch ${epoch.account.epochId.toString()}: ${errorMsg}`);
      }
    }

    // Get epochs that are still active after closing
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
      message: `Cleanup completed. ${closedEpochs.length} expired epoch(s) closed, ${errors.length} error(s). ${formattedActiveEpochs.length} epoch(s) remain active.`,
      closedEpochs,
      activeEpochs: formattedActiveEpochs,
      error: errors.length > 0 ? errors.join("; ") : undefined,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Error closing expired epochs:", errorMsg);

    return {
      success: false,
      message: "Error closing expired epochs",
      error: errorMsg,
    };
  }
}
