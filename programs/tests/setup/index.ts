import * as anchor from '@coral-xyz/anchor';
import { Program, web3 } from '@coral-xyz/anchor';
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Programs } from '../../target/types/programs'; // Adapter le chemin si nécessaire
import { ADMIN_SEED } from '../utils_for_tests/constants';

/**
 * @interface TestContext
 * Contient les éléments essentiels initialisés pour les suites de tests.
 */
export interface TestContext {
  provider: anchor.AnchorProvider;
  program: Program<Programs>;
  adminKeypair: Keypair; // L'administrateur principal des tests, dérivé de ADMIN_SEED
  programConfigAddress?: PublicKey; // Adresse du compte ProgramConfig, initialisée séparément
  treasuryAddress?: PublicKey;      // Adresse du compte Treasury, initialisée séparément
  // Ajoutez d'autres placeholders pour des comptes globaux ou configurations ici
  // par exemple: epochManagementUtils?: EpochManagementUtils;
}

/**
 * Initialise le contexte de base pour les tests d'intégration Anchor.
 * Configure le provider, charge le programme, et initialise l'adminKeypair.
 * @returns {Promise<TestContext>} Le contexte de test initialisé.
 */
export async function initializeTestContext(): Promise<TestContext> {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Programs as Program<Programs>;
  const adminKeypair = Keypair.fromSeed(ADMIN_SEED);

  // S'assurer que l'adminKeypair est financé
  const adminInfo = await provider.connection.getAccountInfo(adminKeypair.publicKey);
  if (!adminInfo || adminInfo.lamports < 2 * LAMPORTS_PER_SOL) {
    console.log(`Airdropping 2 SOL to admin ${adminKeypair.publicKey.toBase58()}...`);
    const airdropSignature = await provider.connection.requestAirdrop(
      adminKeypair.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSignature, "confirmed");
    console.log(`Airdrop to admin ${adminKeypair.publicKey.toBase58()} confirmed.`);
  } else {
    console.log(`Admin ${adminKeypair.publicKey.toBase58()} already has sufficient SOL.`);
  }

  return {
    provider,
    program,
    adminKeypair,
    // programConfigAddress et treasuryAddress seront initialisés par des fonctions de setup spécifiques
  };
} 