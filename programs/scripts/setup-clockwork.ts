import { Program, web3 } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Programs } from "../target/types/programs";
import { ClockworkProvider } from "@clockwork-xyz/sdk";

// Configuration de Clockwork
const CLOCKWORK_PROGRAM_ID = new PublicKey("clockworkxyz1");
const CHECK_INTERVAL = 300; // Vérifier toutes les 5 minutes

export async function setupClockwork(
    program: Program<Programs>,
    provider: any
) {
    // Initialiser le provider Clockwork
    const clockworkProvider = new ClockworkProvider(
        provider.connection,
        provider.wallet
    );

    // Récupérer toutes les époques actives
    const activeEpochs = await program.account.epochManagement.all();
    
    // Pour chaque époque active, créer une tâche planifiée
    for (const epoch of activeEpochs) {
        if (epoch.account.status.active) {
            // Créer une tâche planifiée pour vérifier cette époque
            const [thread] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("thread"),
                    epoch.publicKey.toBuffer(),
                ],
                CLOCKWORK_PROGRAM_ID
            );

            // Créer la tâche planifiée
            await clockworkProvider.threadCreate(
                thread,
                {
                    programId: program.programId,
                    trigger: {
                        cron: `*/${CHECK_INTERVAL} * * * * *`, // Toutes les 5 minutes
                    },
                    instructions: [
                        {
                            programId: program.programId,
                            accounts: {
                                epochManagement: epoch.publicKey,
                                systemProgram: web3.SystemProgram.programId,
                            },
                            data: program.coder.instruction.encode("checkEpochEnd", {}),
                        },
                    ],
                }
            );

            console.log(`Tâche planifiée créée pour l'époque ${epoch.publicKey.toString()}`);
        }
    }
}

// Fonction pour arrêter toutes les tâches planifiées
export async function stopClockworkTasks(
    program: Program<Programs>,
    provider: any
) {
    const clockworkProvider = new ClockworkProvider(
        provider.connection,
        provider.wallet
    );

    // Récupérer toutes les époques
    const epochs = await program.account.epochManagement.all();
    
    // Arrêter chaque tâche planifiée
    for (const epoch of epochs) {
        const [thread] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("thread"),
                epoch.publicKey.toBuffer(),
            ],
            CLOCKWORK_PROGRAM_ID
        );

        try {
            await clockworkProvider.threadDelete(thread);
            console.log(`Tâche planifiée arrêtée pour l'époque ${epoch.publicKey.toString()}`);
        } catch (error) {
            console.error(`Erreur lors de l'arrêt de la tâche pour l'époque ${epoch.publicKey.toString()}:`, error);
        }
    }
} 