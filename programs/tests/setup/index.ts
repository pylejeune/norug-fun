import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { Programs } from '../../target/types/programs'; // Ajustez le chemin si nécessaire

// Définition du type pour le contexte de test
export interface TestContext {
    program: Program<Programs>;
    provider: anchor.AnchorProvider;
    adminKeypair: Keypair; // Keypair de l'administrateur principal des tests
    programConfigAddress?: PublicKey; // Stocker l'adresse du ProgramConfig PDA
    treasuryAddress?: PublicKey;
    treasuryRolesAddress?: PublicKey;
    // Ajoutez d'autres propriétés au contexte si nécessaire (ex: userKeypair)
}

let globalTestContext: TestContext | null = null;

/**
 * Initialise et retourne le contexte de test global.
 * Crée un adminKeypair et effectue un airdrop si nécessaire.
 */
export async function initializeTestContext(): Promise<TestContext> {
    if (globalTestContext) {
        // console.log("Returning existing global test context.");
        return globalTestContext;
    }

    // console.log("Initializing new global test context...");
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.Programs as Program<Programs>;

    // Utiliser une keypair d'admin constante si possible pour éviter les airdrops répétitifs,
    // mais pour des tests plus isolés, une nouvelle keypair peut être générée.
    // Pour l'instant, on génère une nouvelle à chaque initialisation complète.
    const adminKeypair = Keypair.generate();

    // Airdrop pour le payeur/admin si le solde est bas (facultatif, mais bon pour les tests locaux)
    // Attention : les airdrops peuvent être lents.
    const balance = await provider.connection.getBalance(adminKeypair.publicKey);
    // console.log(`Admin ${adminKeypair.publicKey.toBase58()} balance: ${balance / 1e9} SOL`);
    if (balance < 1 * anchor.web3.LAMPORTS_PER_SOL) { // Moins de 1 SOL
        console.log(`Airdropping 2 SOL to admin ${adminKeypair.publicKey.toBase58()}...`);
        try {
            const airdropSignature = await provider.connection.requestAirdrop(
                adminKeypair.publicKey,
                2 * anchor.web3.LAMPORTS_PER_SOL // Airdrop 2 SOL
            );
            const latestBlockHash = await provider.connection.getLatestBlockhash();
            await provider.connection.confirmTransaction(
                {
                    blockhash: latestBlockHash.blockhash,
                    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
                    signature: airdropSignature,
                },
                "confirmed"
            );
            console.log(`Airdrop to admin ${adminKeypair.publicKey.toBase58()} confirmed.`);
        } catch (airdropError) {
            console.error(`Airdrop failed for ${adminKeypair.publicKey.toBase58()}:`, airdropError);
            // Continuer quand même, certains tests pourraient passer sans solde frais si les comptes sont déjà payés.
        }
    }

    const ctx: TestContext = {
        program,
        provider,
        adminKeypair,
        // programConfigAddress, treasuryAddress, etc., seront initialisés par les fonctions de setup spécifiques
    };

    globalTestContext = ctx;
    return ctx;
}

/**
 * Récupère le contexte de test global déjà initialisé.
 * Lance une erreur si le contexte n'a pas été initialisé au préalable.
 */
export const getInitializedContext = (): TestContext => {
    if (!globalTestContext) {
        throw new Error(
            "Global test context not initialized. Call initializeTestContext() once in your main test setup."
        );
    }
    return globalTestContext;
};

// Exporter d'autres éléments de setup communs si nécessaire
// Par exemple, des keypairs d'utilisateurs par défaut, etc. 