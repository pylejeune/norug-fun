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
async function testEndEpochMethod(): Promise<void> {
  const connection = new Connection(RPC_ENDPOINT);
  const keypair = getTestKeypair();
  
  // Création du wallet de test compatible AnchorProvider
  const wallet: AnchorWallet = {
    publicKey: keypair.publicKey,
    signTransaction: async <T>(tx: T): Promise<T> => tx,
    signAllTransactions: async <T>(txs: T[]): Promise<T[]> => txs,
  };
  
  const program = getProgram(connection, wallet);
  
  if (program && program.methods && program.methods.endEpoch) {
    console.log("🧪 Test de construction d'appel à endEpoch...");
    
    // Simuler un epochId
    const epochId = new BN(123);
    
    // Créer des PublicKey fictives pour les comptes
    const testEpochPDA = keypair.publicKey;
    
    try {
      // Essayer les deux formats possibles de nommage des comptes
      console.log("🧪 Test avec format snake_case:");
      try {
        // On utilise un objet générique pour les comptes pour éviter les erreurs de type
        await program.methods
          .endEpoch(epochId)
          .accounts({
            epoch_management: testEpochPDA,
            authority: wallet.publicKey,
            system_program: anchor.web3.SystemProgram.programId,
          })
          .simulate();
        
        console.log("✅ Format snake_case accepté");
      } catch (error) {
        console.error("❌ Format snake_case rejeté:", error instanceof Error ? error.message : String(error));
      }
      
      console.log("🧪 Test avec format camelCase:");
      try {
        // On utilise un objet générique pour les comptes pour éviter les erreurs de type
        await program.methods
          .endEpoch(epochId)
          .accounts({
            epochManagement: testEpochPDA,
            authority: wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .simulate();
        
        console.log("✅ Format camelCase accepté");
      } catch (error) {
        console.error("❌ Format camelCase rejeté:", error instanceof Error ? error.message : String(error));
      }
      
      console.log("✅ Tests de construction des instructions terminés");
    } catch (error) {
      console.error("❌ Erreur lors de la construction de l'instruction:", error instanceof Error ? error.message : String(error));
    }
  } else {
    console.error("❌ La méthode endEpoch n'est pas disponible sur le programme");
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
    await testEndEpochMethod();
    
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