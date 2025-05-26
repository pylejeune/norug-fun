// Placeholder pour les fonctions de setup de la trésorerie 

// Fonctions de setup pour Treasury et TreasuryRoles
export {}; // Pour que le fichier soit traité comme un module 

import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TestContext } from './index'; // Assurez-vous que le chemin est correct

/**
 * Calcule le PDA (Program Derived Address) pour le compte Treasury.
 * @param programId L'ID du programme Solana.
 * @returns Une paire [PublicKey, bump] pour le PDA de la Treasury.
 */
export const getTreasuryPda = (programId: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("treasury")],
        programId
    );
};

/**
 * S'assure que le compte Treasury est initialisé.
 * Si le compte n'existe pas, il appelle l'instruction `initialize_treasury`.
 * L'adresse de la Treasury est ensuite stockée dans `ctx.treasuryAddress`.
 * 
 * @param ctx Le contexte de test actuel.
 * @param initialAdmin Optionnel, la clé publique de l'admin à utiliser pour l'initialisation.
 *                     Si non fourni, `ctx.adminKeypair.publicKey` sera utilisé.
 */
export async function ensureTreasuryInitialized(ctx: TestContext, initialAdmin?: PublicKey): Promise<void> {
    const [treasuryAddress, _bump] = getTreasuryPda(ctx.program.programId);
    ctx.treasuryAddress = treasuryAddress;

    try {
        const accountInfo = await ctx.program.account.treasury.fetch(treasuryAddress);
        // Si fetch réussit, le compte existe déjà.
        console.log(`Treasury account ${treasuryAddress.toBase58()} already initialized.`);
        // Vous pourriez vouloir vérifier si l'admin est correct si nécessaire, mais pour l'instant, on suppose que c'est bon.
        return;
    } catch (error) {
        // L'erreur typique si le compte n'est pas trouvé est que error.message contiendra "Account does not exist"
        // ou une erreur similaire d'Anchor pour compte non initialisé.
        if (error.message.includes('Account does not exist') || error.message.includes('could not find account')) {
            console.log(`Treasury account ${treasuryAddress.toBase58()} not found, initializing...`);
        } else {
            // Une autre erreur s'est produite lors du fetch, la relancer.
            // console.error("Unexpected error fetching Treasury account:", error);
            // throw error;
            // Pour l'instant, on suppose que si une erreur autre que "not found" se produit, le compte pourrait exister
            // mais avoir un autre problème. Pour ce setup, on va quand même tenter d'initialiser.
            // Cela pourrait être affiné si nécessaire.
            console.log(`Attempting to initialize Treasury account ${treasuryAddress.toBase58()} after fetch error: ${error.message}`);
        }
    }

    try {
        const adminToUse = initialAdmin || ctx.adminKeypair.publicKey;
        await ctx.program.methods
            .initializeTreasury()
            .accounts({
                treasury: treasuryAddress,
                authority: adminToUse, // L'instruction initialize_treasury doit prendre une autorité
                systemProgram: SystemProgram.programId,
            })
            .signers(initialAdmin ? [] : [ctx.adminKeypair]) // Signer uniquement si initialAdmin n'est pas fourni (donc on utilise ctx.adminKeypair)
            .rpc();
        console.log(`Treasury account ${treasuryAddress.toBase58()} initialized successfully by ${adminToUse.toBase58()}.`);
    } catch (error) {
        // Vérifier si l'erreur est due au fait que le compte est déjà initialisé (par une autre exécution concurrente ou un état précédent)
        const errorString = (error as Error).toString();
        if (errorString.includes("already in use") || 
            errorString.includes("custom program error: 0x0") || 
            errorString.includes("Account already initialized")) { // Anchor peut retourner cette erreur spécifique
            console.log(`Treasury account ${treasuryAddress.toBase58()} was likely already initialized by another process or previous run.`);
            // Essayer de fetch à nouveau pour confirmer
            try {
                await ctx.program.account.treasury.fetch(treasuryAddress);
                console.log(`Confirmed: Treasury account ${treasuryAddress.toBase58()} exists.`);
                return;
            } catch (fetchAfterInitError) {
                console.error(`Failed to fetch Treasury account ${treasuryAddress.toBase58()} even after an expected initialization error:`, fetchAfterInitError);
                throw fetchAfterInitError;
            }
        } else {
            console.error(`Failed to initialize Treasury account ${treasuryAddress.toBase58()}:`, error);
            throw error;
        }
    }
} 