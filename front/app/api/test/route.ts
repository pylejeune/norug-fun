import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection, SystemProgram, Transaction } from "@solana/web3.js";
import { BN, Program, AnchorProvider } from "@coral-xyz/anchor";
import { NextRequest } from "next/server";

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

// Importer l'IDL localement 
import idlJson from "../epoch-scheduler/idl/programs.json";

// Configuration simple
const RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || "https://api.devnet.solana.com";

// Note: La structure de l'IDL diffère entre front/context/idl/programs.json (adresse à la racine)
// et front/app/api/epoch-scheduler/idl/programs.json (adresse dans metadata)
const idlAddress = "address" in idlJson 
  ? (idlJson as any).address
  : (idlJson as any).metadata?.address || "3HBzNutk8DrRfffCS74S55adJAjgY8NHrWXgRtABaSbF";

console.log("📝 Adresse du programme trouvée:", idlAddress);
const PROGRAM_ID = new PublicKey(idlAddress);

// Préparer l'IDL pour Anchor - identique à program.ts
const idl = {
  ...idlJson as any,
  address: idlAddress // S'assurer que l'adresse est toujours disponible à la racine
};

console.log("📝 IDL Details:", {
  name: idl.metadata.name,
  version: idl.metadata.version,
  address: idl.address,
});

// Log des instructions disponibles
console.log("📝 Instructions disponibles:", idl.instructions.map((ix: any) => ix.name));

// Définir l'interface pour le wallet Anchor
interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction: <T>(tx: T) => Promise<T>;
  signAllTransactions: <T>(txs: T[]) => Promise<T[]>;
}

// Résultats des tests
interface TestResults {
  success: boolean;
  details: {
    epochsChecked: number;
    epochsToClose: number;
    errors: string[];
  };
  epochs?: any[];
  timestamp?: string;
  environment?: string;
  rpcEndpoint?: string;
}

// Fonction pour générer un keypair aléatoire pour les tests
function getTestKeypair(): Keypair {
  return Keypair.generate();
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

// Fonction pour vérifier les époques et simuler la fermeture si nécessaire
async function checkAndSimulateEndEpoch(): Promise<TestResults> {
  const results: TestResults = {
    success: true,
    details: {
      epochsChecked: 0,
      epochsToClose: 0,
      errors: []
    }
  };
  
  try {
    const connection = new Connection(RPC_ENDPOINT);
    const keypair = getTestKeypair();
    
    // Création du wallet de test compatible AnchorProvider
    const wallet: AnchorWallet = {
      publicKey: keypair.publicKey,
      signTransaction: async <T>(tx: T): Promise<T> => tx,
      signAllTransactions: async <T>(txs: T[]): Promise<T[]> => txs,
    };
    
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
      activeEpochs = epochs.filter((epoch) => epoch.status === 'active');
      results.details.epochsChecked = activeEpochs.length;
    } else if (epochs && typeof epochs === 'object') {
      // Si c'est un objet avec différents types d'époques
      // Chercher les comptes actifs dans les différents types
      Object.values(epochs).forEach((group: any) => {
        if (group.accounts && Array.isArray(group.accounts)) {
          activeEpochs = activeEpochs.concat(group.accounts);
          results.details.epochsChecked += group.accounts.length;
        }
      });
    }
    
    console.log(`📊 Nombre d'époques actives trouvées: ${results.details.epochsChecked}`);
    
    // Pour chaque époque active, vérifier si elle doit être fermée
    for (const epoch of activeEpochs) {
      try {
        // Extraire les informations de l'époque selon le format
        const epochId = epoch.epochId || epoch.data?.epochId?.toString() || 'N/A';
        const endTimeStr = epoch.endTime || epoch.data?.endTime?.toString() || 'N/A';
        let endTime;
        
        // Convertir l'endTime en nombre si possible
        try {
          if (epoch.data?.endTime && typeof epoch.data.endTime.toNumber === 'function') {
            endTime = epoch.data.endTime.toNumber();
          } else if (endTimeStr !== 'N/A') {
            endTime = new Date(endTimeStr).getTime() / 1000;
          }
        } catch (err) {
          console.error(`❌ Erreur lors de la conversion de endTime pour l'époque ${epochId}:`, err);
        }
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        console.log(`\n📅 Vérification de l'époque ${epochId}:`);
        console.log(`⏰ Heure actuelle: ${new Date(currentTime * 1000).toISOString()}`);
        
        if (endTime) {
          console.log(`⌛ Heure de fin: ${new Date(endTime * 1000).toISOString()}`);
          
          // Vérifier si l'époque doit être terminée
          if (currentTime >= endTime) {
            console.log(`🔔 L'époque ${epochId} doit être fermée`);
            results.details.epochsToClose++;
            
            // Simuler l'appel à endEpoch
            const simResult = await simulateEndEpoch(program, connection, wallet, epochId);
            if (!simResult.success) {
              results.details.errors = results.details.errors.concat(simResult.errors);
            }
          } else {
            console.log(`⏳ L'époque ${epochId} est toujours active (temps restant: ${Math.floor((endTime - currentTime) / 60)} minutes)`);
          }
        } else {
          console.log(`⚠️ Impossible de déterminer l'heure de fin pour l'époque ${epochId}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Erreur lors de la vérification de l'époque:`, errorMsg);
        results.details.errors.push(`Erreur lors de la vérification d'une époque: ${errorMsg}`);
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

// Fonction pour simuler l'appel à endEpoch
async function simulateEndEpoch(program: any, connection: Connection, wallet: AnchorWallet, epochId: any): Promise<{success: boolean, errors: string[]}> {
  const errors: string[] = [];
  
  if (program && program.methods && program.methods.endEpoch) {
    console.log(`🧪 Simulation d'appel à endEpoch pour l'époque ${epochId}...`);
    
    try {
      // Convertir epochId en BN si nécessaire
      let bnEpochId = epochId;
      if (typeof epochId === 'string' && epochId !== 'N/A') {
        bnEpochId = new BN(epochId);
      } else if (typeof epochId === 'number') {
        bnEpochId = new BN(epochId);
      }
      
      // Dériver la PDA pour epoch_management avec l'epochId
      const [epochManagementPDA] = await PublicKey.findProgramAddressSync(
        [
          Buffer.from("epoch"),
          new BN(bnEpochId).toArrayLike(Buffer, "le", 8)
        ],
        program.programId
      );
      
      console.log("🔑 PDA généré pour epoch_management:", epochManagementPDA.toString());
      
      // Vérifier si le compte existe
      const accountInfo = await connection.getAccountInfo(epochManagementPDA);
      console.log("ℹ️ État du compte:", accountInfo ? "Existant" : "N'existe pas");
      
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
      
      // Essayer avec format camelCase (comme dans route.js)
      try {
        const tx = await program.methods
          .endEpoch(bnEpochId)
          .accounts({
            epochManagement: epochManagementPDA,
            authority: wallet.publicKey,
            program_config: configPDA,
            systemProgram: SystemProgram.programId,
          })
          .transaction();
        
        console.log("✅ Transaction créée:", tx.instructions.length, "instructions");
        
        // Ajouter le payeur de frais
        tx.feePayer = wallet.publicKey;
        
        // Simuler la transaction
        const simulationResult = await connection.simulateTransaction(tx);
        
        // Afficher les résultats de la simulation
        const simValue = {
          err: simulationResult.value.err,
          logs: simulationResult.value.logs && simulationResult.value.logs.slice(0, 5) + "..." // Tronquer les logs
        };
        console.log("⚙️ Résultat simulation:", JSON.stringify(simValue, null, 2));
        
        if (simulationResult.value.err) {
          throw new Error(`Simulation error: ${JSON.stringify(simulationResult.value.err)}`);
        }
        
        console.log("✅ Simulation réussie pour l'époque", epochId);
        return { success: true, errors: [] };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("❌ Erreur lors de la simulation:", errorMsg);
        
        errors.push(`Erreur de simulation pour l'époque ${epochId}: ${errorMsg}`);
        return { success: false, errors };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("❌ Erreur lors de la préparation de l'instruction:", errorMsg);
      
      errors.push(`Erreur de préparation pour l'époque ${epochId}: ${errorMsg}`);
      return { success: false, errors };
    }
  } else {
    const errorMsg = "La méthode endEpoch n'est pas disponible sur le programme";
    console.error("❌ " + errorMsg);
    
    errors.push(errorMsg);
    return { success: false, errors };
  }
}

// Fonction pour récupérer toutes les époques
async function getAllEpochs(connection: Connection, wallet: AnchorWallet) {
  const program = getProgram(connection, wallet);
  
  if (!program) {
    console.error("❌ Programme non initialisé");
    return [];
  }
  
  try {
    console.log("📊 Récupération des époques...");
    
    // Vérifier si le programme a la méthode account.epochManagement
    if (!program.account || !program.account.epochManagement) {
      console.log("⚠️ Le programme ne possède pas de compte epochManagement");
      
      // Alternative: essayer avec d'autres noms possibles
      const accountTypes = Object.keys(program.account || {});
      console.log("📋 Types de comptes disponibles:", accountTypes);
      
      // Essayer de trouver un compte qui pourrait contenir des informations sur les époques
      const epochAccounts = [];
      for (const accountType of accountTypes) {
        try {
          // @ts-ignore - Nous savons que nous accédons dynamiquement aux propriétés
          const accounts = await program.account[accountType].all();
          console.log(`📊 Comptes de type ${accountType}:`, accounts.length);
          
          if (accounts.length > 0) {
            // Filtrer pour ne garder que les comptes avec statut "active"
            const activeAccounts = accounts.filter((acc: any) => {
              try {
                return acc.account.status && Object.keys(acc.account.status)[0] === 'active';
              } catch (err) {
                return false;
              }
            });
            
            // Ajouter les comptes actifs avec leur type
            if (activeAccounts.length > 0) {
              epochAccounts.push({
                type: accountType,
                accounts: activeAccounts.map((acc: any) => ({
                  publicKey: acc.publicKey.toString(),
                  data: acc.account
                }))
              });
            }
          }
        } catch (error) {
          console.log(`⚠️ Erreur lors de la récupération des comptes ${accountType}:`, error);
        }
      }
      
      return epochAccounts;
    }
    
    // Si nous avons bien un compte epochManagement
    // @ts-ignore - Nous savons que nous accédons à la propriété epochManagement
    const allEpochs = await program.account.epochManagement.all();
    
    // Transformer les données pour un format plus lisible et filtrer pour ne garder que les époques actives
    const formattedEpochs = allEpochs
      .filter((epoch: any) => {
        try {
          return epoch.account.status && Object.keys(epoch.account.status)[0] === 'active';
        } catch (err) {
          return false;
        }
      })
      .map((epoch: any) => {
        try {
          // Ajouter un indicateur si l'époque est dépassée
          const currentTime = Math.floor(Date.now() / 1000);
          const endTime = epoch.account.endTime?.toNumber();
          const needsClosing = endTime && currentTime >= endTime;
          
          return {
            publicKey: epoch.publicKey.toString(),
            epochId: epoch.account.epochId?.toString() || 'N/A',
            startTime: epoch.account.startTime ? 
              new Date(epoch.account.startTime.toNumber() * 1000).toISOString() : 'N/A',
            endTime: epoch.account.endTime ? 
              new Date(epoch.account.endTime.toNumber() * 1000).toISOString() : 'N/A',
            status: 'active', // Nous savons déjà que c'est 'active' grâce au filtre
            processed: epoch.account.processed !== undefined ? epoch.account.processed : 'N/A',
            needsClosing // Nouvel indicateur
          };
        } catch (err) {
          return {
            publicKey: epoch.publicKey.toString(),
            error: 'Format inattendu',
            rawData: JSON.stringify(epoch.account)
          };
        }
      });
    
    console.log(`📈 Nombre total d'époques actives: ${formattedEpochs.length}`);
    
    return formattedEpochs;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des époques:", error);
    return [];
  }
}

// Handler pour les requêtes GET
export async function GET(request: NextRequest): Promise<Response> {
  console.log("🚀 Démarrage de la vérification des époques...");
  
  try {
    // Vérifier et simuler la fermeture des époques si nécessaire
    const results = await checkAndSimulateEndEpoch();
    
    console.log("\n✅ Vérification terminée");
    console.log(`📊 Résumé: ${results.details.epochsChecked} époque(s) vérifiée(s), ${results.details.epochsToClose} époque(s) à fermer`);
    
    return new Response(JSON.stringify({
      ...results,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      rpcEndpoint: RPC_ENDPOINT
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("❌ Erreur lors de l'exécution:", error instanceof Error ? error.message : String(error));
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      rpcEndpoint: RPC_ENDPOINT
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 