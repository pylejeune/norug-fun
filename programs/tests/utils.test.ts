import * as anchor from "@coral-xyz/anchor";
import { randomBytes } from "crypto";

// Fonction pour générer un ID aléatoire
export const generateRandomId = () => {
  const buffer = randomBytes(8);
  return new anchor.BN(buffer.toString('hex'), 16);
};

// Configuration commune pour les tests
export const setupTestEnvironment = () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Programs;
  return { provider, program };
}; 