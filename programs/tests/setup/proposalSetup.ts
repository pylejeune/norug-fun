// Placeholder pour les fonctions de setup des propositions 
 
// Fonctions de setup pour les Propositions de token
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { Programs } from '../../target/types/programs'; // Ajustez le chemin si nécessaire
import { TestContext } from './index'; // Assumant que TestContext est exporté depuis index.ts
import { getEpochManagementPda } from './epochSetup'; // À créer ou vérifier

/**
 * Interface pour les détails d'une proposition de token.
 */
export interface TokenProposalDetails {
    epochId: anchor.BN;
    name: string;
    symbol: string;
    totalSupply: anchor.BN;
    creatorAllocationPercentage: number; // u8
    description: string;
    imageUrl?: string | null; // Option<String>
    lockupPeriod: anchor.BN;
}

/**
 * Calcule le PDA pour un compte Proposal.
 * @param programId L'ID du programme.
 * @param proposerPublicKey La clé publique du proposeur.
 * @param epochId L'ID de l'époque (utilisé dans les seeds).
 * @param tokenName Le nom du token.
 * @returns La PublicKey du PDA de la proposition et le bump.
 */
export function getProposalPda(
    programId: PublicKey,
    proposerPublicKey: PublicKey,
    epochId: anchor.BN,
    tokenName: string
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("proposal"),
            proposerPublicKey.toBuffer(),
            epochId.toArrayLike(Buffer, "le", 8),
            Buffer.from(tokenName),
        ],
        programId
    );
}

/**
 * Crée une proposition de token on-chain.
 * S'assure que la config du programme et la trésorerie sont initialisées via le TestContext.
 * @param ctx Le contexte de test initialisé.
 * @param proposerKeypair Le Keypair du créateur de la proposition (signataire et payeur).
 * @param details Les détails de la proposition à créer.
 * @param epochManagementAddress L'adresse PDA du compte EpochManagement pour l'époque de la proposition.
 * @returns La PublicKey du PDA de la proposition créée.
 */
export async function createProposalOnChain(
    ctx: TestContext,
    proposerKeypair: Keypair,
    details: TokenProposalDetails,
    epochManagementAddress: PublicKey
): Promise<PublicKey> {
    const { program, treasuryAddress } = ctx;

    if (!treasuryAddress) {
        throw new Error("TreasuryAddress non trouvé dans TestContext. Assurez-vous qu'il est initialisé.");
    }

    const [proposalPda] = getProposalPda(
        program.programId,
        proposerKeypair.publicKey,
        details.epochId,
        details.name
    );

    console.log(`  [ProposalSetup] Création de la proposition "${details.name}" par ${proposerKeypair.publicKey.toBase58()} pour l'époque ${details.epochId.toString()}`);
    console.log(`  [ProposalSetup] PDA Proposition: ${proposalPda.toBase58()}`);

    try {
        await program.methods
            .createProposal(
                details.name,
                details.symbol,
                details.description,
                details.imageUrl || null,
                details.totalSupply,
                details.creatorAllocationPercentage,
                details.lockupPeriod
            )
            .accounts({
                tokenProposal: proposalPda,
                creator: proposerKeypair.publicKey,
                epoch: epochManagementAddress,
                treasury: treasuryAddress,
                systemProgram: SystemProgram.programId,
            } as any)
            .signers([proposerKeypair])
            .rpc();
        console.log(`  [ProposalSetup] Proposition "${details.name}" créée avec succès.`);
    } catch (error) {
        console.error(`  [ProposalSetup] Erreur lors de la création de la proposition "${details.name}":`, error);
        throw error;
    }
    
    return proposalPda;
}

/**
 * Calcule le PDA pour un compte Support (UserProposalSupport dans l'IDL).
 * @param programId L'ID du programme.
 * @param epochIdOfProposal L'ID de l'époque de la proposition à soutenir (nécessaire pour dériver le PDA de UserProposalSupport).
 * @param supporterPublicKey La clé publique du supporter.
 * @param proposalPda La PublicKey du PDA de la proposition.
 * @returns La PublicKey du PDA du support et le bump.
 */
export function getSupportPda(
    programId: PublicKey,
    epochIdOfProposal: anchor.BN,
    supporterPublicKey: PublicKey,
    proposalPda: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("support"),
            epochIdOfProposal.toArrayLike(Buffer, "le", 8),
            supporterPublicKey.toBuffer(),
            proposalPda.toBuffer(),
        ],
        programId
    );
}

/**
 * Soutient une proposition on-chain.
 * @param ctx Le contexte de test initialisé.
 * @param supporterKeypair Le Keypair du supporter (signataire et payeur).
 * @param proposalToSupportPda Le PDA de la proposition (TokenProposal) à soutenir.
 * @param epochIdOfProposal L'ID de l'époque de la proposition à soutenir (nécessaire pour dériver le PDA de UserProposalSupport).
 * @param epochManagementAddressForProposalEpoch L'adresse PDA du compte EpochManagement pour l'époque de la proposition.
 * @param supportAmount Le montant en lamports à engager pour le soutien.
 * @returns La PublicKey du PDA du compte UserProposalSupport créé.
 */
export async function supportProposalOnChain(
    ctx: TestContext,
    supporterKeypair: Keypair,
    proposalToSupportPda: PublicKey,
    epochIdOfProposal: anchor.BN,
    epochManagementAddressForProposalEpoch: PublicKey,
    supportAmount: anchor.BN
): Promise<PublicKey> {
    const { program, treasuryAddress } = ctx;

    if (!treasuryAddress) {
        throw new Error("TreasuryAddress non trouvé dans TestContext. Assurez-vous qu'il est initialisé.");
    }

    const [userSupportPda] = getSupportPda(
        program.programId,
        epochIdOfProposal,
        supporterKeypair.publicKey,
        proposalToSupportPda
    );

    console.log(`  [ProposalSetup] Soutien de la proposition ${proposalToSupportPda.toBase58()} (époque ${epochIdOfProposal.toString()}) par ${supporterKeypair.publicKey.toBase58()} avec ${supportAmount.toString()} lamports.`);
    console.log(`  [ProposalSetup] PDA UserProposalSupport: ${userSupportPda.toBase58()}`);

    try {
        await program.methods
            .supportProposal(supportAmount)
            .accounts({
                userSupport: userSupportPda,
                proposal: proposalToSupportPda,
                user: supporterKeypair.publicKey,
                epoch: epochManagementAddressForProposalEpoch,
                treasury: treasuryAddress,
                systemProgram: SystemProgram.programId,
            } as any)
            .signers([supporterKeypair])
            .rpc();
        console.log(`  [ProposalSetup] Soutien enregistré avec succès pour la proposition ${proposalToSupportPda.toBase58()}.`);
    } catch (error) {
        console.error(`  [ProposalSetup] Erreur lors du soutien de la proposition ${proposalToSupportPda.toBase58()}:`, error);
        throw error;
    }
    
    return userSupportPda;
}

// Fonctions de setup pour les Propositions de token
export {}; // Pour que le fichier soit traité comme un module 