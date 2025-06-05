import { Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// Seed fixe pour l'autorité admin des tests, utilisé pour la cohérence entre les fichiers de test.
export const ADMIN_SEED = Uint8Array.from([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]);
 
// Optionnellement, on peut aussi exporter directement le Keypair dérivé si c'est plus pratique.
// export const ADMIN_KEYPAIR = Keypair.fromSeed(ADMIN_SEED); 

// Frais de création d'une proposition en lamports (0.005 SOL, aligné sur le programme Rust)
export const CREATION_FEE_LAMPORTS = new anchor.BN(5000000);

// Frais de support d'une proposition en lamports (par exemple 0.005 SOL) - Conservé pour l'instant, mais le test utilisera le %
export const SUPPORT_FEE_LAMPORTS = new anchor.BN(5000000);

// Pourcentage des frais de support (aligné sur le programme Rust)
export const SUPPORT_FEE_PERCENTAGE_NUMERATOR = 5;
export const SUPPORT_FEE_PERCENTAGE_DENOMINATOR = 1000;