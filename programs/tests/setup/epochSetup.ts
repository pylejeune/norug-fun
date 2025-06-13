// Placeholder pour les fonctions de setup des epochs 

// Fonctions de setup pour les Époques
export {}; // Pour que le fichier soit traité comme un module 

import * as anchor from '@coral-xyz/anchor';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { TestContext } from './index'; // Assurez-vous que le chemin est correct
import { shortenAddress } from '../utils_for_tests/helpers'; // Importer shortenAddress

/**
 * Calcule le PDA (Program Derived Address) pour un compte EpochManagement.
 * @param programId L'ID du programme Solana.
 * @param epochId L'identifiant de l'époque.
 * @returns Une paire [PublicKey, bump] pour le PDA de l'EpochManagement.
 */
export const getEpochManagementPda = (programId: PublicKey, epochId: anchor.BN): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("epoch"), epochId.toArrayLike(Buffer, "le", 8)],
        programId
    );
};

/**
 * S'assure qu'un compte EpochManagement existe pour un epochId donné.
 * Si le compte n'existe pas, il appelle l'instruction `start_epoch`.
 * Note: `start_epoch` crée l'epoch avec un statut initial (ex: Pending ou directement Active si les temps correspondent).
 * 
 * @param ctx Le contexte de test actuel.
 * @param epochId L'identifiant de l'époque à assurer/créer.
 * @param startTime Le temps de début de l'époque.
 * @param endTime Le temps de fin de l'époque.
 * @param authorityKp Optionnel, le Keypair de l'autorité pour signer. Si non fourni, `ctx.adminKeypair` sera utilisé.
 * @returns L'adresse PublicKey du compte EpochManagement.
 */
export async function ensureEpochExists(
    ctx: TestContext, 
    epochId: anchor.BN, 
    startTime: anchor.BN, 
    endTime: anchor.BN,
    authorityKp?: Keypair
): Promise<PublicKey> {
    if (!ctx.programConfigAddress) {
        throw new Error("ProgramConfigAddress not found in TestContext. Ensure it was initialized before calling epoch setup functions.");
    }
    const [epochManagementAddress, _bump] = getEpochManagementPda(ctx.program.programId, epochId);
    const signer = authorityKp || ctx.adminKeypair;

    try {
        await ctx.program.account.epochManagement.fetch(epochManagementAddress);
        console.log(`EpochManagement account ${shortenAddress(epochManagementAddress)} for epoch ${epochId.toString()} already exists.`);
        return epochManagementAddress;
    } catch (error) {
        if (error.message.includes('Account does not exist') || error.message.includes('could not find account')) {
            console.log(`EpochManagement account ${shortenAddress(epochManagementAddress)} for epoch ${epochId.toString()} not found, creating with start_epoch...`);
        } else {
            console.log(`Attempting to create EpochManagement ${shortenAddress(epochManagementAddress)} for epoch ${epochId.toString()} after fetch error: ${error.message}`);
        }
    }

    try {
        await ctx.program.methods
            .startEpoch(epochId, startTime, endTime)
            .accounts({
                authority: signer.publicKey,
                programConfig: ctx.programConfigAddress,
                epochManagement: epochManagementAddress,
                systemProgram: SystemProgram.programId,
            } as any)
            .signers([signer])
            .rpc();
        console.log(`EpochManagement account ${shortenAddress(epochManagementAddress)} for epoch ${epochId.toString()} created successfully.`);
        return epochManagementAddress;
    } catch (error) {
        console.error(`Failed to create EpochManagement account ${shortenAddress(epochManagementAddress)} for epoch ${epochId.toString()}:`, error);
        throw error;
    }
}

/**
 * S'assure qu'un epoch est "actif" (son heure de début est passée et son heure de fin est future).
 * Crée l'epoch via `ensureEpochExists` si nécessaire.
 * @param ctx Le contexte de test actuel.
 * @param epochId L'identifiant de l'époque.
 * @param authorityKp Optionnel, le Keypair de l'autorité. Si non fourni, `ctx.adminKeypair` sera utilisé.
 * @returns L'adresse PublicKey du compte EpochManagement.
 */
export async function ensureEpochIsActive(
    ctx: TestContext, 
    epochId: anchor.BN,
    authorityKp?: Keypair 
): Promise<PublicKey> {
    const now = Math.floor(Date.now() / 1000);
    const startTime = new anchor.BN(now - 60); // Commence il y a 1 minute
    const endTime = new anchor.BN(now + 3600); // Se termine dans 1 heure
    console.log(`Ensuring epoch ${epochId.toString()} is active (startTime: ${startTime}, endTime: ${endTime})...`);
    return ensureEpochExists(ctx, epochId, startTime, endTime, authorityKp);
}


/**
 * Appelle l'instruction `end_epoch` pour un epochId donné.
 * S'assure que l'epoch existe avant de tenter de le fermer.
 * 
 * @param ctx Le contexte de test actuel.
 * @param epochId L'identifiant de l'époque à fermer.
 * @param authorityKp Optionnel, le Keypair de l'autorité pour signer. Si non fourni, `ctx.adminKeypair` sera utilisé.
 */
export async function closeEpochOnChain(
    ctx: TestContext, 
    epochId: anchor.BN,
    authorityKp?: Keypair
): Promise<void> {
    if (!ctx.programConfigAddress) {
        throw new Error("ProgramConfigAddress not found in TestContext. Ensure it was initialized before calling epoch setup functions.");
    }
    const [epochManagementAddress, _bump] = getEpochManagementPda(ctx.program.programId, epochId);
    const signer = authorityKp || ctx.adminKeypair;

    // S'assurer que l'epoch existe (au cas où, même si endEpoch devrait échouer proprement)
    try {
        await ctx.program.account.epochManagement.fetch(epochManagementAddress);
    } catch (error) {
        console.error(`EpochManagement account ${shortenAddress(epochManagementAddress)} for epoch ${epochId.toString()} not found. Cannot close.`);
        throw new Error(`Epoch ${epochId.toString()} must exist to be closed.`);
    }
    
    console.log(`Closing epoch ${epochId.toString()} on-chain...`);
    try {
        await ctx.program.methods
            .endEpoch(epochId)
            .accounts({
                authority: signer.publicKey,
                programConfig: ctx.programConfigAddress,
                epochManagement: epochManagementAddress,
                systemProgram: SystemProgram.programId, // end_epoch peut aussi avoir besoin de system_program selon l'IDL
            } as any)
            .signers([signer])
            .rpc();
        console.log(`Epoch ${epochId.toString()} closed successfully on-chain.`);
    } catch (error) {
        console.error(`Failed to close epoch ${epochId.toString()} on-chain:`, error);
        throw error;
    }
}

/**
 * Appelle l'instruction `mark_epoch_processed` pour un epochId donné.
 * S'assure que l'epoch existe et est fermé avant de tenter de le marquer.
 * 
 * @param ctx Le contexte de test actuel.
 * @param epochId L'identifiant de l'époque à marquer comme traitée.
 * @param authorityKp Optionnel, le Keypair de l'autorité. Si non fourni, `ctx.adminKeypair` sera utilisé.
 */
export async function markEpochAsProcessedOnChain(
    ctx: TestContext, 
    epochId: anchor.BN,
    authorityKp?: Keypair
): Promise<void> {
    if (!ctx.programConfigAddress) {
        throw new Error("ProgramConfigAddress not found in TestContext. Ensure it was initialized.");
    }
    const [epochManagementAddress, _bump] = getEpochManagementPda(ctx.program.programId, epochId);
    const signer = authorityKp || ctx.adminKeypair;

    // Optionnel : Vérifier que l'epoch est fermé avant de le marquer comme traité
    // const epochAccount = await ctx.program.account.epochManagement.fetch(epochManagementAddress);
    // if (!epochAccount.status.closed) {
    //     throw new Error(`Epoch ${epochId.toString()} must be closed before being marked as processed.`);
    // }

    console.log(`Marking epoch ${epochId.toString()} as processed on-chain...`);
    try {
        await ctx.program.methods
            .markEpochProcessed()
            .accounts({
                authority: signer.publicKey,
                programConfig: ctx.programConfigAddress,
                epochManagement: epochManagementAddress,
            } as any)
            .signers([signer])
            .rpc();
        console.log(`Epoch ${epochId.toString()} marked as processed successfully on-chain.`);
    } catch (error) {
        console.error(`Failed to mark epoch ${epochId.toString()} as processed on-chain:`, error);
        throw error;
    }
} 