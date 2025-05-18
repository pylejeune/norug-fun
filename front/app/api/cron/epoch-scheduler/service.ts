import { Programs } from "@/idl/programs";
import {
  createAnchorWallet,
  getAdminKeypair,
  getProgram,
  RPC_ENDPOINT,
  AnchorWallet as UtilsAnchorWallet,
} from "@/lib/utils";
import { BN, Program } from "@coral-xyz/anchor";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

// --- Définition des interfaces ---

// Résultats des tests
export interface TestResults {
  success: boolean;
  details: {
    epochsChecked: number;
    epochsToClose: number;
    epochsClosed: number;
    errors: string[];
  };
  epochs?: any[];
  timestamp?: string;
  environment?: string;
  rpcEndpoint?: string;
  newEpochCreated?: {
    success: boolean;
    epochId?: string;
    signature?: string;
    errors?: string[];
  };
}

// Définir une interface complète pour l'IDL pour résoudre les problèmes de typage
interface IDLInstruction {
  name: string;
  discriminator: number[];
  accounts: {
    name: string;
    writable?: boolean;
    signer?: boolean;
    pda?: any;
    address?: string;
  }[];
  args: {
    name: string;
    type: string | any;
  }[];
}

/**
 * Crée une nouvelle époque dans le programme Solana
 */
export async function createNewEpoch(
  program: any,
  connection: Connection,
  wallet: AnchorWallet,
  adminKeypair: Keypair
): Promise<{
  success: boolean;
  errors: string[];
  signature?: string;
  message?: string;
  epochId?: string;
}> {
  const errors: string[] = [];

  if (program && program.methods && program.methods.startEpoch) {
    console.log(`🔄 Création d'une nouvelle époque...`);

    try {
      // Générer un nouvel ID d'époque (timestamp actuel)
      const newEpochId = new BN(Math.floor(Date.now() / 1000));

      // Définir les heures de début et de fin
      const startTime = new BN(Math.floor(Date.now() / 1000));
      const oneDay = 60 * 60 * 24; // 24 heures en secondes
      const endTime = new BN(startTime.toNumber() + oneDay); // 24 heures (1 jour)

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
      console.log(
        `- Fin: ${new Date(endTime.toNumber() * 1000).toISOString()}`
      );

      try {
        // Construction des comptes pour la transaction
        const accounts = {
          authority: adminKeypair.publicKey,
          epochManagement: epochManagementPDA,
          systemProgram: SystemProgram.programId,
        };

        console.log("📋 Comptes utilisés pour la transaction:", accounts);
        console.log(
          "🔑 Signataire utilisé:",
          adminKeypair.publicKey.toString()
        );

        // Utilisation directe de la méthode Anchor
        console.log(
          "🚀 Envoi de la transaction avec program.methods.startEpoch..."
        );
        const signature = await program.methods
          .startEpoch(newEpochId, startTime, endTime)
          .accounts(accounts)
          .signers([adminKeypair])
          .rpc();

        console.log(
          `✅ Transaction pour créer une nouvelle époque envoyée! Signature: ${signature}`
        );

        // Vérification immédiate sans attendre
        try {
          const status = await connection.getSignatureStatus(signature);
          console.log(`📊 Statut initial: ${JSON.stringify(status || {})}`);
        } catch (statusErr) {
          console.log(
            `⚠️ Impossible de récupérer le statut initial: ${
              statusErr instanceof Error ? statusErr.message : String(statusErr)
            }`
          );
        }

        console.log(`\n📝 La nouvelle époque a été créée sur le réseau.`);
        console.log(
          `📝 Vérifiez son statut sur l'explorateur: https://explorer.solana.com/tx/${signature}?cluster=devnet`
        );

        return {
          success: true,
          errors: [],
          signature: signature,
          epochId: newEpochId.toString(),
          message:
            "Nouvelle époque créée. Le traitement peut prendre quelques instants.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("❌ Erreur lors de la création de l'époque:", errorMsg);

        errors.push(`Erreur lors de la création de l'époque: ${errorMsg}`);
        return { success: false, errors };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(
        "❌ Erreur lors de la préparation de l'instruction:",
        errorMsg
      );

      errors.push(
        `Erreur de préparation pour la création de l'époque: ${errorMsg}`
      );
      return { success: false, errors };
    }
  } else {
    const errorMsg =
      "La méthode startEpoch n'est pas disponible sur le programme";
    console.error("❌ " + errorMsg);

    errors.push(errorMsg);
    return { success: false, errors };
  }
}

/**
 * Fonction principale pour vérifier les époques et fermer celles qui sont terminées
 */
export async function checkAndSimulateEndEpoch(): Promise<TestResults> {
  const results: TestResults = {
    success: true,
    details: {
      epochsChecked: 0,
      epochsToClose: 0,
      epochsClosed: 0,
      errors: [],
    },
  };

  try {
    const connection = new Connection(RPC_ENDPOINT);
    let adminKeypair;

    try {
      adminKeypair = getAdminKeypair();
      console.log(
        "🔑 Admin keypair généré avec succès:",
        adminKeypair.publicKey.toString()
      );
    } catch (error) {
      console.error(
        "❌ Impossible d'obtenir le keypair admin:",
        error instanceof Error ? error.message : String(error)
      );
      results.success = false;
      results.details.errors.push(
        `Erreur avec le keypair admin: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return results;
    }

    // Création du wallet avec le keypair admin
    const wallet = createAnchorWallet(adminKeypair);

    const program = getProgram(connection, wallet);

    if (!program) {
      results.success = false;
      results.details.errors.push("Programme non initialisé");
      return results;
    }

    // Récupérer toutes les époques
    console.log("\n--- Récupération des époques ---");
    const epochs = await getAllEpochs(connection, wallet);
    results.epochs = epochs;

    // Compter les époques actives
    let activeEpochs: any[] = [];

    // Traiter les résultats selon le format retourné
    if (Array.isArray(epochs)) {
      // Si c'est un tableau simple d'époques
      activeEpochs = epochs.filter((epoch) => epoch.status === "active");
      results.details.epochsChecked = activeEpochs.length;
    } else if (epochs && typeof epochs === "object") {
      // Si c'est un objet avec différents types d'époques
      // Chercher les comptes actifs dans les différents types
      Object.values(epochs).forEach((group: any) => {
        if (group.accounts && Array.isArray(group.accounts)) {
          activeEpochs = activeEpochs.concat(group.accounts);
          results.details.epochsChecked += group.accounts.length;
        }
      });
    }

    console.log(
      `📊 Nombre d'époques actives trouvées: ${results.details.epochsChecked}`
    );

    // Pour chaque époque active, vérifier si elle doit être fermée
    for (const epoch of activeEpochs) {
      try {
        // Extraire les informations de l'époque selon le format
        const epochId =
          epoch.epochId || epoch.data?.epochId?.toString() || "N/A";
        const endTimeStr =
          epoch.endTime || epoch.data?.endTime?.toString() || "N/A";
        let endTime;

        // Convertir l'endTime en nombre si possible
        try {
          if (
            epoch.data?.endTime &&
            typeof epoch.data.endTime.toNumber === "function"
          ) {
            endTime = epoch.data.endTime.toNumber();
          } else if (endTimeStr !== "N/A") {
            endTime = new Date(endTimeStr).getTime() / 1000;
          }
        } catch (err) {
          console.error(
            `❌ Erreur lors de la conversion de endTime pour l'époque ${epochId}:`,
            err
          );
        }

        const currentTime = Math.floor(Date.now() / 1000);

        console.log(`\n📅 Vérification de l'époque ${epochId}:`);
        console.log(
          `⏰ Heure actuelle: ${new Date(currentTime * 1000).toISOString()}`
        );

        if (endTime) {
          console.log(
            `⌛ Heure de fin: ${new Date(endTime * 1000).toISOString()}`
          );

          // Vérifier si l'époque doit être terminée
          if (currentTime >= endTime) {
            console.log(`🔔 L'époque ${epochId} doit être fermée`);
            results.details.epochsToClose++;

            // Simuler l'appel à endEpoch
            const simResult = await simulateEndEpoch(
              program,
              connection,
              wallet,
              adminKeypair,
              epochId
            );
            if (!simResult.success) {
              results.details.errors = results.details.errors.concat(
                simResult.errors
              );
            } else {
              // Incrémenter le compteur si l'opération a réussi
              results.details.epochsClosed++;
            }
          } else {
            console.log(
              `⏳ L'époque ${epochId} est toujours active (temps restant: ${Math.floor(
                (endTime - currentTime) / 60
              )} minutes)`
            );
          }
        } else {
          console.log(
            `⚠️ Impossible de déterminer l'heure de fin pour l'époque ${epochId}`
          );
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `❌ Erreur lors de la vérification de l'époque:`,
          errorMsg
        );
        results.details.errors.push(
          `Erreur lors de la vérification d'une époque: ${errorMsg}`
        );
      }
    }

    // Vérifier s'il reste des époques actives après les fermetures
    // Si toutes les époques ont été fermées, créer une nouvelle époque
    console.log(
      `\n--- Vérification du besoin de créer une nouvelle époque ---`
    );

    // Récupérer à nouveau les époques pour s'assurer que nous avons l'état le plus récent
    const updatedEpochs = await getAllEpochs(connection, wallet);
    let remainingActiveEpochs = 0;

    // Compter les époques actives restantes
    if (Array.isArray(updatedEpochs)) {
      remainingActiveEpochs = updatedEpochs.filter(
        (epoch) => epoch.status === "active"
      ).length;
    } else if (updatedEpochs && typeof updatedEpochs === "object") {
      Object.values(updatedEpochs).forEach((group: any) => {
        if (group.accounts && Array.isArray(group.accounts)) {
          remainingActiveEpochs += group.accounts.length;
        }
      });
    }

    console.log(
      `📊 Époques actives restantes après fermeture: ${remainingActiveEpochs}`
    );

    // S'il n'y a plus d'époques actives, en créer une nouvelle
    if (remainingActiveEpochs === 0) {
      console.log(
        `⚠️ Aucune époque active restante. Vérification du solde du wallet admin...`
      );

      // Vérifier le solde du wallet admin avant de créer une nouvelle époque
      try {
        const adminBalance = await connection.getBalance(
          adminKeypair.publicKey
        );
        const adminBalanceSOL = adminBalance / 1_000_000_000; // Convertir lamports en SOL
        console.log(
          `💰 Solde du wallet admin: ${adminBalanceSOL} SOL (${adminBalance} lamports)`
        );

        // Estimation du coût minimum pour créer un compte (époque)
        // La taille approximative du compte EpochManagement + frais de transaction
        const rentExemptionAmount =
          await connection.getMinimumBalanceForRentExemption(100); // Taille approximative en bytes
        const estimatedFees = 5000; // Frais de transaction estimés en lamports
        const estimatedCost = rentExemptionAmount + estimatedFees;

        console.log(
          `💸 Coût estimé pour créer une époque: ${
            estimatedCost / 1_000_000_000
          } SOL (${estimatedCost} lamports)`
        );

        if (adminBalance >= estimatedCost) {
          console.log(
            `✅ Le wallet admin a suffisamment de fonds pour créer une nouvelle époque`
          );

          const createResult = await createNewEpoch(
            program,
            connection,
            wallet,
            adminKeypair
          );
          if (createResult.success) {
            console.log(
              `✅ Nouvelle époque créée avec l'ID: ${createResult.epochId}`
            );
            // Ajouter l'information dans les résultats
            results.newEpochCreated = {
              success: true,
              epochId: createResult.epochId,
              signature: createResult.signature,
            };
          } else {
            console.error(
              `❌ Échec de la création d'une nouvelle époque:`,
              createResult.errors
            );
            results.details.errors = results.details.errors.concat(
              createResult.errors
            );
            results.newEpochCreated = {
              success: false,
              errors: createResult.errors,
            };
          }
        } else {
          const errorMsg = `Le wallet admin n'a pas assez de fonds pour créer une nouvelle époque. Nécessaire: ${
            estimatedCost / 1_000_000_000
          } SOL, Disponible: ${adminBalanceSOL} SOL`;
          console.error(`❌ ${errorMsg}`);
          results.details.errors.push(errorMsg);
          results.newEpochCreated = {
            success: false,
            errors: [errorMsg],
          };
        }
      } catch (error) {
        const errorMsg = `Erreur lors de la vérification du solde: ${
          error instanceof Error ? error.message : String(error)
        }`;
        console.error(`❌ ${errorMsg}`);
        results.details.errors.push(errorMsg);
        results.newEpochCreated = {
          success: false,
          errors: [errorMsg],
        };
      }
    }

    return results;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Erreur lors de la vérification des époques:", errorMsg);

    results.success = false;
    results.details.errors.push(`Erreur globale: ${errorMsg}`);
    return results;
  }
}

/**
 * Fonction pour simuler l'appel à endEpoch
 */
async function simulateEndEpoch(
  program: any,
  connection: Connection,
  wallet: AnchorWallet,
  adminKeypair: Keypair,
  epochId: any
): Promise<{
  success: boolean;
  errors: string[];
  signature?: string;
  message?: string;
}> {
  const errors: string[] = [];

  if (program && program.methods && program.methods.endEpoch) {
    console.log(`🧪 Simulation d'appel à endEpoch pour l'époque ${epochId}...`);

    try {
      // Convertir epochId en BN si nécessaire
      let bnEpochId = epochId;
      if (typeof epochId === "string" && epochId !== "N/A") {
        bnEpochId = new BN(epochId);
      } else if (typeof epochId === "number") {
        bnEpochId = new BN(epochId);
      }

      // Dériver la PDA pour epoch_management avec l'epochId
      const [epochManagementPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("epoch"), new BN(bnEpochId).toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      console.log(
        "🔑 PDA généré pour epoch_management:",
        epochManagementPDA.toString()
      );

      // Vérifier si le compte existe
      const accountInfo = await connection.getAccountInfo(epochManagementPDA);
      console.log(
        "ℹ️ État du compte:",
        accountInfo ? "Existant" : "N'existe pas"
      );

      if (!accountInfo) {
        errors.push(`Le compte pour l'époque ${epochId} n'existe pas`);
        return { success: false, errors };
      }

      // Dériver la PDA pour la configuration
      const [configPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        program.programId
      );
      console.log("🔑 PDA de configuration:", configPDA.toString());

      try {
        // Construction des comptes pour la transaction
        const accounts = {
          epochManagement: epochManagementPDA,
          authority: adminKeypair.publicKey,
          program_config: configPDA,
          systemProgram: SystemProgram.programId,
        };

        console.log("📋 Comptes utilisés pour la transaction:", accounts);
        console.log(
          "🔑 Signataire utilisé:",
          adminKeypair.publicKey.toString()
        );
        console.log("📝 Argument epochId:", bnEpochId.toString());

        // Utilisation directe de la méthode Anchor comme dans epoch_scheduler.ts
        console.log(
          "🚀 Envoi de la transaction avec program.methods.endEpoch..."
        );
        const signature = await program.methods
          .endEpoch(bnEpochId)
          .accounts(accounts)
          .signers([adminKeypair])
          .rpc();

        console.log(`✅ Transaction envoyée! Signature: ${signature}`);

        // Vérification immédiate sans attendre
        try {
          const status = await connection.getSignatureStatus(signature);
          console.log(`📊 Statut initial: ${JSON.stringify(status || {})}`);
        } catch (statusErr) {
          console.log(
            `⚠️ Impossible de récupérer le statut initial: ${
              statusErr instanceof Error ? statusErr.message : String(statusErr)
            }`
          );
        }

        console.log(`\n📝 La transaction a été envoyée au réseau.`);
        console.log(
          `📝 Vérifiez son statut sur l'explorateur: https://explorer.solana.com/tx/${signature}?cluster=devnet`
        );

        return {
          success: true,
          errors: [],
          signature: signature,
          message:
            "Transaction envoyée au réseau. Le traitement peut prendre quelques instants.",
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          "❌ Erreur lors de la simulation ou de l'exécution:",
          errorMsg
        );

        errors.push(`Erreur pour l'époque ${epochId}: ${errorMsg}`);
        return { success: false, errors };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(
        "❌ Erreur lors de la préparation de l'instruction:",
        errorMsg
      );

      errors.push(
        `Erreur de préparation pour l'époque ${epochId}: ${errorMsg}`
      );
      return { success: false, errors };
    }
  } else {
    const errorMsg =
      "La méthode endEpoch n'est pas disponible sur le programme";
    console.error("❌ " + errorMsg);

    errors.push(errorMsg);
    return { success: false, errors };
  }
}

/**
 * Fonction pour récupérer toutes les époques
 */
export async function getAllEpochs(
  connection: Connection,
  wallet: AnchorWallet
) {
  const compatibleWallet = getCompatibleWallet(wallet);
  const program = getProgram(connection, compatibleWallet) as Program<Programs>;

  if (!program) return [];

  try {
    const allEpochs = await program.account.epochManagement.all();
    return allEpochs.map((epoch: any) => ({
      epochId: epoch.account.epochId.toString(),
      startTime: epoch.account.startTime.toNumber(),
      endTime: epoch.account.endTime.toNumber(),
      status: epoch.account.status,
      publicKey: epoch.publicKey,
    }));
  } catch (err) {
    console.error("Error fetching epochs:", err);
    return [];
  }
}

// Fonction pour convertir le wallet au bon format
const getCompatibleWallet = (wallet: AnchorWallet) => ({
  publicKey: wallet.publicKey,
  signTransaction:
    wallet.signTransaction as UtilsAnchorWallet["signTransaction"],
  signAllTransactions:
    wallet.signAllTransactions as UtilsAnchorWallet["signAllTransactions"],
});
