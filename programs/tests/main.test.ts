import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Programs } from '../target/types/programs';
import { TestContext, initializeTestContext } from './setup';
import {
    ensureProgramConfigInitialized,
    // runProgramConfigAuthorizationTests, // Décommenter lorsque prêt et importer du bon endroit
} from './setup/programConfigSetup';

// Importer les fonctions de test des fichiers d'intégration
import { runInitializeProgramConfigTests } from './integration/00_program_configuration/initializeProgramConfig.test';
// import { runProgramConfigAuthorizationTests } from './integration/00_program_configuration/programConfig.test'; // Assurez-vous que ce fichier exporte cette fonction

// Importer les tests individuels pour Epoch Lifecycle
import { runStartEpochTests } from './integration/01_epoch_lifecycle/startEpoch.test';
import { runEndEpochTests } from './integration/01_epoch_lifecycle/endEpoch.test';
import { runMarkEpochProcessedTests } from './integration/01_epoch_lifecycle/markEpochProcessed.test';

import { 
    ensureTreasuryInitialized, 
    ensureTreasuryRolesInitialized 
} from './setup/treasurySetup';

// Importer les nouvelles fonctions de test depuis les fichiers refactorisés
import { runInitializeTreasuryTests } from './integration/02_treasury_and_roles/initializeTreasury.test';
import { runInitializeTreasuryRolesTests } from './integration/02_treasury_and_roles/initializeTreasuryRoles.test';
import { runAddAdminTests } from './integration/02_treasury_and_roles/roles_management/addAdmin.test';
import { runRemoveAdminTests } from './integration/02_treasury_and_roles/roles_management/removeAdmin.test';
import { runAddTreasuryRoleTests } from './integration/02_treasury_and_roles/roles_management/addTreasuryRole.test';
import { runRemoveTreasuryRoleTests } from './integration/02_treasury_and_roles/roles_management/removeTreasuryRole.test';
import { runUpdateTreasuryRoleTests } from './integration/02_treasury_and_roles/roles_management/updateTreasuryRole.test';

// Importer les tests pour le workflow des propositions
import { runCreateTokenProposalTests } from './integration/03_proposal_workflow/createTokenProposal.test';

describe('Norug Fun - Integration Tests Orchestrator', () => {
    let ctx: TestContext;
    let program: Program<Programs>;

    before(async () => {
        console.log("\n==================== GLOBAL SETUP START (main.test.ts) ====================\n");
        console.log('Initializing global test context for main.test.ts...');
        ctx = await initializeTestContext(); 
        program = ctx.program;
        console.log(`Global Test Context Initialized. Program ID: ${program.programId.toBase58()}`);
        console.log(`Admin Keypair: ${ctx.adminKeypair.publicKey.toBase58()}`);

        console.log('Ensuring ProgramConfig is initialized globally before all test modules...');
        await ensureProgramConfigInitialized(ctx);
        console.log(`ProgramConfig PDA: ${ctx.programConfigAddress?.toBase58()}`);
        
        console.log("\n==================== GLOBAL SETUP COMPLETE (main.test.ts) ====================\n");
    });

    describe('Module 00: Program Configuration', () => {
        before(() => {
            console.log("\n==================== MODULE 00 START: Program Configuration ====================");
            // Le contexte (ctx) est déjà initialisé globalement et passé implicitement
            // aux fonctions de test qui appellent getTestContext().
        });
        runInitializeProgramConfigTests();
        // runProgramConfigAuthorizationTests(); 
        after(() => console.log("==================== MODULE 00 END: Program Configuration ======================\n"));
    });

    describe('Module 01: Epoch Lifecycle Management', () => {
        before(() => {
            console.log("\n==================== MODULE 01 START: Epoch Lifecycle ====================");
    });
        // Appeler les tests d'époque individuellement
        runStartEpochTests(); 
        runEndEpochTests();
        runMarkEpochProcessedTests();
        after(() => console.log("==================== MODULE 01 END: Epoch Lifecycle ======================\n"));
    });

    describe('Module 02: Treasury and Roles Management', () => {
        before(async () => {
            console.log("\n==================== MODULE 02 START: Treasury and Roles ====================");
            // S'assurer que la trésorerie et les rôles sont prêts pour ce module.
            // Ces fonctions utilisent le `ctx` global qui est déjà initialisé.
            // Les fonctions ensure... sont idempotentes.
            console.log('  [MainTest - Module 02 Before] Ensuring Treasury is initialized...');
            await ensureTreasuryInitialized(ctx); 
            console.log(`  [MainTest - Module 02 Before] Treasury PDA for Module 02: ${ctx.treasuryAddress?.toBase58()}`);
            
            console.log('  [MainTest - Module 02 Before] Ensuring TreasuryRoles is initialized...');
            await ensureTreasuryRolesInitialized(ctx, [ctx.adminKeypair.publicKey]); // Initialise avec adminKeypair par défaut
            console.log(`  [MainTest - Module 02 Before] TreasuryRoles PDA for Module 02: ${ctx.treasuryRolesAddress?.toBase58()}`);
    });

        // Appeler les tests d'initialisation qui sont maintenant dans des fonctions exportées
        runInitializeTreasuryTests(); 
        runInitializeTreasuryRolesTests();
        
        // Sous-suite pour la gestion des rôles (admins, rôles de trésorerie)
        describe('Module 02.1: Treasury Roles Management', () => {
            before(() => {
                // Aucun setup spécifique ici si ensureTreasuryRolesInitialized dans le 'before' parent
                // est suffisant et gère l'état initial pour les tests de rôles.
                // Si les tests de rôle nécessitent un état très spécifique (par ex. rôles vidés),
                // cela pourrait être fait dans les beforeEach des fichiers de test individuels.
                console.log("Running tests for Module 02.1: Treasury Roles Management...");
            });

            runAddAdminTests();
            runRemoveAdminTests();
            runAddTreasuryRoleTests();
            runRemoveTreasuryRoleTests();
            runUpdateTreasuryRoleTests();
        });

        after(() => console.log("==================== MODULE 02 END: Treasury and Roles ======================\n"));
    });

    describe('Module 03: Proposal Workflow', () => {
        before(() => {
            console.log("\n==================== MODULE 03 START: Proposal Workflow ====================");
            // S'assurer que les dépendances (Epoch, Treasury, ProgramConfig) sont prêtes.
            // Elles devraient l'être grâce au setup global et aux ensureX dans les modules précédents si nécessaire.
            // Les tests de proposition eux-mêmes utiliseront ensureEpochIsActive pour leurs propres besoins.
        });

        runCreateTokenProposalTests();
        // runSupportProposalTests(); // À ajouter quand le fichier sera créé
        // etc.

        after(() => console.log("==================== MODULE 03 END: Proposal Workflow ======================\n"));
    });

    after(async () => {
        console.log("\n==================== ALL INTEGRATION TESTS COMPLETE (main.test.ts) ====================");
    });
}); 