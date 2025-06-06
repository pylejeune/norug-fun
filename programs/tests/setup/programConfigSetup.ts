// Fonctions de setup pour ProgramConfig
export {}; // Pour que le fichier soit traité comme un module

import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TestContext } from './index'; // Importer TestContext
import { Programs } from '../../target/types/programs'; // Importer Programs pour le typage
import { shortenAddress } from '../utils_for_tests/helpers'; // Importer shortenAddress

/**
 * Calcule l'adresse PDA pour le compte ProgramConfig.
 * @param {anchor.Program<Programs>} program - L'instance du programme Anchor, typée avec Programs.
 * @returns {[PublicKey, number]} L'adresse PDA et le bump.
 */
export const getProgramConfigPda = (program: anchor.Program<Programs>): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        program.programId
    );
};

/**
 * S'assure que le compte ProgramConfig est initialisé.
 * Si initialAdmin n'est pas fourni, utilise ctx.adminKeypair.publicKey.
 * Met à jour ctx.programConfigAddress avec l'adresse du compte.
 * @param {TestContext} ctx - Le contexte de test.
 * @param {PublicKey} [initialAdmin] - Clé publique optionnelle pour l'administrateur initial.
 * @returns {Promise<PublicKey>} L'adresse PDA du compte ProgramConfig.
 */
export async function ensureProgramConfigInitialized(
    ctx: TestContext,
    initialAdmin?: PublicKey
): Promise<PublicKey> {
    const { program, adminKeypair } = ctx;
    const [pda, _bump] = getProgramConfigPda(program);
    ctx.programConfigAddress = pda; // Mettre à jour le contexte

    const adminToUse = initialAdmin || adminKeypair.publicKey;

    try {
        // Essayer de fetch le compte pour voir s'il existe déjà
        await program.account.programConfig.fetch(pda);
        console.log(`ProgramConfig account ${shortenAddress(pda)} already initialized.`);
    } catch (error) {
        // Si fetch échoue, le compte n'existe probablement pas, donc on l'initialise
        console.log(`Initializing ProgramConfig account ${shortenAddress(pda)} with admin ${shortenAddress(adminToUse)}...`);
        try {
            await program.methods
                .initializeProgramConfig(adminToUse)
                .accounts({
                    programConfig: pda,
                    authority: adminKeypair.publicKey, 
                    systemProgram: SystemProgram.programId,
                } as any) // Cast en any pour résoudre l'erreur de linter
                .signers([adminKeypair]) 
                .rpc();
            console.log(`ProgramConfig account ${shortenAddress(pda)} initialized successfully.`);
        } catch (initError) {
            // Gérer le cas où l'initialisation échoue pour une autre raison (par exemple, adminToUse != adminKeypair.publicKey et adminKeypair n'est pas l'admin actuel)
            // Ou si le compte a été créé entre le fetch et l'appel d'initialisation (race condition)
            console.error(`Failed to initialize ProgramConfig ${shortenAddress(pda)}:`, initError);
            // Tenter de re-fetch au cas où une race condition aurait eu lieu
            try {
                const configAfterError = await program.account.programConfig.fetch(pda);
                console.log(`ProgramConfig ${shortenAddress(pda)} was found after init error, admin: ${shortenAddress(configAfterError.adminAuthority)}`);
            } catch (fetchAfterError) {
                console.error(`Still unable to fetch ProgramConfig ${shortenAddress(pda)} after init error:`, fetchAfterError);
                throw initError; // Renvoyer l'erreur d'initialisation originale
            }
        }
    }
    // Vérification finale pour s'assurer que l'admin est correct si initialAdmin était spécifié
    const finalConfig = await program.account.programConfig.fetch(pda);
    if (initialAdmin && !finalConfig.adminAuthority.equals(initialAdmin)) {
        console.warn(`Warning: ProgramConfig admin ${shortenAddress(finalConfig.adminAuthority)} does not match specified initialAdmin ${shortenAddress(initialAdmin)}.`);
        // Selon la logique souhaitée, on pourrait vouloir lancer une erreur ici ou tenter de mettre à jour l'admin.
        // Pour l'instant, on se contente d'un avertissement.
    }
    return pda;
} 