import { NextRequest } from "next/server";
import { randomUUID } from 'crypto';
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// Polyfill pour __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importer l'IDL directement 
import idlJson from "../shared/programs.json";

// Configuration simple
const RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || "https://api.devnet.solana.com";

// Note: La structure de l'IDL peut différer
const idlAddress = "address" in idlJson 
  ? (idlJson as any).address
  : (idlJson as any).metadata?.address || "3HBzNutk8DrRfffCS74S55adJAjgY8NHrWXgRtABaSbF";

// Récupération de la seed admin depuis les variables d'environnement
const ADMIN_SEED_BASE64 = process.env.ADMIN_SEED_BASE64;

console.log("📝 Adresse du programme trouvée:", idlAddress);
const PROGRAM_ID = new PublicKey(idlAddress);

// Préparer l'IDL pour Anchor - identique à program.ts
const idl = {
  ...idlJson as any,
  address: idlAddress // S'assurer que l'adresse est toujours disponible à la racine
};

console.log("📝 IDL Details:", {
  name: idl.metadata?.name || "Unknown",
  version: idl.metadata?.version || "Unknown",
  address: idl.address,
});

// Log des instructions disponibles
console.log("📝 Instructions disponibles:", idl.instructions?.map((ix: any) => ix.name) || []);

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

// Définir l'interface pour le wallet Anchor
interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction: <T>(tx: T) => Promise<T>;
  signAllTransactions: <T>(txs: T[]) => Promise<T[]>;
}

// Fonction pour vérifier le token d'authentification
function verifyAuthToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    console.error('❌ En-tête Authorization manquant');
    return false;
  }

  const token = authHeader.replace('Bearer ', '');
  const expectedToken = process.env.API_SECRET_KEY;

  if (!expectedToken) {
    console.error('❌ API_SECRET_KEY non défini dans les variables d\'environnement');
    return false;
  }

  return token === expectedToken;
}

// Fonction pour générer le keypair admin à partir de la seed stockée en Base64
function getAdminKeypair(): Keypair {
  if (!ADMIN_SEED_BASE64) {
    throw new Error("ADMIN_SEED_BASE64 n'est pas défini dans les variables d'environnement ou est vide");
  }
  
  try {
    const seedBuffer = Buffer.from(ADMIN_SEED_BASE64, 'base64');
    if (seedBuffer.length === 32) {
        console.log("✅ Utilisation de Keypair.fromSeed() car seedBuffer fait 32 bytes.");
        return Keypair.fromSeed(seedBuffer);
    } else if (seedBuffer.length === 64) {
        console.log("✅ Utilisation de Keypair.fromSecretKey() car seedBuffer fait 64 bytes.");
        return Keypair.fromSecretKey(seedBuffer);
    } else {
        console.error(`❌ Taille de seedBuffer inattendue: ${seedBuffer.length} bytes. Devrait être 32 ou 64.`);
        throw new Error(`Taille de seedBuffer après décodage Base64 inattendue: ${seedBuffer.length}`);
    }
  } catch (error) {
    console.error("❌ Erreur lors de la génération du keypair admin (détail):", error instanceof Error ? error.message : String(error));
    throw new Error(`Impossible de générer le keypair admin: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Fonction pour obtenir le programme Anchor - Identique à program.ts
function getProgram(connection: Connection, wallet?: AnchorWallet | null) {
  try {
    // Création du provider avec le wallet et la connexion
    const provider = new AnchorProvider(
      connection,
      wallet ?? ({} as AnchorWallet), // allow "read-only" mode comme dans program.ts
      { preflightCommitment: "processed" }
    );

    if (wallet) {
      console.log("⚙️ Création du provider avec wallet:", wallet.publicKey.toString());
    } else {
      console.log("⚙️ Création du provider en mode lecture seule");
    }
    
    // Création du programme - EXACTEMENT comme dans program.ts
    console.log("⚙️ Création du programme avec IDL complet...");
    const program = new Program(idl as any, provider);
    
    return program;
  } catch (error) {
    console.error("❌ Error creating program:", error);
    return null;
  }
}

/**
 * Exécute la logique principale du Crank.
 * Charge la configuration depuis les variables d'environnement.
 * @returns Un objet indiquant le succès ou l'échec et potentiellement des détails.
 */
async function runCrankLogic(): Promise<{ success: boolean; message: string; details?: any }> {
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
        const wallet: AnchorWallet = {
            publicKey: adminKeypair.publicKey,
            signTransaction: async <T>(tx: T): Promise<T> => {
                if (tx instanceof Transaction) {
                    tx.partialSign(adminKeypair);
                }
                return tx;
            },
            signAllTransactions: async <T>(txs: T[]): Promise<T[]> => {
                return txs.map(tx => {
                    if (tx instanceof Transaction) {
                        tx.partialSign(adminKeypair);
                    }
                    return tx;
                });
            },
        };
        
        const program = getProgram(connection, wallet);
        
        if (!program) {
            return { success: false, message: "Programme non initialisé" };
        }
    
        // --- Logique Principale --- 
        console.log("\n🔍 Finding closed epochs to process...");
        // Utiliser directement les fonctions internes ici
        const untreatedEpochs = await findClosedUntreatedEpochs(program);

        let processedCount = 0;
        let errorDetails: { epochId: string, error: string }[] = [];

        if (untreatedEpochs.length === 0) {
            console.log("   -> No untreated closed epochs found.");
        } else {
            console.log(`   -> Found ${untreatedEpochs.length} untreated epoch(s).`);
            console.log("\n⚙️ Processing epochs...");
            for (const epochInfo of untreatedEpochs) {
                // Passer l'adminKeypair à processEpoch
                const result = await processEpoch(program, adminKeypair, epochInfo.publicKey, epochInfo.account);
                if (result.success) {
                    processedCount++;
                } else {
                    errorDetails.push({ epochId: epochInfo.account.epochId.toString(), error: result.message });
                }
            }
        }

        console.log("\n✅ Crank logic finished.");
        return { 
            success: true, 
            message: `Crank logic finished. Processed ${processedCount} epoch(s).`,
            details: { processedCount, errors: errorDetails }
        };

    } catch (error: any) {
        console.error("\n❌ An error occurred during the crank logic execution:", error);
        return { success: false, message: `An error occurred: ${error.message}` };
    }
}

/**
 * Trouve les époques fermées et non traitées qui ont encore des propositions actives.
 */
async function findClosedUntreatedEpochs(program: anchor.Program<any>): Promise<EpochManagementAccountInfo[]> {
    console.log("   Fetching all epochs...");
    
    // Cast des comptes du programme pour avoir des types corrects
    const programAccounts = program.account as unknown as ProgramAccounts;
    
    const allEpochs: EpochManagementAccountInfo[] = await programAccounts.epochManagement.all();
    console.log(`   Found ${allEpochs.length} total epochs.`);

    const closedUntreatedEpochs = allEpochs.filter(epoch => 
        ('closed' in epoch.account.status) && !epoch.account.processed 
    );
    console.log(`   Found ${closedUntreatedEpochs.length} closed and untreated epochs.`);

    const epochsToProcess: EpochManagementAccountInfo[] = []; 
    for (const epochInfo of closedUntreatedEpochs) { 
        console.log(`   Checking epoch ${epochInfo.account.epochId.toString()} for active proposals...`);
        
        const proposals = await programAccounts.tokenProposal.all([
            { memcmp: { offset: 8, bytes: anchor.utils.bytes.bs58.encode(epochInfo.account.epochId.toBuffer("le", 8)) } } 
        ]);
        console.log(`      Found ${proposals.length} proposals for this epoch.`);

        const hasActiveProposal = proposals.some(proposal => 
            'active' in proposal.account.status
        );

        if (hasActiveProposal) {
            console.log(`      -> Epoch ${epochInfo.account.epochId.toString()} has active proposals. Adding to processing list.`);
            epochsToProcess.push(epochInfo); 
        } else {
            console.log(`      -> Epoch ${epochInfo.account.epochId.toString()} has no active proposals. Needs marking processed.`);
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
    adminAuthority: Keypair,
    epochPda: PublicKey,
    epochAccount: EpochAccount
): Promise<{ success: boolean; message: string}> {
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
            { memcmp: { offset: 8, bytes: anchor.utils.bytes.bs58.encode(epochId.toBuffer("le", 8)) } }
        ]);
        console.log(`      Found ${proposals.length} total proposals for this epoch.`);

        activeProposals = proposals.filter(p => 
            'active' in p.account.status
        );
        
        if (activeProposals.length === 0) {
            console.log(`      -> No active proposals left to process for epoch ${epochId.toString()}.`);
        } else {
            console.log(`      Found ${activeProposals.length} active proposals to process.`);
            // 2. Trier par sol_raised (décroissant)
            activeProposals.sort((a, b) => b.account.solRaised.cmp(a.account.solRaised));

            const top10 = activeProposals.slice(0, 10);
            const others = activeProposals.slice(10);
            console.log(`      -> Top 10 proposals identified (${top10.length}).`);
            console.log(`      -> Others proposals identified (${others.length}).`);

            // 3. Envoyer les transactions de mise à jour
            console.log(`      Sending update transactions...`);
            for (const proposalInfo of top10) {
                console.log(`         -> Updating ${proposalInfo.publicKey.toBase58()} to Validated`);
                try {
                    // Utiliser any pour éviter les problèmes de typage profond
                    const updateMethod = program.methods.updateProposalStatus({ validated: {} }) as any;
                    const tx = await updateMethod
                        .accounts({ 
                            authority: adminAuthority.publicKey, 
                            programConfig: programConfigPda, 
                            epochManagement: epochPda, 
                            proposal: proposalInfo.publicKey 
                        })
                        .signers([adminAuthority])
                        .rpc();
                    console.log(`            ✅ Success (Tx: ${tx.substring(0, 8)}...)`);
                    successCount++;
                } catch (err: any) {
                    console.error(`         ❌ Failed to update ${proposalInfo.publicKey.toBase58()} to Validated:`, err.message);
                    errorCount++;
                }
            }
            for (const proposalInfo of others) {
                console.log(`         -> Updating ${proposalInfo.publicKey.toBase58()} to Rejected`);
                try {
                    // Utiliser any pour éviter les problèmes de typage profond
                    const updateMethod = program.methods.updateProposalStatus({ rejected: {} }) as any;
                    const tx = await updateMethod
                        .accounts({ 
                            authority: adminAuthority.publicKey, 
                            programConfig: programConfigPda, 
                            epochManagement: epochPda, 
                            proposal: proposalInfo.publicKey 
                        })
                        .signers([adminAuthority])
                        .rpc();
                    console.log(`            ✅ Success (Tx: ${tx.substring(0, 8)}...)`);
                    successCount++;
                } catch (err: any) {
                    console.error(`         ❌ Failed to update ${proposalInfo.publicKey.toBase58()} to Rejected:`, err.message);
                    errorCount++;
                }
            }
        }
        console.log(`      Finished processing proposals for epoch ${epochId.toString()}. Success: ${successCount}, Errors: ${errorCount}`);

    } catch (err: any) {
        console.error(`      ❌ Error during proposal processing for epoch ${epochId.toString()}:`, err);
        processingError = err; // Sauvegarder l'erreur pour le retour
    }

    // 4. Marquer l'époque comme traitée (même s'il y a eu des erreurs sur les props, mais pas si la récupération a échoué)
    // On essaie de marquer si l'étape de processing a pu démarrer (pas d'erreur avant)
    let markedProcessed = false;
    if (!processingError) { 
        // On marque même si errorCount > 0, car on ne veut pas retraiter indéfiniment.
        // La condition `errorCount < activeProposals.length` était peut-être trop stricte.
        console.log(`      Attempting to mark epoch ${epochId.toString()} as processed...`);
        try {
            // Utiliser any pour éviter les problèmes de typage profond
            const markMethod = program.methods.markEpochProcessed() as any;
            const tx = await markMethod
                .accounts({ 
                    authority: adminAuthority.publicKey, 
                    epochManagement: epochPda 
                })
                .signers([adminAuthority])
                .rpc();
            console.log(`         ✅ Epoch marked as processed (Tx: ${tx.substring(0, 8)}...)`);
            markedProcessed = true;
        } catch (err: any) {
            console.error(`         ❌ Failed to mark epoch ${epochId.toString()} as processed:`, err.message);
             processingError = processingError || err; // Garder la première erreur ou celle du marquage
        }
    } else {
        console.warn(`      Skipping marking epoch ${epochId.toString()} as processed due to prior error.`);
    }

    // Retourner le statut final pour cette époque
    if (processingError) {
        return { success: false, message: `Failed to process epoch ${epochId.toString()}: ${processingError.message}`};
    } else if (!markedProcessed) {
         return { success: false, message: `Failed to mark epoch ${epochId.toString()} as processed, but proposals might be updated.`}; // Cas étrange
    } else {
        return { success: true, message: `Epoch ${epochId.toString()} processed successfully.` };
    }
}

// Handler pour les requêtes GET
export async function GET(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🚀 Démarrage de l'exécution du crank...`);

  // Vérification du token d'authentification
  if (!verifyAuthToken(request)) {
    console.error(`[${requestId}] ❌ Authentification échouée`);
    return new Response(JSON.stringify({
      success: false,
      error: 'Non autorisé',
      errorType: 'AuthenticationError',
      timestamp: new Date().toISOString(),
      requestId,
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Exécuter la logique du crank directement
    const result = await runCrankLogic();
    console.log(`\n[${requestId}] ✅ Exécution du crank terminée`);
    
    // Si le traitement a réussi
    if (result.success) {
      console.log(`[${requestId}] 📊 Résumé: ${result.message}`);
      if (result.details) {
        console.log(`[${requestId}] 📈 Détails: ${result.details.processedCount} époque(s) traitée(s)`);
      }
    } else {
      console.log(`[${requestId}] ⚠️ Le crank a rencontré un problème: ${result.message}`);
    }
    
    return new Response(JSON.stringify({
      ...result,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      requestId,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorType = error instanceof Error ? error.name : typeof error;
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`[${requestId}] ❌ Erreur lors de l'exécution du crank:`, errorMsg, errorStack);
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMsg,
      errorType,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      requestId,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}