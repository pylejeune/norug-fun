import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

// Import de l'IDL partagé
import idlJson from "../../../idl/programs.json";

// Configuration simple
export const RPC_ENDPOINT =
  process.env.SOLANA_RPC_ENDPOINT || "https://api.devnet.solana.com";

// Note: La structure de l'IDL peut différer
export const idlAddress =
  "address" in idlJson
    ? (idlJson as any).address
    : (idlJson as any).metadata?.address ||
      "3HBzNutk8DrRfffCS74S55adJAjgY8NHrWXgRtABaSbF";

// Récupération de la seed admin depuis les variables d'environnement
export const ADMIN_SEED_BASE64 = process.env.ADMIN_SEED_BASE64;

// Logs d'initialisation
console.log("📝 Adresse du programme trouvée:", idlAddress);
export const PROGRAM_ID = new PublicKey(idlAddress);

// IDL préparé pour Anchor
export const idl = {
  ...(idlJson as any),
  address: idlAddress, // S'assurer que l'adresse est toujours disponible à la racine
};

// Log de configuration
console.log("📝 IDL Details:", {
  name: idl.metadata?.name || "Unknown",
  version: idl.metadata?.version || "Unknown",
  address: idl.address,
});

// Log des instructions disponibles
console.log(
  "📝 Instructions disponibles:",
  idl.instructions?.map((ix: any) => ix.name) || []
);

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
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    console.error("❌ En-tête Authorization manquant");
    return false;
  }

  const token = authHeader.replace("Bearer ", "");
  const expectedToken = process.env.API_SECRET_KEY;

  if (!expectedToken) {
    console.error(
      "❌ API_SECRET_KEY non défini dans les variables d'environnement"
    );
    return false;
  }

  return token === expectedToken;
}

/**
 * Génère le keypair administrateur à partir de la seed stockée en Base64
 */
export function getAdminKeypair(): Keypair {
  if (!ADMIN_SEED_BASE64) {
    throw new Error(
      "ADMIN_SEED_BASE64 n'est pas défini dans les variables d'environnement ou est vide"
    );
  }

  try {
    const seedBuffer = Buffer.from(ADMIN_SEED_BASE64, "base64");
    if (seedBuffer.length === 32) {
      console.log(
        "✅ Utilisation de Keypair.fromSeed() car seedBuffer fait 32 bytes."
      );
      return Keypair.fromSeed(seedBuffer);
    } else if (seedBuffer.length === 64) {
      console.log(
        "✅ Utilisation de Keypair.fromSecretKey() car seedBuffer fait 64 bytes."
      );
      return Keypair.fromSecretKey(seedBuffer);
    } else {
      console.error(
        `❌ Taille de seedBuffer inattendue: ${seedBuffer.length} bytes. Devrait être 32 ou 64.`
      );
      throw new Error(
        `Taille de seedBuffer après décodage Base64 inattendue: ${seedBuffer.length}`
      );
    }
  } catch (error) {
    console.error(
      "❌ Erreur lors de la génération du keypair admin (détail):",
      error instanceof Error ? error.message : String(error)
    );
    throw new Error(
      `Impossible de générer le keypair admin: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Initialise et retourne une instance du programme Anchor
 */
export function getProgram(
  connection: Connection,
  wallet?: AnchorWallet | null
) {
  try {
    // Création du provider avec le wallet et la connexion
    const provider = new AnchorProvider(
      connection,
      wallet ?? ({} as AnchorWallet), // allow "read-only" mode
      { preflightCommitment: "processed" }
    );

    if (wallet) {
      console.log(
        "⚙️ Création du provider avec wallet:",
        wallet.publicKey.toString()
      );
    } else {
      console.log("⚙️ Création du provider en mode lecture seule");
    }

    // Création du programme
    console.log("⚙️ Création du programme avec IDL complet...");
    const program = new Program(idl as any, provider);

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
      return txs.map((tx) => {
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
export function createErrorResponse(
  requestId: string,
  error: any,
  status = 500
) {
  const errorType = error instanceof Error ? error.name : typeof error;
  const errorMsg = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(`[${requestId}] ❌ Erreur:`, errorMsg, errorStack);

  return new Response(
    JSON.stringify({
      success: false,
      error: errorMsg,
      errorType,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      requestId,
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Génère une réponse HTTP formatée standard pour un succès
 */
export function createSuccessResponse(requestId: string, data: any) {
  return new Response(
    JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      requestId,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// Fonction pour générer un nom de token aléatoire
export function generateRandomTokenName(): string {
  const adjectives = [
    "Innovative",
    "Dynamic",
    "Creative",
    "Unique",
    "Visionary",
  ];
  const nouns = ["Token", "Coin", "Asset", "Fund", "Project"];
  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${randomAdjective} ${randomNoun} ${randomUUID().slice(0, 8)}`; // Ajoute un UUID pour l'unicité
}
