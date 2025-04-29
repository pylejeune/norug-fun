import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Programs } from "../target/types/programs";
import { BN } from "@coral-xyz/anchor";
import { CONFIG } from "./config";
import * as fs from 'fs';
import * as path from 'path';

// Fonction pour charger le keypair admin
function loadAdminKeypair(): Keypair {
    try {
        const keypairData = require(`../${CONFIG.ADMIN_KEYPAIR_PATH}`);
        return Keypair.fromSecretKey(new Uint8Array(keypairData));
    } catch (error) {
        console.error("Erreur lors du chargement du keypair admin:", error);
        throw error;
    }
}

async function main() {
    try {
        // Afficher la configuration chargée
        console.log("Configuration chargée :", {
            RPC_ENDPOINT: CONFIG.RPC_ENDPOINT,
            ADMIN_KEYPAIR_PATH: CONFIG.ADMIN_KEYPAIR_PATH,
            SCHEDULER_INTERVAL: CONFIG.SCHEDULER_INTERVAL,
        });

        // Initialiser la connexion
        const connection = new anchor.web3.Connection(CONFIG.RPC_ENDPOINT);
        const adminKeypair = loadAdminKeypair();
        
        // Initialiser le provider et le programme
        const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(adminKeypair), {});
        anchor.setProvider(provider);
        // Se placer dans le répertoire programs pour que Anchor.toml soit trouvé
        process.chdir(path.resolve(__dirname, '..'));
        // Récupérer le programme depuis le workspace Anchor
        const program = anchor.workspace.Programs as Program<Programs>;

        // Fonction pour vérifier et terminer les époques
        async function checkAndEndEpochs() {
            console.log("checkAndEndEpochs");
            try {
                // Récupérer toutes les époques
                const allEpochs = await program.account.epochManagement.all();
                
                // Filtrer les époques actives
                const activeEpochs = allEpochs.filter(epoch => 
                    JSON.stringify(epoch.account.status) === JSON.stringify({ active: {} })
                );

                console.log(`Nombre d'époques actives trouvées: ${activeEpochs.length}`);

                // Pour chaque époque active
                for (const epoch of activeEpochs) {
                    console.log("Epoch:", epoch);
                    const currentTime = Math.floor(Date.now() / 1000);

                    console.log("Terminé ? :", currentTime >= epoch.account.endTime.toNumber());
                    
                    // Vérifier si l'époque doit être terminée
                    if (currentTime >= epoch.account.endTime.toNumber()) {
                        console.log(`Fermeture de l'époque ${epoch.account.epochId.toString()}`);
                        
                        try {
                            // Log pour déboguer la structure de l'instruction
                            console.log("Structure de l'instruction endEpoch:", program.methods.endEpoch);
                            
                            // Appeler l'instruction end_epoch
                            await program.rpc.endEpoch(
                                new BN(epoch.account.epochId),
                                {
                                    accounts: {
                                        epochManagement: epoch.publicKey,
                                        authority: adminKeypair.publicKey,
                                        systemProgram: anchor.web3.SystemProgram.programId,
                                    },
                                    signers: [adminKeypair],
                                }
                            );
                            
                            console.log(`Époque ${epoch.account.epochId.toString()} fermée avec succès`);
                        } catch (error) {
                            console.error(`Erreur lors de la fermeture de l'époque ${epoch.account.epochId.toString()}:`, error);
                        }
                    }
                }
            } catch (error) {
                console.error("Erreur lors de la vérification des époques:", error);
            }
        }

        // Exécuter la vérification toutes les minutes
        console.log("Démarrage du scheduler d'époques...");
        setInterval(checkAndEndEpochs, CONFIG.SCHEDULER_INTERVAL);
        
        // Exécuter immédiatement la première vérification
        await checkAndEndEpochs();

    } catch (error) {
        console.error("Erreur dans le scheduler:", error);
    }
}

main().then(
    () => process.exit(0),
    (err) => {
        console.error(err);
        process.exit(1);
    }
); 