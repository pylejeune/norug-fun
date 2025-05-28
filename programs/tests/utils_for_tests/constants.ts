import { Keypair } from "@solana/web3.js";

// Seed fixe pour l'autorité admin des tests, utilisé pour la cohérence entre les fichiers de test.
export const ADMIN_SEED = Uint8Array.from([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]);

// Optionnellement, on peut aussi exporter directement le Keypair dérivé si c'est plus pratique.
// export const ADMIN_KEYPAIR = Keypair.fromSeed(ADMIN_SEED); 