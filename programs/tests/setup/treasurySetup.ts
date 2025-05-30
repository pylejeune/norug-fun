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
 * @param clearRoles Optionnel, indique si les rôles doivent être effacés avant l'initialisation.
 */
export async function ensureTreasuryRolesInitialized(
    ctx: TestContext, 
    initialAdmins?: PublicKey[],
    clearRoles: boolean = false
): Promise<PublicKey> {
    const { program, adminKeypair } = ctx;
    const [pda] = getTreasuryRolesPda(program.programId);
    ctx.treasuryRolesAddress = pda; // Stocker pour référence future

    const accountInfo = await program.provider.connection.getAccountInfo(pda);

    if (accountInfo === null) {
        const adminsToSet = initialAdmins && initialAdmins.length > 0 
                            ? initialAdmins 
                            : [adminKeypair.publicKey];
        
        console.log(`TreasuryRoles account ${shortenAddress(pda)} not found, initializing with admins: ${adminsToSet.map(a => shortenAddress(a)).join(', ')}...`);
        try {
            await program.methods.initializeTreasuryRoles(adminsToSet)
                .accounts({
                    treasuryRoles: pda,
                    payer: adminKeypair.publicKey, // Le payeur est toujours l'admin du contexte pour l'initialisation
                    systemProgram: SystemProgram.programId,
                })
                .signers([adminKeypair]) // L'admin du contexte signe pour payer
                .rpc();
            console.log(`TreasuryRoles account ${shortenAddress(pda)} initialized successfully with admins: ${adminsToSet.map(a => shortenAddress(a)).join(', ')}. Payer: ${shortenAddress(adminKeypair.publicKey)}`);
        } catch (e) {
            console.error(`Failed to initialize TreasuryRoles account ${shortenAddress(pda)}:`, e);
            throw e;
        }
    } else {
        // console.log(`TreasuryRoles account ${shortenAddress(pda)} already exists.`);
        if (clearRoles) {
            // console.log(`  ensureTreasuryRolesInitialized: clearRoles is true, attempting to clear roles.`);
            const currentAccountState = await program.account.treasuryRoles.fetch(pda);
            if (currentAccountState.roles.length > 0) {
                // Pour vider les rôles, on doit appeler removeTreasuryRole pour chaque rôle.
                // Cela suppose que l'autorité actuelle (adminKeypair) a le droit de le faire.
                // Et que les admins actuels incluent adminKeypair ou que adminKeypair est le seul admin.
                // On s'assure d'abord que l'adminKeypair est bien une autorité.
                if (!currentAccountState.authorities.some(auth => auth.equals(adminKeypair.publicKey))) {
                    console.warn(`  ensureTreasuryRolesInitialized: adminKeypair ${shortenAddress(adminKeypair.publicKey)} is not in authorities ${currentAccountState.authorities.map(a=>shortenAddress(a))}. Cannot clear roles.`);
                } else {
                    console.log(`  Clearing ${currentAccountState.roles.length} roles from TreasuryRoles ${shortenAddress(pda)} using authority ${shortenAddress(adminKeypair.publicKey)}...`);
                    // Créer une copie des rôles à supprimer pour éviter les problèmes d'itération sur une collection modifiée
                    const rolesToRemove = [...currentAccountState.roles];
                    for (const role of rolesToRemove) {
                        try {
                            // console.log(`    Removing role: Pubkey ${shortenAddress(role.pubkey)}, Type ${JSON.stringify(role.roleType)}`);
                            await program.methods.removeTreasuryRole(role.roleType, role.pubkey)
                                .accounts({ 
                                    treasuryRoles: pda, 
                                    authority: adminKeypair.publicKey 
                                })
                                .signers([adminKeypair])
                                .rpc();
                        } catch (error) {
                            console.error(`    Failed to remove role for ${shortenAddress(role.pubkey)}:`, error);
                            // Continuer d'essayer de supprimer les autres rôles
                        }
                    }
                    const finalState = await program.account.treasuryRoles.fetch(pda);
                    console.log(`  TreasuryRoles ${shortenAddress(pda)} now has ${finalState.roles.length} roles after clearing.`);
                }
            }
        }
    }
    return pda;
}

// --- Fonction à ajouter : addAdminRoleOnChain (qui sera probablement ensureAdminInTreasuryRoles) --- 