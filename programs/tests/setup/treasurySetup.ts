// Placeholder pour les fonctions de setup de la trésorerie 

// Fonctions de setup pour Treasury et TreasuryRoles
export {}; // Pour que le fichier soit traité comme un module 

import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TestContext } from './index'; // Assurez-vous que le chemin est correct
import { shortenAddress } from '../utils_for_tests/helpers'; // Assurer l'import

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
 * @param initialTreasuryAdmin Optionnel, la clé publique de l'admin de la trésorerie à utiliser pour l'initialisation.
 *                     Si non fourni, `ctx.adminKeypair.publicKey` sera utilisé comme admin de la trésorerie et comme signataire payeur.
 */
export async function ensureTreasuryInitialized(ctx: TestContext, initialTreasuryAdmin?: PublicKey): Promise<void> {
    const [treasuryAddress, _bump] = getTreasuryPda(ctx.program.programId);
    ctx.treasuryAddress = treasuryAddress; // Stocker dans le contexte pour réutilisation

    const treasuryAdminToSet = initialTreasuryAdmin || ctx.adminKeypair.publicKey;
    // Le signataire payeur sera toujours ctx.adminKeypair dans ce helper pour simplifier,
    // car il faut un Signer pour payer la création du compte.
    // Si initialTreasuryAdmin est fourni et différent de ctx.adminKeypair.publicKey, 
    // cela signifie que ctx.adminKeypair initialise la trésorerie en désignant initialTreasuryAdmin comme son autorité.

    try {
        const accountInfo = await ctx.program.account.treasury.fetch(treasuryAddress);
        console.log(`Treasury account ${shortenAddress(treasuryAddress)} already initialized. Authority: ${shortenAddress(accountInfo.authority)}`);
        // Optionnel: vérifier si accountInfo.authority correspond à treasuryAdminToSet et mettre à jour si nécessaire/possible.
        // Pour ce helper, nous nous contentons de l'initialiser s'il n'existe pas.
        return;
    } catch (error) {
        if (error.message.includes('Account does not exist') || error.message.includes('could not find account')) {
            console.log(`Treasury account ${shortenAddress(treasuryAddress)} not found, initializing...`);
        } else {
            console.log(`Attempting to initialize Treasury account ${shortenAddress(treasuryAddress)} after fetch error: ${error.message}`);
        }
    }

    try {
        await ctx.program.methods
            .initializeTreasury(treasuryAdminToSet) // Passer l'autorité initiale ici
            .accounts({
                treasury: treasuryAddress,
                authority: ctx.adminKeypair.publicKey, // ctx.adminKeypair est le Signer payeur
                systemProgram: SystemProgram.programId,
            })
            .signers([ctx.adminKeypair]) // Toujours ctx.adminKeypair qui signe pour payer
            .rpc();
        console.log(`Treasury account ${shortenAddress(treasuryAddress)} initialized successfully. Set authority: ${shortenAddress(treasuryAdminToSet)} by payer ${shortenAddress(ctx.adminKeypair.publicKey)}.`);
    } catch (error) {
        const errorString = (error as Error).toString();
        if (errorString.includes("already in use") || 
            errorString.includes("custom program error: 0x0") || 
            errorString.includes("Account already initialized")) {
            console.log(`Treasury account ${shortenAddress(treasuryAddress)} was likely already initialized.`);
            try {
                const acc = await ctx.program.account.treasury.fetch(treasuryAddress);
                console.log(`Confirmed: Treasury account ${shortenAddress(treasuryAddress)} exists. Authority: ${shortenAddress(acc.authority)}.`);
                return;
            } catch (fetchAfterInitError) {
                console.error(`Failed to fetch Treasury account ${shortenAddress(treasuryAddress)} after init error:`, fetchAfterInitError);
                throw fetchAfterInitError;
            }
        } else {
            console.error(`Failed to initialize Treasury account ${shortenAddress(treasuryAddress)}:`, error);
            throw error;
        }
    }
} 

/**
 * Calcule le PDA (Program Derived Address) pour le compte TreasuryRoles.
 * @param programId L'ID du programme Solana.
 * @returns Une paire [PublicKey, bump] pour le PDA de TreasuryRoles.
 */
export const getTreasuryRolesPda = (programId: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("treasury_roles")],
        programId
    );
};

/**
 * S'assure que le compte TreasuryRoles est initialisé.
 * Si le compte n'existe pas, il appelle l'instruction `initialize_treasury_roles`.
 * L'adresse de TreasuryRoles est ensuite stockée dans `ctx.treasuryRolesAddress`.
 * 
 * @param ctx Le contexte de test actuel.
 * @param initialAdmins Optionnel, un tableau de clés publiques des admins initiaux pour TreasuryRoles.
 *                      Si non fourni, `[ctx.adminKeypair.publicKey]` sera utilisé.
 */
export async function ensureTreasuryRolesInitialized(ctx: TestContext, initialAdmins?: PublicKey[]): Promise<void> {
    const [treasuryRolesAddress, _bump] = getTreasuryRolesPda(ctx.program.programId);
    ctx.treasuryRolesAddress = treasuryRolesAddress; // Stocker dans le contexte

    const adminsToSet = initialAdmins && initialAdmins.length > 0 ? initialAdmins : [ctx.adminKeypair.publicKey];
    if (adminsToSet.length === 0 || adminsToSet.length > 3) {
        throw new Error("Initial admins for TreasuryRoles must be between 1 and 3.");
    }

    try {
        const accountInfo = await ctx.program.account.treasuryRoles.fetch(treasuryRolesAddress);
        console.log(`TreasuryRoles account ${shortenAddress(treasuryRolesAddress)} already initialized. Authorities: ${accountInfo.authorities.map(a => shortenAddress(a)).join(", ")}`);
        // TODO: Optionnel: vérifier si les admins sont corrects et mettre à jour si nécessaire/possible via add_admin/remove_admin.
        return;
    } catch (error) {
        if (error.message.includes('Account does not exist') || error.message.includes('could not find account')) {
            console.log(`TreasuryRoles account ${shortenAddress(treasuryRolesAddress)} not found, initializing with admins: ${adminsToSet.map(a => shortenAddress(a)).join(", ")}...`);
        } else {
            console.log(`Attempting to initialize TreasuryRoles ${shortenAddress(treasuryRolesAddress)} after fetch error: ${error.message}`);
        }
    }

    try {
        await ctx.program.methods
            .initializeTreasuryRoles(adminsToSet)
            .accounts({
                treasuryRoles: treasuryRolesAddress,
                payer: ctx.adminKeypair.publicKey, // Le ctx.adminKeypair (admin du ProgramConfig) paie l'initialisation
                systemProgram: SystemProgram.programId,
            })
            .signers([ctx.adminKeypair])
            .rpc();
        console.log(`TreasuryRoles account ${shortenAddress(treasuryRolesAddress)} initialized successfully with admins: ${adminsToSet.map(a => shortenAddress(a)).join(", ")}. Payer: ${shortenAddress(ctx.adminKeypair.publicKey)}`);
    } catch (error) {
        const errorString = (error as Error).toString();
        if (errorString.includes("already in use") || 
            errorString.includes("custom program error: 0x0") || 
            errorString.includes("Account already initialized")) {
            console.log(`TreasuryRoles account ${shortenAddress(treasuryRolesAddress)} was likely already initialized.`);
            try {
                const acc = await ctx.program.account.treasuryRoles.fetch(treasuryRolesAddress);
                console.log(`Confirmed: TreasuryRoles ${shortenAddress(treasuryRolesAddress)} exists. Authorities: ${acc.authorities.map(a => shortenAddress(a)).join(", ")}.`);
                return;
            } catch (fetchAfterInitError) {
                console.error(`Failed to fetch TreasuryRoles ${shortenAddress(treasuryRolesAddress)} after init error:`, fetchAfterInitError);
                throw fetchAfterInitError;
            }
        } else {
            console.error(`Failed to initialize TreasuryRoles ${shortenAddress(treasuryRolesAddress)}:`, error);
            throw error;
        }
    }
}

// --- Fonction à ajouter : addAdminRoleOnChain (qui sera probablement ensureAdminInTreasuryRoles) --- 