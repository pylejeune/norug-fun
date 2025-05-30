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
 * @param epochId L'ID de l'époque.
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
 * S'assure que l'époque, la config du programme et la trésorerie sont initialisées via le TestContext.
 * @param ctx Le contexte de test initialisé.
 * @param proposerKeypair Le Keypair du créateur de la proposition (signataire et payeur).
 * @param details Les détails de la proposition à créer.
 * @returns La PublicKey du PDA de la proposition créée.
 */
export async function createProposalOnChain(
    ctx: TestContext,
    proposerKeypair: Keypair,
    details: TokenProposalDetails
): Promise<PublicKey> {
    const { program, programConfigAddress, treasuryAddress, epochManagementAddress } = ctx;

    if (!programConfigAddress) {
        throw new Error("ProgramConfigAddress non trouvé dans TestContext. Assurez-vous qu'il est initialisé.");
    }
    if (!treasuryAddress) {
        throw new Error("TreasuryAddress non trouvé dans TestContext. Assurez-vous qu'il est initialisé.");
    }
    if (!epochManagementAddress) {
        throw new Error("EpochManagementAddress non trouvé dans TestContext pour epochId. Assurez-vous qu'une époque active est initialisée.");
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
            .createTokenProposal(
                details.epochId,
                details.name,
                details.symbol,
                details.totalSupply,
                details.creatorAllocationPercentage,
                details.description,
                details.imageUrl || null, // Assurer null si undefined
                details.lockupPeriod
            )
            .accounts({
                proposal: proposalPda,
                proposer: proposerKeypair.publicKey,
                epochManagement: epochManagementAddress, // Doit correspondre à details.epochId
                treasury: treasuryAddress,
                programConfig: programConfigAddress,
                systemProgram: SystemProgram.programId,
            })
            .signers([proposerKeypair]) // Le proposeur signe et paie les frais
            .rpc();
        console.log(`  [ProposalSetup] Proposition "${details.name}" créée avec succès.`);
    } catch (error) {
        console.error(`  [ProposalSetup] Erreur lors de la création de la proposition "${details.name}":`, error);
        throw error;
    }
    
    return proposalPda;
}

/**
 * Calcule le PDA pour un compte Support.
 * @param programId L'ID du programme.
 * @param proposalPda La PublicKey du PDA de la proposition.
 * @param supporterPublicKey La clé publique du supporter.
 * @returns La PublicKey du PDA du support et le bump.
 */
export function getSupportPda(
    programId: PublicKey,
    proposalPda: PublicKey,
    supporterPublicKey: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("support"),
            proposalPda.toBuffer(),
            supporterPublicKey.toBuffer(),
        ],
        programId
    );
}

/**
 * Soutient une proposition on-chain.
 * S'assure que la config du programme et la trésorerie sont initialisées via le TestContext.
 * @param ctx Le contexte de test initialisé.
 * @param supporterKeypair Le Keypair du supporter (signataire et payeur).
 * @param proposalToSupportPda Le PDA de la proposition à soutenir.
 * @param supportAmount Le montant en lamports à engager pour le soutien.
 * @returns La PublicKey du PDA du compte Support créé.
 */
export async function supportProposalOnChain(
    ctx: TestContext,
    supporterKeypair: Keypair,
    proposalToSupportPda: PublicKey,
    supportAmount: anchor.BN
): Promise<PublicKey> {
    const { program, programConfigAddress, treasuryAddress } = ctx;

    if (!programConfigAddress) {
        throw new Error("ProgramConfigAddress non trouvé dans TestContext. Assurez-vous qu'il est initialisé.");
    }
    if (!treasuryAddress) {
        throw new Error("TreasuryAddress non trouvé dans TestContext. Assurez-vous qu'il est initialisé.");
    }

    const [supportPda] = getSupportPda(
        program.programId,
        proposalToSupportPda,
        supporterKeypair.publicKey
    );

    console.log(`  [ProposalSetup] Soutien de la proposition ${proposalToSupportPda.toBase58()} par ${supporterKeypair.publicKey.toBase58()} avec ${supportAmount.toString()} lamports.`);
    console.log(`  [ProposalSetup] PDA Support: ${supportPda.toBase58()}`);

    try {
        await program.methods
            .supportProposal(supportAmount)
            .accounts({
                support: supportPda,
                proposal: proposalToSupportPda,
                supporter: supporterKeypair.publicKey,
                treasury: treasuryAddress,
                programConfig: programConfigAddress,
                systemProgram: SystemProgram.programId,
            })
            .signers([supporterKeypair])
            .rpc();
        console.log(`  [ProposalSetup] Soutien enregistré avec succès pour la proposition ${proposalToSupportPda.toBase58()}.`);
    } catch (error) {
        console.error(`  [ProposalSetup] Erreur lors du soutien de la proposition ${proposalToSupportPda.toBase58()}:`, error);
        throw error;
    }
    
    return supportPda;
}

// Fonctions de setup pour les Propositions de token
export {}; // Pour que le fichier soit traité comme un module 