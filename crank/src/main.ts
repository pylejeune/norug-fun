import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import dotenv from "dotenv";
// Assurez-vous que le chemin vers l'IDL est correct par rapport à la racine du projet
import idl from "../../programs/target/idl/programs.json"; 
// Importer le type global du programme
import { Programs } from "../../programs/target/types/programs"; 

dotenv.config();

// Définir une interface locale pour la structure retournée par .all()
// car ProgramAccount n'est pas exporté et EpochManagement type peut ne pas être exporté
interface EpochManagementAccountInfo {
    publicKey: PublicKey;
    account: {
        epochId: anchor.BN;
        startTime: anchor.BN;
        endTime: anchor.BN;
        status: any; // Utiliser 'any' ou un type plus spécifique pour l'enum si connu
        processed: boolean;
    };
}

// Fonction principale asynchrone
async function main() {
    console.log("🚀 Starting Crank Service...");

    // --- Configuration --- 
    const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8899"; // Utiliser une variable d'env ou localhost
    const ADMIN_AUTHORITY_SECRET_KEY_PATH = process.env.ADMIN_AUTHORITY_SECRET_KEY_PATH; // Chemin vers la clé privée de l'admin

    if (!ADMIN_AUTHORITY_SECRET_KEY_PATH) {
        console.error("❌ ADMIN_AUTHORITY_SECRET_KEY_PATH environment variable is not set.");
        process.exit(1);
    }

    // Charger la clé privée de l'admin
    let adminKeypair: Keypair;
    try {
        const secretKeyString = require("fs").readFileSync(ADMIN_AUTHORITY_SECRET_KEY_PATH, "utf-8");
        adminKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secretKeyString)));
        console.log(`🔑 Admin Authority loaded: ${adminKeypair.publicKey.toBase58()}`);
    } catch (error) {
        console.error(`❌ Error loading admin keypair from ${ADMIN_AUTHORITY_SECRET_KEY_PATH}:`, error);
        process.exit(1);
    }

    // Initialiser la connexion et le provider Anchor
    const connection = new Connection(RPC_URL, "confirmed");
    const wallet = new anchor.Wallet(adminKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, anchor.AnchorProvider.defaultOptions());
    const program = new anchor.Program<Programs>(idl as Programs, provider);

    console.log(`✅ Connected to RPC: ${RPC_URL}`);
    console.log(`✅ Program ID: ${program.programId.toBase58()}`);

    // --- Logique Principale --- 
    try {
        // 1. Trouver les époques fermées non traitées
        console.log("\n🔍 Finding closed epochs to process...");
        const untreatedEpochs = await findClosedUntreatedEpochs(program);

        if (untreatedEpochs.length === 0) {
            console.log("   -> No untreated closed epochs found.");
        } else {
            console.log(`   -> Found ${untreatedEpochs.length} untreated epoch(s).`);
            console.log("\n⚙️ Processing epochs...");
            for (const epochInfo of untreatedEpochs) {
                // Passer l'adminKeypair à processEpoch
                await processEpoch(program, adminKeypair, epochInfo.publicKey, epochInfo.account);
            }
        }

        console.log("\n✅ Crank run finished successfully.");

    } catch (error) {
        console.error("\n❌ An error occurred during the crank run:", error);
        process.exit(1);
    }
}

// --- Fonctions d'aide --- 

/**
 * Trouve les époques fermées dont au moins une proposition est encore active.
 */
async function findClosedUntreatedEpochs(program: anchor.Program<Programs>) {
    console.log("   Fetching all epochs...");
    const allEpochs: EpochManagementAccountInfo[] = await program.account.epochManagement.all();
    console.log(`   Found ${allEpochs.length} total epochs.`);

    const closedUntreatedEpochs = allEpochs.filter(epoch => 
        // Vérifier que l'époque est fermée ET non traitée
        ('closed' in epoch.account.status) && !epoch.account.processed 
    );
    // Renommer la variable pour plus de clarté
    console.log(`   Found ${closedUntreatedEpochs.length} closed and untreated epochs.`);

    // Initialiser avec le type correct en utilisant l'interface locale
    const epochsToProcess: EpochManagementAccountInfo[] = []; 
    for (const epochInfo of closedUntreatedEpochs) { // Utiliser la variable renommée
        console.log(`   Checking epoch ${epochInfo.account.epochId.toString()} for active proposals...`);
        // Récupérer les propositions pour cette époque
        const proposals = await program.account.tokenProposal.all([
            {
                memcmp: {
                    offset: 8, // Discriminator
                    bytes: epochInfo.account.epochId.toBuffer("le", 8).toString("base64")
                }
            }
        ]);
        console.log(`      Found ${proposals.length} proposals for this epoch.`);

        // Vérifier si au moins une proposition est encore "Active"
        const hasActiveProposal = proposals.some(proposal => 
            'active' in proposal.account.status
        );

        if (hasActiveProposal) {
            console.log(`      -> Epoch ${epochInfo.account.epochId.toString()} has active proposals. Adding to processing list.`);
            // Ajouter à la liste des époques à traiter effectivement (celles avec des props actives)
            epochsToProcess.push(epochInfo); 
        } else {
            console.log(`      -> Epoch ${epochInfo.account.epochId.toString()} has no active proposals. Marking as processed directly.`);
            // Si une époque fermée n'a AUCUNE proposition active, on peut la marquer comme traitée 
            // sans passer par processEpoch. Cela nécessite un appel ici.
            // Note : Ceci ajoute un appel RPC supplémentaire par époque sans proposition active.
            // Alternative: Laisser processEpoch gérer ce cas (il retournera tôt si activeProposals est vide)
            //              et ensuite marquer comme traitée à la fin de processEpoch.
            // Pour l'instant, on garde la logique dans processEpoch.
            // epochsToProcess.push(epochInfo); // Décommenter si on veut la traiter dans processEpoch
        }
    }

    // Retourner uniquement les époques qui ont besoin de traitement de propositions
    return epochsToProcess; 
}

/**
 * Traite une époque fermée : récupère, trie et met à jour le statut des propositions.
 * @param program Instance du programme Anchor
 * @param adminAuthority Keypair de l'autorité admin qui signera les transactions
 * @param epochPda Clé publique du compte EpochManagement
 * @param epochAccount Données du compte EpochManagement (utiliser 'any' ou l'interface interne)
 */
async function processEpoch(
    program: anchor.Program<Programs>,
    adminAuthority: Keypair,
    epochPda: PublicKey,
    // Utiliser le type interne 'account' de notre interface locale
    epochAccount: EpochManagementAccountInfo['account'] 
) {
    const epochId = epochAccount.epochId as anchor.BN;
    console.log(`   Processing Epoch ID: ${epochId.toString()}`);

    // Trouver le PDA de ProgramConfig
    const [programConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        program.programId
    );

    // 1. Récupérer toutes les propositions de cette époque
    console.log(`      Fetching proposals for epoch ${epochId.toString()}...`);
    const proposals = await program.account.tokenProposal.all([
        { memcmp: { offset: 8, bytes: epochId.toBuffer("le", 8).toString("base64") } }
    ]);
    console.log(`      Found ${proposals.length} total proposals for this epoch.`);

    // 2. Filtrer celles qui sont encore Active
    const activeProposals = proposals.filter(p => 
        'active' in p.account.status
    );
    if (activeProposals.length === 0) {
        console.log(`      -> No active proposals left to process for epoch ${epochId.toString()}.`);
        return; // Rien à faire pour cette époque
    }
    console.log(`      Found ${activeProposals.length} active proposals to process.`);

    // 3. Trier par sol_raised (décroissant)
    activeProposals.sort((a, b) => b.account.solRaised.cmp(a.account.solRaised));

    // 4. Déterminer Validated (top 10) / Rejected (autres)
    const top10 = activeProposals.slice(0, 10);
    const others = activeProposals.slice(10);
    console.log(`      -> Top 10 proposals identified (${top10.length}).`);
    console.log(`      -> Others proposals identified (${others.length}).`);

    // 5. Envoyer les transactions de mise à jour (séquentiellement pour commencer, peut être parallélisé)
    console.log(`      Sending update transactions...`);
    let successCount = 0;
    let errorCount = 0;

    // --- Validated --- 
    for (const proposalInfo of top10) {
        console.log(`         -> Updating ${proposalInfo.publicKey.toBase58()} to Validated`);
        try {
            const tx = await program.methods
                .updateProposalStatus({ validated: {} })
                .accounts({
                    authority: adminAuthority.publicKey,
                    programConfig: programConfigPda,
                    epochManagement: epochPda,
                    proposal: proposalInfo.publicKey,
                })
                .signers([adminAuthority]) // Clé admin signe
                .rpc();
            console.log(`            ✅ Success (Tx: ${tx.substring(0, 8)}...)`);
            successCount++;
        } catch (err: any) {
            console.error(`         ❌ Failed to update ${proposalInfo.publicKey.toBase58()} to Validated:`, err.message);
            errorCount++;
            // Continuer avec les autres même en cas d'erreur
        }
    }

    // --- Rejected --- 
    for (const proposalInfo of others) {
        console.log(`         -> Updating ${proposalInfo.publicKey.toBase58()} to Rejected`);
        try {
            const tx = await program.methods
                .updateProposalStatus({ rejected: {} })
                .accounts({
                    authority: adminAuthority.publicKey,
                    programConfig: programConfigPda,
                    epochManagement: epochPda,
                    proposal: proposalInfo.publicKey,
                })
                .signers([adminAuthority])
                .rpc();
            console.log(`            ✅ Success (Tx: ${tx.substring(0, 8)}...)`);
            successCount++;
        } catch (err: any) {
            console.error(`         ❌ Failed to update ${proposalInfo.publicKey.toBase58()} to Rejected:`, err.message);
            errorCount++;
            // Continuer avec les autres même en cas d'erreur
        }
    }

    console.log(`      Finished processing proposals for epoch ${epochId.toString()}. Success: ${successCount}, Errors: ${errorCount}`);

    // 6. Marquer l'époque comme traitée (si aucune erreur critique n'est survenue ?)
    //    Pour l'instant, on marque comme traité même s'il y a eu des erreurs sur certaines propositions.
    if (errorCount < activeProposals.length) { // Ou une autre condition si nécessaire
        console.log(`      Marking epoch ${epochId.toString()} as processed...`);
        try {
            const tx = await program.methods
                .markEpochProcessed()
                .accounts({
                    authority: adminAuthority.publicKey,
                    epochManagement: epochPda, 
                })
                .signers([adminAuthority])
                .rpc();
            console.log(`         ✅ Epoch marked as processed (Tx: ${tx.substring(0, 8)}...)`);
        } catch (err: any) {
            console.error(`         ❌ Failed to mark epoch ${epochId.toString()} as processed:`, err.message);
            // Que faire ici ? Logger l'erreur et continuer ?
        }
    } else {
        console.warn(`      Skipping marking epoch ${epochId.toString()} as processed due to all proposal updates failing.`);
    }
}

// Lancer la fonction principale
main().catch(err => {
    console.error("💥 Uncaught error in main function:", err);
    process.exit(1);
}); 