import {
  RPC_ENDPOINT,
  createAnchorWallet,
  getAdminKeypair,
  getProgram,
  CRON_IDL
} from "@/lib/utils";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";


// --- Définition des interfaces ---
interface EpochManagementAccountInfo {
  publicKey: PublicKey;
  account: {
    epochId: anchor.BN;
    startTime: anchor.BN;
    endTime: anchor.BN;
    status: any;
    processed: boolean;
  };
}

// Interface pour les propositions
interface TokenProposalInfo {
  publicKey: PublicKey;
  account: {
    status: Record<string, any>;
    solRaised: anchor.BN;
    // Ajouter d'autres champs si nécessaire
  };
}

// Type pour les comptes du programme
interface ProgramAccounts {
  epochManagement: {
    all: () => Promise<EpochManagementAccountInfo[]>;
  };
  tokenProposal: {
    all: (filter?: any[]) => Promise<TokenProposalInfo[]>;
  };
}

// Type pour l'epoch account
interface EpochAccount {
  epochId: anchor.BN;
  startTime: anchor.BN;
  endTime: anchor.BN;
  status: any;
  processed: boolean;
}

/**
 * Exécute la logique principale du Crank.
 * Charge la configuration depuis les variables d'environnement.
 * @returns Un objet indiquant le succès ou l'échec et potentiellement des détails.
 */
export async function runCrankLogic(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  console.log("⚙️ Exécution de runCrankLogic...");

    try {
        const connection = new Connection(RPC_ENDPOINT);
        let adminKeypair;
        
        try {
            adminKeypair = getAdminKeypair();
            console.log("🔑 Admin keypair généré avec succès:", adminKeypair.publicKey.toString());
        } catch (error) {
            console.error("❌ Impossible d'obtenir le keypair admin:", error instanceof Error ? error.message : String(error));
            return { 
                success: false, 
                message: `Impossible d'obtenir le keypair admin: ${error instanceof Error ? error.message : String(error)}` 
            };
        }
        
        // Création du wallet avec le keypair admin
        const wallet = createAnchorWallet(adminKeypair);
        
        const program = getProgram(connection, CRON_IDL, wallet);
        
        if (!program) {
            return { success: false, message: "Programme non initialisé" };
        }
    
        // --- Logique Principale --- 
        console.log("\n🔍 Finding closed epochs to process...");
        // Utiliser directement les fonctions internes ici
        const untreatedEpochs = await findClosedUntreatedEpochs(program);

    let processedCount = 0;
    let errorDetails: { epochId: string; error: string }[] = [];

    if (untreatedEpochs.length === 0) {
      console.log("   -> No untreated closed epochs found.");
    } else {
      console.log(`   -> Found ${untreatedEpochs.length} untreated epoch(s).`);
      console.log("\n⚙️ Processing epochs...");
      for (const epochInfo of untreatedEpochs) {
        // Passer l'adminKeypair à processEpoch
        const result = await processEpoch(
          program,
          adminKeypair,
          epochInfo.publicKey,
          epochInfo.account
        );
        if (result.success) {
          processedCount++;
        } else {
          errorDetails.push({
            epochId: epochInfo.account.epochId.toString(),
            error: result.message,
          });
        }
      }
    }

    console.log("\n✅ Crank logic finished.");
    return {
      success: true,
      message: `Crank logic finished. Processed ${processedCount} epoch(s).`,
      details: { processedCount, errors: errorDetails },
    };
  } catch (error: any) {
    console.error(
      "\n❌ An error occurred during the crank logic execution:",
      error
    );
    return { success: false, message: `An error occurred: ${error.message}` };
  }
}

/**
 * Trouve les époques fermées et non traitées qui ont encore des propositions actives.
 */
async function findClosedUntreatedEpochs(
  program: anchor.Program<any>
): Promise<EpochManagementAccountInfo[]> {
  console.log("   Fetching all epochs...");

  // Cast des comptes du programme pour avoir des types corrects
  const programAccounts = program.account as unknown as ProgramAccounts;

  const allEpochs: EpochManagementAccountInfo[] =
    await programAccounts.epochManagement.all();
  console.log(`   Found ${allEpochs.length} total epochs.`);

  const closedUntreatedEpochs = allEpochs.filter(
    (epoch) => "closed" in epoch.account.status && !epoch.account.processed
  );
  console.log(
    `   Found ${closedUntreatedEpochs.length} closed and untreated epochs.`
  );

  const epochsToProcess: EpochManagementAccountInfo[] = [];
  for (const epochInfo of closedUntreatedEpochs) {
    console.log(
      `   Checking epoch ${epochInfo.account.epochId.toString()} for active proposals...`
    );

    const proposals = await programAccounts.tokenProposal.all([
      {
        memcmp: {
          offset: 8,
          bytes: anchor.utils.bytes.bs58.encode(
            epochInfo.account.epochId.toBuffer("le", 8)
          ),
        },
      },
    ]);
    console.log(`      Found ${proposals.length} proposals for this epoch.`);

    const hasActiveProposal = proposals.some(
      (proposal) => "active" in proposal.account.status
    );

    if (hasActiveProposal) {
      console.log(
        `      -> Epoch ${epochInfo.account.epochId.toString()} has active proposals. Adding to processing list.`
      );
      epochsToProcess.push(epochInfo);
    } else {
      console.log(
        `      -> Epoch ${epochInfo.account.epochId.toString()} has no active proposals. Needs marking processed.`
      );
      // Important : Inclure aussi les époques sans proposition active
      // car processEpoch va maintenant les gérer et appeler markEpochProcessed.
      epochsToProcess.push(epochInfo);
    }
  }

  return epochsToProcess;
}

/**
 * Traite une époque: met à jour le statut des propositions actives et marque l'époque comme traitée.
 * Retourne un statut de succès/échec pour cette époque spécifique.
 */
async function processEpoch(
  program: anchor.Program<any>,
  adminAuthority: anchor.web3.Keypair,
  epochPda: PublicKey,
  epochAccount: EpochAccount
): Promise<{ success: boolean; message: string }> {
  const epochId = epochAccount.epochId;
  console.log(`   Processing Epoch ID: ${epochId.toString()}`);

  const [programConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const programAccounts = program.account as unknown as ProgramAccounts;

  let activeProposals: TokenProposalInfo[] = [];
  let successCount = 0;
  let errorCount = 0;
  let processingError = null;

  try {
    // 1. Récupérer les propositions actives
    console.log(`      Fetching proposals for epoch ${epochId.toString()}...`);
    const proposals = await programAccounts.tokenProposal.all([
      {
        memcmp: {
          offset: 8,
          bytes: anchor.utils.bytes.bs58.encode(epochId.toBuffer("le", 8)),
        },
      },
    ]);
    console.log(
      `      Found ${proposals.length} total proposals for this epoch.`
    );

    activeProposals = proposals.filter((p) => "active" in p.account.status);

    if (activeProposals.length === 0) {
      console.log(
        `      -> No active proposals left to process for epoch ${epochId.toString()}.`
      );
    } else {
      console.log(
        `      Found ${activeProposals.length} active proposals to process.`
      );
      // 2. Trier par sol_raised (décroissant)
      activeProposals.sort((a, b) =>
        b.account.solRaised.cmp(a.account.solRaised)
      );

      const top10 = activeProposals.slice(0, 10);
      const others = activeProposals.slice(10);
      console.log(`      -> Top 10 proposals identified (${top10.length}).`);
      console.log(`      -> Others proposals identified (${others.length}).`);

      // 3. Envoyer les transactions de mise à jour
      console.log(`      Sending update transactions...`);
      for (const proposalInfo of top10) {
        console.log(
          `         -> Updating ${proposalInfo.publicKey.toBase58()} to Validated`
        );
        try {
          // Utiliser any pour éviter les problèmes de typage profond
          const updateMethod = program.methods.updateProposalStatus({
            validated: {},
          }) as any;
          const tx = await updateMethod
            .accounts({
              authority: adminAuthority.publicKey,
              programConfig: programConfigPda,
              epochManagement: epochPda,
              proposal: proposalInfo.publicKey,
            })
            .signers([adminAuthority])
            .rpc();
          console.log(`            ✅ Success (Tx: ${tx.substring(0, 8)}...)`);
          successCount++;
        } catch (err: any) {
          console.error(
            `         ❌ Failed to update ${proposalInfo.publicKey.toBase58()} to Validated:`,
            err.message
          );
          errorCount++;
        }
      }
      for (const proposalInfo of others) {
        console.log(
          `         -> Updating ${proposalInfo.publicKey.toBase58()} to Rejected`
        );
        try {
          // Utiliser any pour éviter les problèmes de typage profond
          const updateMethod = program.methods.updateProposalStatus({
            rejected: {},
          }) as any;
          const tx = await updateMethod
            .accounts({
              authority: adminAuthority.publicKey,
              programConfig: programConfigPda,
              epochManagement: epochPda,
              proposal: proposalInfo.publicKey,
            })
            .signers([adminAuthority])
            .rpc();
          console.log(`            ✅ Success (Tx: ${tx.substring(0, 8)}...)`);
          successCount++;
        } catch (err: any) {
          console.error(
            `         ❌ Failed to update ${proposalInfo.publicKey.toBase58()} to Rejected:`,
            err.message
          );
          errorCount++;
        }
      }
    }
    console.log(
      `      Finished processing proposals for epoch ${epochId.toString()}. Success: ${successCount}, Errors: ${errorCount}`
    );
  } catch (err: any) {
    console.error(
      `      ❌ Error during proposal processing for epoch ${epochId.toString()}:`,
      err
    );
    processingError = err; // Sauvegarder l'erreur pour le retour
  }

  // 4. Marquer l'époque comme traitée (même s'il y a eu des erreurs sur les props, mais pas si la récupération a échoué)
  // On essaie de marquer si l'étape de processing a pu démarrer (pas d'erreur avant)
  let markedProcessed = false;
  if (!processingError) {
    // On marque même si errorCount > 0, car on ne veut pas retraiter indéfiniment.
    // La condition `errorCount < activeProposals.length` était peut-être trop stricte.
    console.log(
      `      Attempting to mark epoch ${epochId.toString()} as processed...`
    );
    try {
      // Utiliser any pour éviter les problèmes de typage profond
      const markMethod = program.methods.markEpochProcessed() as any;
      const tx = await markMethod
        .accounts({
          authority: adminAuthority.publicKey,
          epochManagement: epochPda,
        })
        .signers([adminAuthority])
        .rpc();
      console.log(
        `         ✅ Epoch marked as processed (Tx: ${tx.substring(0, 8)}...)`
      );
      markedProcessed = true;
    } catch (err: any) {
      console.error(
        `         ❌ Failed to mark epoch ${epochId.toString()} as processed:`,
        err.message
      );
      processingError = processingError || err; // Garder la première erreur ou celle du marquage
    }
  } else {
    console.warn(
      `      Skipping marking epoch ${epochId.toString()} as processed due to prior error.`
    );
  }

  // Retourner le statut final pour cette époque
  if (processingError) {
    return {
      success: false,
      message: `Failed to process epoch ${epochId.toString()}: ${
        processingError.message
      }`,
    };
  } else if (!markedProcessed) {
    return {
      success: false,
      message: `Failed to mark epoch ${epochId.toString()} as processed, but proposals might be updated.`,
    }; // Cas étrange
  } else {
    return {
      success: true,
      message: `Epoch ${epochId.toString()} processed successfully.`,
    };
  }
}
