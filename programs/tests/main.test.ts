import { TestContext, initializeTestContext } from './setup';
import { ensureProgramConfigInitialized } from './setup/programConfigSetup';
// import { ensureTreasuryInitialized } from './setup/treasurySetup'; // Pas besoin pour l'instant
import { runInitializeProgramConfigTests } from './integration/00_program_configuration/initializeProgramConfig.test';
import { runProgramConfigAuthorizationTests } from './integration/00_program_configuration/programConfig.test'; // On garde l'import pour la structure

// Importer les nouvelles suites de tests pour Epoch Lifecycle
import { runStartEpochTests } from './integration/01_epoch_lifecycle/startEpoch.test';
import { runEndEpochTests } from './integration/01_epoch_lifecycle/endEpoch.test';
import { runMarkEpochProcessedTests } from './integration/01_epoch_lifecycle/markEpochProcessed.test';

// Affichage initial avant toute exécution de describe/before
console.log("\nLancement de la suite de tests du projet NoRug.fun\n");
console.log("Les tests sont séquentiels :\n");
console.log("00 : Test de ProgramConfig");
console.log("01 : Test du Cycle de Vie des Epochs");
console.log("02 : ... (à venir)\n"); // Placeholder pour les futurs modules
console.log("Lancement des tests.\n");

describe('NorugdotFun - Integration Tests Suite', () => {
    let context: TestContext;

    before(async () => {
        console.log("\n--- Initialisation du Contexte de Test Global ---");
        context = await initializeTestContext();
        console.log("Contexte de Test Global initialisé.");

        console.log("Vérification/Initialisation de ProgramConfig...");
        await ensureProgramConfigInitialized(context);
        console.log("ProgramConfig prêt.\n");
    });

    const getTestContext = () => context;

    describe('Module 00 : ProgramConfig Tests', () => {
        before(() => {
            console.log("\n==================== MODULE 00 START ====================\n");
        });

        runInitializeProgramConfigTests(getTestContext);
        runProgramConfigAuthorizationTests(() => ({} as TestContext)); 

        after(() => {
            console.log("\n==================== MODULE 00 END ======================\n");
        });
    });
    
    describe('Module 01 : Epoch Lifecycle Tests', () => {
        before(() => {
            console.log("\n==================== MODULE 01 START ====================\n");
        });

        runStartEpochTests(getTestContext);
        runEndEpochTests(getTestContext);
        runMarkEpochProcessedTests(getTestContext);

        after(() => {
            console.log("\n==================== MODULE 01 END ======================\n");
        });
    });

    // Placeholder pour futurs modules
    // describe('Module 02 : Future Module Tests', () => {
    //     before(() => {
    //         console.log("\n==================== MODULE 02 START ====================\n");
    //     });
    //     // ...
    //     after(() => {
    //         console.log("\n==================== MODULE 02 END ======================\n");
    //     });
    // });

    after(async () => {
        console.log("\n--- Fin de la suite de tests ---");
    });
}); 