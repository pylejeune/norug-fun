import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
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
console.log("📝 Available instructions:", idl.instructions.map((ix: any) => ix.name));

// Définir l'interface pour le wallet Anchor
interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction: <T>(tx: T) => Promise<T>;
  signAllTransactions: <T>(txs: T[]) => Promise<T[]>;
}

// Résultats des tests
interface TestResults {
  success: boolean;
  tests: {
    idlVerification: boolean;
    programInstantiation: boolean;
    endEpochMethodTest: boolean;
  };
  details: Record<string, any>;
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

// Test 1: Vérification des instructions disponibles
function testInstructionsAvailable(): void {
  const instructionNames = idl.instructions.map((ix: any) => ix.name);
  console.log("🔍 Vérification de la présence de 'end_epoch':", instructionNames.includes("end_epoch"));
  
  // Chercher l'instruction end_epoch
  const endEpochInstruction = idl.instructions.find((ix: any) => ix.name === "end_epoch");
  if (endEpochInstruction) {
    console.log("✅ Instruction end_epoch trouvée:");
    console.log("   - Discriminator:", endEpochInstruction.discriminator);
    console.log("   - Comptes requis:", endEpochInstruction.accounts.map((acc: any) => acc.name));
    console.log("   - Arguments:", endEpochInstruction.args.map((arg: any) => arg.name));
  } else {
    console.error("❌ Instruction end_epoch non trouvée dans l'IDL");
  }
}

// Test 2: Instantiation du programme
async function testProgramInstantiation(): Promise<void> {
  const connection = new Connection(RPC_ENDPOINT);
  const keypair = getTestKeypair();
  
  // Création du wallet de test compatible AnchorProvider
  const wallet: AnchorWallet = {
    publicKey: keypair.publicKey,
    signTransaction: async <T>(tx: T): Promise<T> => tx,
    signAllTransactions: async <T>(txs: T[]): Promise<T[]> => txs,
  };
  
  const program = getProgram(connection, wallet);
  
  if (program) {
    console.log("✅ Programme instancié avec succès");
    console.log("   - ProgramId:", program.programId.toString());
    console.log("   - Méthodes disponibles:", Object.keys(program.methods || {}));
    
    // Vérifier la présence de endEpoch
    if (program.methods && program.methods.endEpoch) {
      console.log("✅ Méthode endEpoch disponible");
    } else {
      console.error("❌ Méthode endEpoch non disponible");
    }
  } else {
    console.error("❌ Échec de l'instantiation du programme");
  }
}

// Type pour les comptes d'instruction (utilisé uniquement pour la documentation)
interface EndEpochAccounts {
  epoch_management: PublicKey;
  authority: PublicKey;
  system_program: PublicKey;
}

// Type pour les comptes d'instruction camelCase (utilisé uniquement pour la documentation)
interface EndEpochAccountsCamel {
  epochManagement: PublicKey;
  authority: PublicKey;
  systemProgram: PublicKey;
}

// Test 3: Simuler un appel à endEpoch (sans l'exécuter)
async function testEndEpochMethod(): Promise<{success: boolean, errors: string[]}> {
  const connection = new Connection(RPC_ENDPOINT);
  const keypair = getTestKeypair();
  
  // Création du wallet de test compatible AnchorProvider
  const wallet: AnchorWallet = {
    publicKey: keypair.publicKey,
    signTransaction: async <T>(tx: T): Promise<T> => tx,
    signAllTransactions: async <T>(txs: T[]): Promise<T[]> => txs,
  };
  
  const program = getProgram(connection, wallet);
  const errors: string[] = [];
  
  if (program && program.methods && program.methods.endEpoch) {
    console.log("🧪 Test de construction d'appel à endEpoch...");
    
    // Simuler un epochId
    const epochId = new BN(123);
    
    try {
      // Génération des seeds pour dériver le PDA
      const epochManagementSeed = Buffer.from("epoch");
      
      // Dériver le PDA pour epoch_management
      const [epochManagementPDA] = await PublicKey.findProgramAddressSync(
        [epochManagementSeed],
        program.programId
      );
      
      console.log("🔑 PDA généré pour epoch_management:", epochManagementPDA.toString());
      
      // Vérifier si le compte existe déjà
      try {
        const accountInfo = await connection.getAccountInfo(epochManagementPDA);
        console.log("ℹ️ État du compte:", accountInfo ? "Existant" : "N'existe pas encore");
      } catch (err) {
        console.log("❌ Erreur lors de la vérification du compte:", err);
      }
      
      // Essayer les deux formats possibles de nommage des comptes
      console.log("🧪 Test avec format snake_case:");
      try {
        // On utilise un objet générique pour les comptes pour éviter les erreurs de type
        const tx = await program.methods
          .endEpoch(epochId)
          .accounts({
            epoch_management: epochManagementPDA,
            authority: wallet.publicKey,
            system_program: anchor.web3.SystemProgram.programId,
          })
          .transaction();
        
        console.log("✅ Transaction snake_case créée:", tx.instructions.length, "instructions");
        
        // Ajouter le payeur de frais (l'autorité dans ce cas)
        tx.feePayer = wallet.publicKey;
        
        const simulationResult = await connection.simulateTransaction(tx);
        
        // Afficher seulement les informations pertinentes de la simulation
        const simValue = {
          err: simulationResult.value.err,
          logs: simulationResult.value.logs,
        };
        console.log("⚙️ Résultat simulation snake_case:", JSON.stringify(simValue));
        
        if (simulationResult.value.err) {
          throw new Error(`Simulation error: ${JSON.stringify(simulationResult.value.err)}`);
        }
        
        console.log("✅ Format snake_case accepté");
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("❌ Format snake_case rejeté:", errorMsg);
        
        // Ajouter l'info de logs si disponible
        const anchorError = error instanceof Error && "logs" in error ? 
          `\nLogs: ${(error as any).logs?.join("\n")}` : "";
          
        errors.push(`Snake case error: ${errorMsg}${anchorError}`);
      }
      
      console.log("🧪 Test avec format camelCase:");
      try {
        // On utilise un objet générique pour les comptes pour éviter les erreurs de type
        const tx = await program.methods
          .endEpoch(epochId)
          .accounts({
            epochManagement: epochManagementPDA,
            authority: wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .transaction();
        
        console.log("✅ Transaction camelCase créée:", tx.instructions.length, "instructions");
        
        // Ajouter le payeur de frais (l'autorité dans ce cas)
        tx.feePayer = wallet.publicKey;
        
        const simulationResult = await connection.simulateTransaction(tx);
        
        // Afficher seulement les informations pertinentes de la simulation
        const simValue = {
          err: simulationResult.value.err,
          logs: simulationResult.value.logs,
        };
        console.log("⚙️ Résultat simulation camelCase:", JSON.stringify(simValue));
        
        if (simulationResult.value.err) {
          throw new Error(`Simulation error: ${JSON.stringify(simulationResult.value.err)}`);
        }
        
        console.log("✅ Format camelCase accepté");
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("❌ Format camelCase rejeté:", errorMsg);
        
        // Ajouter l'info de logs si disponible
        const anchorError = error instanceof Error && "logs" in error ? 
          `\nLogs: ${(error as any).logs?.join("\n")}` : "";
          
        errors.push(`Camel case error: ${errorMsg}${anchorError}`);
      }
      
      console.log("✅ Tests de construction des instructions terminés");
      return { success: errors.length === 0, errors };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("❌ Erreur lors de la construction de l'instruction:", errorMsg);
      errors.push(`Construction error: ${errorMsg}`);
      return { success: false, errors };
    }
  } else {
    const errorMsg = "La méthode endEpoch n'est pas disponible sur le programme";
    console.error("❌ " + errorMsg);
    errors.push(errorMsg);
    return { success: false, errors };
  }
}

// Handler pour les requêtes GET
export async function GET(request: NextRequest): Promise<Response> {
  console.log("🚀 Démarrage des tests de l'IDL et du programme...");
  
  // Résultats des tests
  const results: TestResults = {
    success: true,
    tests: {
      idlVerification: true,
      programInstantiation: true,
      endEpochMethodTest: true
    },
    details: {}
  };
  
  try {
    // Test 1: Vérification des instructions disponibles
    console.log("\n--- Test 1: Vérification des instructions disponibles ---");
    testInstructionsAvailable();
    
    // Test 2: Instantiation du programme
    console.log("\n--- Test 2: Instantiation du programme ---");
    await testProgramInstantiation();
    
    // Test 3: Simuler un appel à endEpoch
    console.log("\n--- Test 3: Simuler un appel à endEpoch ---");
    const endEpochResults = await testEndEpochMethod();
    results.tests.endEpochMethodTest = endEpochResults.success;
    results.details.endEpochErrors = endEpochResults.errors;
    
    // Récupération de la liste des époques
    console.log("\n--- Liste des époques ---");
    const epochs = await getAllEpochs();
    results.details.epochs = epochs;
    
    console.log("\n✅ Tous les tests terminés");
    
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
    console.error("❌ Erreur lors de l'exécution des tests:", error instanceof Error ? error.message : String(error));
    
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

// Fonction pour récupérer toutes les époques
async function getAllEpochs() {
  const connection = new Connection(RPC_ENDPOINT);
  const keypair = getTestKeypair();
  
  // Création du wallet de test compatible AnchorProvider
  const wallet: AnchorWallet = {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: any): Promise<any> => tx,
    signAllTransactions: async (txs: any[]): Promise<any[]> => txs,
  };
  
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
            // Ajouter les comptes avec leur type
            epochAccounts.push({
              type: accountType,
              accounts: accounts.map((acc: any) => ({
                publicKey: acc.publicKey.toString(),
                data: acc.account
              }))
            });
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
    
    // Transformer les données pour un format plus lisible
    const formattedEpochs = allEpochs.map((epoch: any) => {
      try {
        return {
          publicKey: epoch.publicKey.toString(),
          epochId: epoch.account.epochId?.toString() || 'N/A',
          startTime: epoch.account.startTime ? 
            new Date(epoch.account.startTime.toNumber() * 1000).toISOString() : 'N/A',
          endTime: epoch.account.endTime ? 
            new Date(epoch.account.endTime.toNumber() * 1000).toISOString() : 'N/A',
          status: epoch.account.status ? Object.keys(epoch.account.status)[0] : 'N/A',
          processed: epoch.account.processed !== undefined ? epoch.account.processed : 'N/A'
        };
      } catch (err) {
        return {
          publicKey: epoch.publicKey.toString(),
          error: 'Format inattendu',
          rawData: JSON.stringify(epoch.account)
        };
      }
    });
    
    console.log(`📈 Nombre total d'époques: ${formattedEpochs.length}`);
    console.log("📋 Liste des époques:", JSON.stringify(formattedEpochs, null, 2));
    
    return formattedEpochs;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des époques:", error);
    return [];
  }
} 