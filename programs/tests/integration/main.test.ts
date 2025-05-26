import { TestContext, initializeTestContext } from '../setup';
import { ensureProgramConfigInitialized } from '../setup/programConfigSetup';
// import { ensureTreasuryInitialized } from '../setup/treasurySetup'; // Pas besoin pour l'instant
import { runInitializeProgramConfigTests } from './00_program_configuration/initializeProgramConfig.test';
import { runProgramConfigAuthorizationTests } from './00_program_configuration/programConfig.test'; // On garde l'import pour la structure

// Affichage initial avant toute exécution de describe/before
console.log("\nLancement de la suite de tests du projet NoRug.fun\n");
console.log("Les tests sont séquentiels :\n");
console.log("00 : Test de ProgramConfig");
console.log("01 : ... (à venir)"); // Placeholder pour les futurs modules
console.log("02 : ... (à venir)\n"); // Placeholder pour les futurs modules
console.log("Lancement des tests.\n");

describe('NorugdotFun - Integration Tests Suite', () => {
    let context: TestContext;

    before(async () => {
        // Ces logs sont plus techniques et peuvent rester ou être ajustés
        console.log("--- Initialisation du Contexte de Test Global ---");
        context = await initializeTestContext();
        console.log("Contexte de Test Global initialisé.");

        console.log("Vérification/Initialisation de ProgramConfig...");
        await ensureProgramConfigInitialized(context);
        console.log("ProgramConfig prêt.");
        console.log("--------------------------------------------------\n");
    });

    const getTestContext = () => context;

    describe('Module 00 : ProgramConfig Tests', () => {
        // Le titre du describe sert déjà de log pour le module
        runInitializeProgramConfigTests(getTestContext);
        runProgramConfigAuthorizationTests(() => ({} as TestContext)); 
    });

    after(async () => {
        console.log("\n--- Fin de la suite de tests ---");
    });
}); 