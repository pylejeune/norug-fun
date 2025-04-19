import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import dotenv from "dotenv";
// Assurez-vous que le chemin vers l'IDL est correct par rapport à la racine du projet
import idl from "../../programs/target/idl/programs.json"; 
// Assurez-vous que le chemin vers le type généré est correct
import { Programs } from "../../programs/target/types/programs"; 

dotenv.config();

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
        // TODO: 1. Trouver les époques fermées non traitées
        console.log("\n🔍 Finding closed epochs to process...");
        // Exemple: const closedEpochs = await findClosedUntreatedEpochs(program);

        // TODO: 2. Pour chaque époque trouvée :
        console.log("\n⚙️ Processing epochs...");
        // Exemple: for (const epoch of closedEpochs) {
        //    await processEpoch(program, epoch.publicKey, epoch.account.epochId);
        // }

        console.log("\n✅ Crank run finished successfully.");

    } catch (error) {
        console.error("\n❌ An error occurred during the crank run:", error);
        process.exit(1);
    }
}

// --- Fonctions d'aide (à implémenter) --- 

// async function findClosedUntreatedEpochs(program: anchor.Program<Programs>) {
//     // Récupérer toutes les époques
//     // Filtrer celles qui sont Closed
//     // Filtrer celles dont les propositions sont encore Active (ou autre critère)
//     return []; // Placeholder
// }

// async function processEpoch(program: anchor.Program<Programs>, epochPda: PublicKey, epochId: anchor.BN) {
//     console.log(`   Processing Epoch ID: ${epochId.toString()}`);
//     // 1. Récupérer toutes les propositions de cette époque
//     // 2. Trier par sol_raised
//     // 3. Déterminer Validated (top 10) / Rejected (autres)
//     // 4. Pour chaque proposition:
//     //    - Construire et envoyer la transaction update_proposal_status
//     //    - Gérer les erreurs
// }


// Lancer la fonction principale
main().catch(err => {
    console.error("💥 Uncaught error in main function:", err);
    process.exit(1);
}); 