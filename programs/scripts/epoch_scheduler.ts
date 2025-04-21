import * as anchor from "@coral-xyz/anchor";
import { Program, Idl } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import * as fs from 'fs';
import * as path from 'path';
import { Programs } from "../target/types/programs";

// Configuration
const CONFIG = {
    RPC_ENDPOINT: process.env.RPC_ENDPOINT || "https://api.mainnet-beta.solana.com",
    CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes en millisecondes
    LOG_FILE: "epoch_scheduler.log"
};

// Fonction pour logger les messages
function log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    console.log(logMessage);
    fs.appendFileSync(CONFIG.LOG_FILE, logMessage);
}

async function main() {
    try {
        // Charger la clé privée de l'admin depuis un fichier
        const adminKeypairFile = process.env.ADMIN_KEYPAIR_PATH;
        if (!adminKeypairFile) {
            throw new Error("ADMIN_KEYPAIR_PATH non défini dans les variables d'environnement");
        }

        const adminKeypair = Keypair.fromSecretKey(
            new Uint8Array(JSON.parse(fs.readFileSync(adminKeypairFile, 'utf-8')))
        );

        // Initialiser la connexion et le programme
        const connection = new Connection(CONFIG.RPC_ENDPOINT, 'confirmed');
        const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(adminKeypair), {});
        anchor.setProvider(provider);

        // Charger l'IDL
        const idl = JSON.parse(
            fs.readFileSync(path.join(__dirname, "../target/idl/programs.json"), 'utf-8')
        ) as Idl;

        // Initialiser le programme avec le bon type
        const program = new Program(
            idl as Programs,
            new PublicKey("89S48feUon6ffgtLzsnqoBVwdb1mxT4rmhRR5WnYefpA"),
            provider
        );

        log("Scheduler d'époques démarré");

        // Fonction pour vérifier et terminer les époques
        async function checkAndEndEpochs() {
            try {
                // Récupérer le PDA de la configuration du programme
                const [programConfigPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("config")],
                    program.programId
                );

                // Récupérer toutes les époques
                const allEpochs = await program.account.epochManagement.all();
                
                // Filtrer les époques actives
                const activeEpochs = allEpochs.filter(epoch => 
                    JSON.stringify(epoch.account.status) === JSON.stringify({ active: {} })
                );

                log(`Nombre d'époques actives trouvées: ${activeEpochs.length}`);

                // Pour chaque époque active
                for (const epoch of activeEpochs) {
                    try {
                        log(`Vérification de l'époque ${epoch.account.epochId}...`);
                        
                        // Appeler check_and_end_epochs
                        await program.methods
                            .checkAndEndEpochs()
                            .accounts({
                                authority: adminKeypair.publicKey,
                                programConfig: programConfigPda,
                                epochManagement: epoch.publicKey,
                                systemProgram: anchor.web3.SystemProgram.programId,
                            })
                            .rpc();
                        
                        log(`Époque ${epoch.account.epochId} vérifiée avec succès`);
                        
                        // Vérifier le nouveau statut
                        const updatedEpoch = await program.account.epochManagement.fetch(epoch.publicKey);
                        log(`Nouveau statut: ${JSON.stringify(updatedEpoch.status)}`);
                        
                    } catch (error) {
                        log(`Erreur lors de la vérification de l'époque ${epoch.account.epochId}: ${error}`);
                    }
                }
            } catch (error) {
                log(`Erreur lors de l'exécution du scheduler: ${error}`);
            }
        }

        // Exécuter la première vérification
        await checkAndEndEpochs();

        // Configurer l'exécution périodique
        setInterval(checkAndEndEpochs, CONFIG.CHECK_INTERVAL);

        // Gérer l'arrêt propre
        process.on('SIGINT', () => {
            log("Arrêt du scheduler...");
            process.exit(0);
        });

    } catch (error) {
        log(`Erreur fatale: ${error}`);
        process.exit(1);
    }
}

main(); 