import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Programs } from "../target/types/programs";
import { BN } from "@coral-xyz/anchor";
import { CONFIG } from "./config";
import * as fs from 'fs';
import * as path from 'path';
import { exit } from "process";

// Utiliser le même ADMIN_SEED que dans crank_simulation.test.ts
const ADMIN_SEED = Uint8Array.from([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]);

// Fonction pour générer le keypair admin de manière déterministe
function getAdminKeypair(): Keypair {
    return Keypair.fromSeed(ADMIN_SEED);
}

async function main() {
    try {
        // Afficher la configuration chargée
        console.log("Configuration chargée :", {
            RPC_ENDPOINT: CONFIG.RPC_ENDPOINT,
            SCHEDULER_INTERVAL: CONFIG.SCHEDULER_INTERVAL,
        });

        // Initialiser la connexion
        const connection = new anchor.web3.Connection(CONFIG.RPC_ENDPOINT);
        // Utiliser la méthode déterministe comme dans le crank
        const adminKeypair = getAdminKeypair();
        
        // Afficher la clé publique de l'administrateur pour vérification
        console.log("Admin public key:", adminKeypair.publicKey.toString());
        
        // Obtenir et afficher le solde du wallet admin
        const balance = await connection.getBalance(adminKeypair.publicKey);
        console.log(`RPC utilisé: ${CONFIG.RPC_ENDPOINT}`);
        console.log(`Balance du wallet admin: ${balance / LAMPORTS_PER_SOL} SOL`);
        
        // Vérifier si le solde est suffisant pour les transactions
        if (balance < 0.01 * LAMPORTS_PER_SOL) {
            console.warn("⚠️ ATTENTION: Le solde du wallet admin est très bas!");
            console.warn("Les transactions pourraient échouer par manque de fonds.");
        }
        
        // Initialiser le provider et le programme
        const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(adminKeypair), {});
        anchor.setProvider(provider);
        // Se placer dans le répertoire programs pour que Anchor.toml soit trouvé
        process.chdir(path.resolve(__dirname, '..'));
        // Récupérer le programme depuis le workspace Anchor
        const program = anchor.workspace.Programs as Program<Programs>;

        // Dériver la PDA pour le compte de configuration
        const [configPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            program.programId
        );
        
        // Récupérer le compte ProgramConfig pour vérifier l'autorité admin
        try {
            const programConfig = await program.account.programConfig.fetch(configPDA);
            console.log("Admin authority from ProgramConfig:", programConfig.adminAuthority.toString());
            
            // Vérifier si l'admin keypair correspond à l'admin authority
            if (adminKeypair.publicKey.toString() !== programConfig.adminAuthority.toString()) {
                console.warn("⚠️ ATTENTION: Le keypair admin utilisé ne correspond pas à l'admin authority configurée!");
                console.warn("Cela pourrait causer des erreurs d'autorisation lors des transactions.");
            } else {
                console.log("✓ Le keypair admin correspond à l'admin authority configurée.");
                
            }
        } catch (error) {
            console.error("Erreur lors de la récupération du compte ProgramConfig:", error);
            console.log("Le compte ProgramConfig n'existe pas encore. Vous devez d'abord initialiser le programme.");
            console.log("Exécutez: npx ts-node scripts/initialize_program.ts");
            
            // Continuer quand même pour tester la logique de base
            console.log("Poursuite du script sans vérification d'autorité...");
        }

        // Fonction pour vérifier et terminer les époques
        async function checkAndEndEpochs() {
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
                    const startTimeUnix = epoch.account.startTime.toNumber();
                    const endTimeUnix = epoch.account.endTime.toNumber();
                    
                    // Convertir en dates lisibles
                    const startTimeDate = new Date(startTimeUnix * 1000);
                    const endTimeDate = new Date(endTimeUnix * 1000);
                    
                    // Formater les dates pour l'affichage
                    const startTimeFormatted = startTimeDate.toLocaleString('fr-FR');
                    const endTimeFormatted = endTimeDate.toLocaleString('fr-FR');

                    console.log(`\nEpoch ID: ${epoch.account.epochId.toString()}`);
                    console.log(`Start time: ${startTimeFormatted} (${startTimeUnix})`);
                    console.log(`End time: ${endTimeFormatted} (${endTimeUnix})`);
                    
                    const currentTime = Math.floor(Date.now() / 1000);
                    const currentTimeFormatted = new Date(currentTime * 1000).toLocaleString('fr-FR');
                    
                    console.log(`Heure actuelle: ${currentTimeFormatted} (${currentTime})`);
                    console.log(`Terminé ? ${currentTime >= endTimeUnix ? "OUI" : "NON"}`);
                    
                    // Vérifier si l'époque doit être terminée
                    if (currentTime >= endTimeUnix) {
                        console.log(`Fermeture de l'époque ${epoch.account.epochId.toString()}`);
                        
                        try {
                            // Log pour déboguer la structure de l'instruction
                            console.dir("Structure de l'instruction endEpoch:", program.methods.endEpoch);
                            
                            // Dériver la PDA pour l'époque
                            const epochId = epoch.account.epochId;
                            const [epochPDA, bump] = await PublicKey.findProgramAddressSync(
                                [
                                    Buffer.from("epoch"),
                                    new BN(epochId).toArrayLike(Buffer, "le", 8)
                                ],
                                program.programId
                            );
                            
                            console.log("Epoch account from fetch:", epoch.publicKey.toString());
                            console.log("Derived PDA for epoch:", epochPDA.toString());
                            console.log("PDA bump:", bump);
                            
                            // Préparer les comptes pour la transaction
                            const accounts = {
                                epochManagement: epochPDA,
                                authority: adminKeypair.publicKey,
                                programConfig: configPDA,
                                systemProgram: anchor.web3.SystemProgram.programId,
                            };
                            
                            console.log("Comptes utilisés pour la transaction:", accounts);
                            console.log("Signataire utilisé:", adminKeypair.publicKey.toString());
                            console.log("Argument epochId:", epoch.account.epochId.toString());
                            
                            try {
                                // Appeler l'instruction end_epoch
                                await program.methods
                                    .endEpoch(new BN(epoch.account.epochId))
                                    .accounts(accounts)
                                    .signers([adminKeypair])
                                    .rpc();
                                
                                console.log(`Époque ${epoch.account.epochId.toString()} fermée avec succès`);
                            } catch (txError) {
                                console.error("Erreur lors de l'envoi de la transaction:");
                                // Vérifier si c'est une SendTransactionError pour extraire les logs
                                if (txError.logs) {
                                    console.error("Logs de transaction:");
                                    txError.logs.forEach((log: string, i: number) => console.error(`${i}: ${log}`));
                                }
                                
                                // Si l'erreur est un objet avec message et errorLogs
                                if (txError.message) {
                                    console.error("Message d'erreur:", txError.message);
                                }
                                
                                // Essayer d'extraire la propriété error si elle existe
                                if (txError.error) {
                                    console.error("Détails d'erreur:", txError.error);
                                }
                                
                                // Afficher toute la structure de l'erreur pour le débogage
                                console.error("Structure complète de l'erreur:");
                                try {
                                    console.error(JSON.stringify(txError, null, 2));
                                } catch (e) {
                                    console.error("Impossible de sérialiser l'erreur en JSON:", e);
                                    console.error(txError);
                                }
                                
                                throw txError;
                            }
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

// Exécuter le main sans quitter le processus pour que setInterval continue de fonctionner
main().catch((err) => {
    console.error(err);
    process.exit(1);
});

// Ajouter un gestionnaire pour quitter proprement lors de l'arrêt du processus
process.on('SIGINT', () => {
    console.log('Scheduler arrêté par l\'utilisateur');
    process.exit(0);
});

console.log("\nLe scheduler d'époques est en cours d'exécution. Appuyez sur Ctrl+C pour quitter.\n"); 