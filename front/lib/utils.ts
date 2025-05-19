import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { ClassValue, clsx } from "clsx";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { twMerge } from "tailwind-merge";


// Import de l'IDL partagé - chemins mis à jour pour refléter la nouvelle structure
import sharedIdlJson from "../app/idl/programs.json";
import cronIdlJson from "../app/idl/programs.json";

// Fonction utilitaire pour les classes TailwindCSS
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Configuration simple
export const RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || "https://api.devnet.solana.com";

// Configuration des IDLs et programmes
// Shared API
export const SHARED_IDL_ADDRESS = "address" in sharedIdlJson 
  ? (sharedIdlJson as any).address
  : (sharedIdlJson as any).metadata?.address || "3HBzNutk8DrRfffCS74S55adJAjgY8NHrWXgRtABaSbF";

export const SHARED_PROGRAM_ID = new PublicKey(SHARED_IDL_ADDRESS);

export const SHARED_IDL = {
  ...sharedIdlJson as any,
  metadata: {
    ...(sharedIdlJson as any).metadata,
    address: SHARED_IDL_ADDRESS
  }
};

// Cron API
export const CRON_IDL_ADDRESS = process.env.CRON_PROGRAM_ID || SHARED_IDL_ADDRESS;

export const CRON_PROGRAM_ID = new PublicKey(CRON_IDL_ADDRESS);

export const CRON_IDL = {
  ...sharedIdlJson as any,
  metadata: {
    ...(sharedIdlJson as any).metadata,
    address: CRON_IDL_ADDRESS
  }
};

// Récupération des seeds admin depuis les variables d'environnement
export const ADMIN_SEED_BASE64 = process.env.ADMIN_SEED_BASE64;
export const ADMIN_SEED_BASE64_PROGRAMCONFIG = process.env.ADMIN_SEED_BASE64_PROGRAMCONFIG;

// Définir l'interface pour le wallet Anchor
export interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction: <T>(tx: T) => Promise<T>;
  signAllTransactions: <T>(txs: T[]) => Promise<T[]>;
}

/**
 * Vérifie si le token d'authentification fourni dans la requête est valide
 */
export function verifyAuthToken(request: NextRequest): boolean {
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

/**
 * Génère le keypair administrateur à partir de la seed stockée en Base64
 */
export function getAdminKeypair(): Keypair {
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

/**
 * Génère le keypair administrateur à partir de la seed stockée en Base64 pour la configuration du programme
 */
export function getAdminKeypairProgramConfig(): Keypair {
  if (!ADMIN_SEED_BASE64_PROGRAMCONFIG) {
    throw new Error("ADMIN_SEED_BASE64_PROGRAMCONFIG n'est pas défini dans les variables d'environnement ou est vide");
  }
  
  try {
    const seedBuffer = Buffer.from(ADMIN_SEED_BASE64_PROGRAMCONFIG, 'base64');
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

/**
 * Initialise et retourne une instance du programme Anchor
 * @param idl L'IDL du programme à initialiser (shared ou cron)
 */
export function getProgram(connection: Connection, idl: any, wallet?: AnchorWallet | null) {
  try {
    // Création du provider avec le wallet et la connexion
    const provider = new AnchorProvider(
      connection,
      wallet ?? ({} as AnchorWallet), // allow "read-only" mode
      { preflightCommitment: "processed" }
    );

    if (wallet) {
      console.log("⚙️ Création du provider avec wallet:", wallet.publicKey.toString());
    } else {
      console.log("⚙️ Création du provider en mode lecture seule");
    }
    
    // Création du programme
    console.log("⚙️ Création du programme avec IDL complet...");
    const program = new Program(idl, provider);
    
    return program;
  } catch (error) {
    console.error("❌ Error creating program:", error);
    return null;
  }
}

/**
 * Crée un wallet Anchor à partir d'un keypair
 */
export function createAnchorWallet(adminKeypair: Keypair): AnchorWallet {
  return {
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
}

/**
 * Génère une réponse HTTP formatée standard pour les erreurs
 */
export function createErrorResponse(requestId: string, error: any, status = 500) {
  const errorType = error instanceof Error ? error.name : typeof error;
  const errorMsg = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error(`[${requestId}] ❌ Erreur:`, errorMsg, errorStack);
  
  return new Response(JSON.stringify({
    success: false,
    error: errorMsg,
    errorType,
    stack: errorStack,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    requestId,
  }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Génère une réponse HTTP formatée standard pour un succès
 */
export function createSuccessResponse(requestId: string, data: any) {
  return new Response(JSON.stringify({
    ...data,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    requestId,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Fonction pour générer un nom de token aléatoire
export function generateRandomTokenName(): string {
  const adjectives = ["Innovative", "Dynamic", "Creative", "Unique", "Visionary", "Cosmic", "Digital", "Quantum", "Solar", "Nova", "Stellar", "Lunar", "Atomic", "Cyber"];
  const nouns = ["Token", "Coin", "Asset", "Fund", "Project", "Network", "Chain", "Protocol", "Finance", "Exchange", "Swap", "Verse", "DAO", "DeFi"];
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${randomAdjective} ${randomNoun} ${randomUUID().slice(0, 8)}`; // Ajoute un UUID pour l'unicité
}

// Fonction pour générer un symbole de token aléatoire
export function generateRandomTokenSymbol(): string {
  // Liste de préfixes couramment utilisés dans les crypto-monnaies
  const prefixes = ["SOL", "NRG", "FUN", "META", "DAO", "NFT", "DFI", "XCH", "VRS", "WEB3", "DEGEN", "MEME", "APE", "MOON"];
  
  // Génération d'un préfixe aléatoire
  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  
  // Types de structures de symboles
  const symbolStructures = [
    // Structure 1: Préfixe + Nombre (ex: SOL123)
    () => `${randomPrefix}${Math.floor(Math.random() * 900) + 100}`,
    
    // Structure 2: Préfixe uniquement (ex: SOL)
    () => randomPrefix,
    
    // Structure 3: Préfixe + Lettre (ex: SOLX)
    () => `${randomPrefix}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
    
    // Structure 4: Sous-chaîne du préfixe + Nombre (ex: SO99)
    () => `${randomPrefix.substring(0, 2)}${Math.floor(Math.random() * 90) + 10}`,
    
    // Structure 5: Voyelles substituées par des chiffres (ex: S0L)
    () => randomPrefix.replace(/[AEIOU]/g, () => String(Math.floor(Math.random() * 10)))
  ];
  
  // Choisir aléatoirement une structure de symbole
  const randomStructure = symbolStructures[Math.floor(Math.random() * symbolStructures.length)];
  return randomStructure();
}

// Fonction pour générer une URL d'image aléatoire sur le thème crypto
export function generateRandomImageUrl(): string {
  const imageServices = [
    // Picsum Photos avec des IDs spécifiques pour des images adaptées aux tokens/crypto
    () => {
      // Liste d'IDs Picsum qui correspondent bien à des images adaptées pour des tokens
      const cryptoImageIds = [
        '237', '433', '593', '684', '829',
        '1025', '1074', '1084', '119', '146', 
        '176', '177', '216', '219', '225',
        '338', '370', '447', '450', '582',
        '599', '627', '660'
      ];
      const selectedId = cryptoImageIds[Math.floor(Math.random() * cryptoImageIds.length)];
      return `https://picsum.photos/id/${selectedId}/800/800`;
    },
  ];
  
  // Sélection aléatoire d'un service d'images
  const randomService = imageServices[Math.floor(Math.random() * imageServices.length)];
  return randomService();
}
