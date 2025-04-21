import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Programs } from "../target/types/programs";
import { PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { setupTestEnvironment } from "./utils.test";

describe("Scheduler d'époques", () => {
    const { provider, program } = setupTestEnvironment();

    // Fonction pour vérifier et terminer les époques
    async function checkAndEndEpochs() {
        console.log("\nVérification des époques actives...");
        
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

            console.log(`Nombre d'époques actives trouvées: ${activeEpochs.length}`);

            // Pour chaque époque active
            for (const epoch of activeEpochs) {
                try {
                    console.log(`\nVérification de l'époque ${epoch.account.epochId}...`);
                    
                    // Appeler check_and_end_epochs
                    await program.methods
                        .checkAndEndEpochs()
                        .accounts({
                            authority: provider.wallet.publicKey,
                            programConfig: programConfigPda,
                            epochManagement: epoch.publicKey,
                            systemProgram: anchor.web3.SystemProgram.programId,
                        })
                        .rpc();
                    
                    console.log(`Époque ${epoch.account.epochId} vérifiée avec succès`);
                    
                    // Vérifier le nouveau statut
                    const updatedEpoch = await program.account.epochManagement.fetch(epoch.publicKey);
                    console.log(`Nouveau statut: ${JSON.stringify(updatedEpoch.status)}`);
                    
                } catch (error) {
                    console.error(`Erreur lors de la vérification de l'époque ${epoch.account.epochId}:`, error);
                }
            }
        } catch (error) {
            console.error("Erreur lors de l'exécution du scheduler:", error);
        }
    }

    it("Vérifie et termine les époques actives", async () => {
        await checkAndEndEpochs();
    });

    // Test périodique (décommenter pour tester en continu)
    /*
    it("Exécute le scheduler périodiquement", async () => {
        // Exécuter toutes les 5 minutes
        setInterval(async () => {
            await checkAndEndEpochs();
        }, 5 * 60 * 1000);
        
        // Garder le test en vie pendant 1 heure
        await new Promise(resolve => setTimeout(resolve, 60 * 60 * 1000));
    });
    */
}); 