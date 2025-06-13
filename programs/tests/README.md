# Guide pour l\'Écriture de Tests d\'Instruction pour les Programmes Solana

Ce guide détaille les étapes et les meilleures pratiques pour écrire des tests d\'intégration pour les instructions de vos programmes Solana, en utilisant Anchor, TypeScript, Mocha et Chai, ainsi que les outils de setup spécifiques à ce projet.

## Table des Matières

1.  [Prérequis](#prérequis)
2.  [Structure des Dossiers de Test](#structure-des-dossiers-de-test)
3.  [Étape 1: Création du Fichier et du Module de Test](#étape-1-création-du-fichier-et-du-module-de-test)
4.  [Étape 2: Structure de Base d\'un Fichier de Test](#étape-2-structure-de-base-dun-fichier-de-test)
5.  [Étape 3: Utilisation des Helpers de Setup (`setup/`)](#étape-3-utilisation-des-helpers-de-setup-setup)
    *   [Contexte de Test (`TestContext`)](#contexte-de-test-testcontext)
    *   [Configuration du Programme (`programConfigSetup.ts`)](#configuration-du-programme-programconfigsetupts)
    *   [Gestion des Époques (`epochSetup.ts`)](#gestion-des-époques-epochsetupts)
    *   [Trésorerie et Rôles (`treasurySetup.ts`)](#trésorerie-et-rôles-treasurysetupts)
    *   [Propositions (`proposalSetup.ts`)](#propositions-proposalsetupts)
6.  [Étape 4: Utilisation des Utilitaires (`utils_for_tests/`)](#étape-4-utilisation-des-utilitaires-utils_for_tests)
7.  [Étape 5: Écriture de la Logique de Test](#étape-5-écriture-de-la-logique-de-test)
    *   [Cas de Succès](#cas-de-succès)
    *   [Cas d\'Erreur](#cas-derreur)
8.  [Étape 6: Intégration dans `main.test.ts`](#étape-6-intégration-dans-maintestts)
9.  [Exemple Complet (Conceptuel)](#exemple-complet-conceptuel)
10. [Bonnes Pratiques](#bonnes-pratiques)

## Prérequis

Avant d\'écrire des tests, assurez-vous d\'avoir une bonne compréhension de :

*   Le framework Anchor et ses conventions de test.
*   TypeScript.
*   Les frameworks de test Mocha (pour la structure des tests : `describe`, `it`) et Chai (pour les assertions : `expect`).
*   Le fonctionnement général du programme Solana que vous testez.

## Structure des Dossiers de Test

Les tests d\'intégration sont organisés comme suit dans le répertoire `programs/tests/` :

*   `main.test.ts`: Le point d\'entrée principal qui orchestre l\'exécution de toutes les suites de tests.
*   `integration/`: Contient les suites de tests pour les différentes instructions, groupées par modules fonctionnels.
    *   `00_program_configuration/`
    *   `01_epoch_lifecycle/`
    *   `02_treasury_and_roles/`
    *   `03_proposal_workflow/`
    *   `...` (autres modules)
*   `setup/`: Contient des fonctions d\'assistance (helpers) pour initialiser et configurer l\'état nécessaire pour les tests (ex: créer des époques, des propositions, initialiser la configuration du programme).
    *   `programConfigSetup.ts`: Pour initialiser le compte de configuration global du programme (ProgramConfig).
    *   `epochSetup.ts`: Pour gérer la création, la fermeture, et le marquage des époques.
    *   `treasurySetup.ts`: Pour initialiser la trésorerie et les rôles associés.
    *   `proposalSetup.ts`: Pour créer et gérer les propositions de token.
    *   `index.ts`: Exporte `TestContext` et des helpers communs comme `getInitializedContext`.
*   `utils_for_tests/`: Contient des utilitaires divers et des constantes utilisées dans les tests.
    *   `helpers.ts`: Fonctions utilitaires (ex: `generateRandomBN`, `shortenAddress`).
    *   `constants.ts`: Constantes partagées pour les tests.

## Étape 1: Création du Fichier et du Module de Test

1.  **Identifier ou Créer un Module** :
    Si votre instruction appartient à un module fonctionnel existant (ex: `01_epoch_lifecycle`), vous ajouterez votre fichier de test dans ce dossier.
    Si elle introduit une nouvelle fonctionnalité ou un nouveau module, créez un nouveau sous-dossier dans `integration/` en suivant la nomenclature `XX_nom_du_module/` (ex: `04_my_new_feature/`).

2.  **Créer le Fichier de Test** :
    Nommez votre fichier de test de manière descriptive, typiquement en utilisant le nom de l\'instruction qu\'il teste, suivi de `.test.ts`.
    Exemple : `myInstruction.test.ts` ou `processPayment.test.ts`.

## Étape 2: Structure de Base d\'un Fichier de Test

Chaque fichier de test devrait avoir une structure similaire :

```typescript
import * as anchor from \'@coral-xyz/anchor\';
import { Program } from \'@coral-xyz/anchor\';
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from \'@solana/web3.js\';
import chai, { expect } from \'chai\';
import { Programs } from \'../../../target/types/programs\'; // Adaptez le chemin si nécessaire
import {
    TestContext,
    getInitializedContext,
    // Importez d\'autres helpers de setup et utils au besoin
} from \'../../setup\'; 
import * as programConfigSetup from \'../../setup/programConfigSetup\';
import * as epochSetup from \'../../setup/epochSetup\';
// ... autres imports de setup

export function runMyInstructionTests() { // Le nom de la fonction exportée doit être unique
    describe(\'Instruction: my_instruction_name\', () => {
        let ctx: TestContext;
        let program: Program<Programs>;
        let adminKeypair: Keypair; // Ou autre keypair pertinent

        before(async () => {
            ctx = getInitializedContext(); // Initialise le contexte une fois pour la suite de tests
            program = ctx.program;
            adminKeypair = ctx.adminKeypair;

            // Initialisation globale si nécessaire (ex: config du programme)
            // await programConfigSetup.ensureProgramConfigInitialized(ctx);
        });

        // Optionnel: beforeEach pour setup un état frais avant chaque test \'it\'
        beforeEach(async () => {
            // Ex: créer une nouvelle époque active pour chaque test
            // const epochId = epochSetup.generateRandomBN();
            // await epochSetup.ensureEpochIsActive(ctx, epochId);
        });

        it(\'should successfully execute my_instruction\', async () => {
            // Logique du test ici
        });

        it(\'should fail if condition X is not met\', async () => {
            // Logique du test d\'erreur ici
        });

        // ... autres tests (cas de succès, cas d\'erreur)
    });
}
```

## Étape 3: Utilisation des Helpers de Setup (`setup/`)

Le répertoire `setup/` contient des scripts essentiels pour préparer l\'environnement de test.

### Contexte de Test (`TestContext`)

La plupart des fonctions de setup et vos tests nécessiteront un `TestContext`. Obtenez-le via `getInitializedContext()`:

```typescript
import { TestContext, getInitializedContext } from \'../../setup\';

let ctx: TestContext;
before(async () => {
    ctx = getInitializedContext();
    // ctx contient:
    // ctx.program: L\'objet Program d\'Anchor
    // ctx.provider: Le provider Anchor
    // ctx.adminKeypair: Le Keypair de l\'admin par défaut
    // ctx.programConfigAddress: Le PDA de la config du programme (après initialisation)
    // ctx.treasuryAddress: Le PDA de la trésorerie (après initialisation)
    // ctx.treasuryRolesAddress: Le PDA des rôles de trésorerie (après initialisation)
});
```
`getInitializedContext` est asynchrone si elle doit faire un airdrop à l\'admin. Elle est conçue pour être appelée une fois dans un `before` global ou au début de votre suite de tests principale.

### Configuration du Programme (`programConfigSetup.ts`)

Si votre instruction dépend de la configuration globale du programme :

*   `ensureProgramConfigInitialized(ctx: TestContext, customAdminKp?: Keypair): Promise<PublicKey>`: S\'assure que le `ProgramConfig` est initialisé. Si ce n\'est pas le cas, l\'initialise avec l\'autorité fournie (ou `ctx.adminKeypair` par défaut). Met à jour `ctx.programConfigAddress`.

```typescript
import * as programConfigSetup from \'../../setup/programConfigSetup\';

before(async () => {
    ctx = getInitializedContext();
    await programConfigSetup.ensureProgramConfigInitialized(ctx);
    // Maintenant ctx.programConfigAddress est défini et peut être utilisé
});
```

### Gestion des Époques (`epochSetup.ts`)

Pour les instructions liées aux époques :

*   `getEpochManagementPda(programId: PublicKey, epochId: anchor.BN): [PublicKey, number]`: Calcule le PDA d\'une époque.
*   `ensureEpochExists(ctx: TestContext, epochId: anchor.BN, startTime: anchor.BN, endTime: anchor.BN, authorityKp?: Keypair): Promise<PublicKey>`: Crée une époque si elle n\'existe pas.
*   `ensureEpochIsActive(ctx: TestContext, epochId: anchor.BN, authorityKp?: Keypair): Promise<PublicKey>`: S\'assure qu\'une époque existe et est active (début dans le passé, fin dans le futur). Utile pour les `beforeEach`.
*   `closeEpochOnChain(ctx: TestContext, epochId: anchor.BN, authorityKp?: Keypair): Promise<void>`: Appelle l\'instruction `end_epoch`.
*   `markEpochAsProcessedOnChain(ctx: TestContext, epochId: anchor.BN, authorityKp?: Keypair): Promise<void>`: Appelle l\'instruction `mark_epoch_processed`.

```typescript
import * as epochSetup from \'../../setup/epochSetup\';
import { generateRandomBN } from \'../../utils_for_tests/helpers\'; // Ou depuis setup/index

let activeEpochPda: PublicKey;
let epochId: anchor.BN;

beforeEach(async () => {
    epochId = generateRandomBN();
    activeEpochPda = await epochSetup.ensureEpochIsActive(ctx, epochId);
});

it(\'should do something with an active epoch\', async () => {
    // Utiliser activeEpochPda
    // ...
    await epochSetup.closeEpochOnChain(ctx, epochId); // Si nécessaire pour le test
});
```

### Trésorerie et Rôles (`treasurySetup.ts`)

Pour les instructions interagissant avec la trésorerie ou les rôles :

*   `ensureTreasuryInitialized(ctx: TestContext, authorityKp?: Keypair): Promise<PublicKey>`: S\'assure que la trésorerie est initialisée. Met à jour `ctx.treasuryAddress`.
*   `ensureTreasuryRolesInitialized(ctx: TestContext, initialAdmins?: PublicKey[], authorityKp?: Keypair): Promise<PublicKey>`: S\'assure que le compte des rôles de trésorerie est initialisé. Met à jour `ctx.treasuryRolesAddress`.
*   Fonctions pour ajouter/retirer/modifier des admins et des rôles de trésorerie (ex: `addAdminOnChain`, `removeAdminOnChain`, etc., à vérifier dans le fichier pour la liste exacte).

```typescript
import * as treasurySetup from \'../../setup/treasurySetup\';

before(async () => {
    // ... initialisation de ctx ...
    await programConfigSetup.ensureProgramConfigInitialized(ctx); // Prérequis souvent
    await treasurySetup.ensureTreasuryInitialized(ctx);
    await treasurySetup.ensureTreasuryRolesInitialized(ctx, [ctx.adminKeypair.publicKey]);
});
```

### Propositions (`proposalSetup.ts`)

Pour les instructions liées aux propositions de token :

*   `TokenProposalDetails`: Interface pour définir les détails d\'une proposition.
*   `getProposalPda(...)`: Calcule le PDA d\'une proposition.
*   `createProposalOnChain(ctx: TestContext, proposerKeypair: Keypair, details: TokenProposalDetails, epochManagementAddress: PublicKey): Promise<PublicKey>`: Crée une proposition.
*   `getSupportPda(...)`: Calcule le PDA d\'un support de proposition.
*   `supportProposalOnChain(ctx: TestContext, supporterKeypair: Keypair, proposalToSupportPda: PublicKey, epochIdOfProposal: anchor.BN, epochManagementAddressForProposalEpoch: PublicKey, supportAmount: anchor.BN): Promise<PublicKey>`: Soutient une proposition.
*   `updateProposalStatusOnChain(ctx: TestContext, proposalPda: PublicKey, epochManagementAddress: PublicKey, newStatus: object): Promise<void>`: Met à jour le statut d\'une proposition.

```typescript
import * as proposalSetup from \'../../setup/proposalSetup\';
import * as epochSetup from \'../../setup/epochSetup\'; // Souvent nécessaire
import { generateRandomBN } from \'../../utils_for_tests/helpers\';

it(\'should create and support a proposal\', async () => {
    const epochId = generateRandomBN();
    const epochPda = await epochSetup.ensureEpochIsActive(ctx, epochId);
    
    const proposer = Keypair.generate(); // Airdrop SOL si nécessaire
    // ... airdrop ...

    const proposalDetails: proposalSetup.TokenProposalDetails = {
        epochId: epochId,
        name: "Test Token for MyInstruction",
        symbol: "TMI",
        totalSupply: new anchor.BN(1000000),
        creatorAllocationPercentage: 5,
        description: "A test token.",
        imageUrl: null,
        lockupPeriod: new anchor.BN(0),
    };
    const proposalPda = await proposalSetup.createProposalOnChain(ctx, proposer, proposalDetails, epochPda);

    // ... la suite du test (ex: supporter la proposition)
});
```

## Étape 4: Utilisation des Utilitaires (`utils_for_tests/`)

*   `helpers.ts`:
    *   `generateRandomBN(max?: number): anchor.BN`: Génère un grand nombre aléatoire comme `anchor.BN`.
    *   `shortenAddress(address: string | PublicKey, chars?: number): string`: Raccourcit une adresse pour les logs.
    *   `generateRandomId()`: Wrapper pour `generateRandomBN().toString()`.
    *   ... et potentiellement d\'autres.
*   `constants.ts`: Peut contenir des valeurs constantes utiles pour les tests (ex: montants par défaut, durées).

## Étape 5: Écriture de la Logique de Test

### Cas de Succès

1.  **Préparer l\'État Initial** : Utilisez les fonctions de `setup/` pour créer toutes les comptes et données nécessaires avant d\'appeler votre instruction.
2.  **Construire les Comptes de l\'Instruction** : Préparez l\'objet `accounts` pour votre instruction, en utilisant les PDAs et clés publiques obtenus lors du setup.
3.  **Appeler l\'Instruction** :
    ```typescript
    await program.methods
        .myInstructionName(arg1, arg2) // Remplacez par votre instruction et ses arguments
        .accounts({
            // ... vos comptes ici ...
            // exemple:
            // userAccount: userPda,
            // authority: userKeypair.publicKey,
            // systemProgram: SystemProgram.programId,
        })
        .signers([userKeypair]) // Incluez tous les signataires requis
        .rpc();
    ```
4.  **Vérifier l\'État Final** : Récupérez les comptes modifiés et utilisez `expect` de Chai pour vérifier que leurs données sont conformes à vos attentes.
    ```typescript
    const updatedAccount = await program.account.myAccountType.fetch(accountPda);
    expect(updatedAccount.someField).to.equal(expectedValue);
    // Pour les BN d\'Anchor, utilisez .eq() ou .toString() pour la comparaison
    expect(updatedAccount.amount.eq(new anchor.BN(100))).to.be.true; 
    expect(updatedAccount.status).to.deep.equal({ active: {} }); // Pour les enums/objets
    ```

### Cas d\'Erreur

1.  **Préparer un Scénario d\'Échec** : Configurez l\'état de manière à ce que l\'instruction échoue comme prévu (ex: mauvais signataire, compte non initialisé, condition non remplie).
2.  **Appeler l\'Instruction dans un Bloc `try...catch`** :
    ```typescript
    try {
        await program.methods.myInstructionName(...).accounts(...).signers(...).rpc();
        expect.fail("Transaction should have failed but succeeded."); // Si l\'erreur n\'est pas levée
    } catch (error) {
        // Vérifiez le code d\'erreur ou le message d\'erreur spécifique
        // Pour les erreurs Anchor (définies dans error.rs et traduites dans l\'IDL)
        expect((error as anchor.AnchorError).error.errorCode.code).to.equal("MyCustomErrorName");
        // Pour les erreurs de contrainte Anchor ou autres types d\'erreurs
        // expect(error.message).to.include("A specific part of an error message");
    }
    ```
    Consultez `programs/programs/programs/src/error.rs` pour les noms des erreurs personnalisées.

## Étape 6: Intégration dans `main.test.ts`

Une fois votre suite de tests écrite et exportée (ex: `export function runMyInstructionTests()`), vous devez l\'ajouter à l\'orchestrateur principal `programs/tests/main.test.ts`.

1.  **Importer votre fonction de test** en haut de `main.test.ts`:
    ```typescript
    // ... autres imports ...
    import { runMyInstructionTests } from \'./integration/XX_my_new_module/myInstruction.test\'; // Adaptez le chemin
    ```
2.  **Appeler votre fonction de test** à l\'intérieur d\'un `describe` approprié (soit un existant, soit un nouveau pour votre module) :
    ```typescript
    describe(\'Norug Fun - Integration Tests Orchestrator\', () => {
        // ...
        describe(\'Module XX: My New Module\', () => {
            before(() => {
                console.log("\\n==================== MODULE XX START: My New Module ====================");
            });
            
            runMyInstructionTests(); // Ajoutez votre fonction ici
            // ... potentiellement d\'autres tests pour ce module ...

            after(() => console.log("==================== MODULE XX END: My New Module ======================\\n"));
        });
        // ...
    });
    ```

## Exemple Complet (Conceptuel)

Supposons une instruction `initializeUserProfile(username: string)` qui crée un compte `UserProfile`.

`programs/tests/integration/04_user_profiles/initializeUserProfile.test.ts`:
```typescript
import * as anchor from \'@coral-xyz/anchor\';
import { Program } from \'@coral-xyz/anchor\';
import { Keypair, PublicKey, SystemProgram } from \'@solana/web3.js\';
import { expect } from \'chai\';
import { Programs } from \'../../../target/types/programs\';
import { TestContext, getInitializedContext } from \'../../setup\';
import * as programConfigSetup from \'../../setup/programConfigSetup\';

// Simule le PDA pour UserProfile
const getUserProfilePda = (programId: PublicKey, user: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("user_profile"), user.toBuffer()],
        programId
    );
};

export function runInitializeUserProfileTests() {
    describe(\'Instruction: initialize_user_profile\', () => {
        let ctx: TestContext;
        let program: Program<Programs>;
        let userKeypair: Keypair;

        before(async () => {
            ctx = getInitializedContext();
            program = ctx.program;
            await programConfigSetup.ensureProgramConfigInitialized(ctx); // Supposons que c\'est requis

            userKeypair = Keypair.generate();
            // Simuler un airdrop à l\'utilisateur si nécessaire pour payer les frais de création de compte
            const sig = await ctx.provider.connection.requestAirdrop(userKeypair.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL);
            await ctx.provider.connection.confirmTransaction(sig, "confirmed");
        });

        it(\'should initialize a user profile successfully\', async () => {
            const username = "TestUser123";
            const [userProfilePda, _bump] = getUserProfilePda(program.programId, userKeypair.publicKey);

            await program.methods
                .initializeUserProfile(username)
                .accounts({
                    userProfile: userProfilePda,
                    user: userKeypair.publicKey,
                    programConfig: ctx.programConfigAddress!,
                    systemProgram: SystemProgram.programId,
                })
                .signers([userKeypair])
                .rpc();

            const profileAccount = await program.account.userProfile.fetch(userProfilePda); // Assumant un type UserProfile
            expect(profileAccount.username).to.equal(username);
            expect(profileAccount.user.equals(userKeypair.publicKey)).to.be.true;
        });

        it(\'should fail if profile already exists\', async () => {
            const username = "DuplicateUser";
            const [userProfilePda, _bump] = getUserProfilePda(program.programId, userKeypair.publicKey);

            // Initialiser une première fois (ce test supposerait un beforeEach ou un userKeypair différent)
            // Pour cet exemple, on imagine qu\'un test précédent ou un setup l\'a déjà créé,
            // ou on le crée ici si ce test est isolé et qu\'on veut vérifier la contrainte d\'initialisation unique.
            // Par souci de concision, on saute cette première initialisation ici,
            // mais dans un vrai test, il faudrait s\'assurer que le compte existe.

            // Tentative de ré-initialisation (qui devrait échouer)
            try {
                await program.methods
                    .initializeUserProfile(username)
                    .accounts({ /* ... comptes ... */ })
                    .signers([userKeypair])
                    .rpc();
                expect.fail("Should have failed due to profile already existing");
            } catch (error) {
                // L\'erreur exacte dépendra de comment l\'instruction gère ce cas (ex: contrainte `init`, erreur custom)
                // Soit une erreur AnchorError due à une contrainte de `init` sur un compte existant,
                // soit une erreur custom si vous vérifiez explicitement.
                // Si c\'est une erreur AnchorError due à Anchor essayant d\'allouer un compte existant pour `init` :
                // expect(error.message).to.include("custom program error: 0x0"); // Ou une erreur plus spécifique d\'Anchor pour création de compte échouée.
                // Si vous avez une erreur custom :
                // expect((error as anchor.AnchorError).error.errorCode.code).to.equal("UserProfileAlreadyExists");
            }
        });
    });
}
```

## Bonnes Pratiques

*   **Tests Atomiques** : Chaque test (`it` block) devrait vérifier une chose spécifique.
*   **Descriptions Claires** : Utilisez `describe` et `it` avec des descriptions qui expliquent clairement ce qui est testé.
*   **Idempotence du Setup** : Les fonctions dans `setup/` (comme `ensure...`) sont conçues pour être idempotentes : elles créent l\'état si nécessaire, mais ne plantent pas si l\'état existe déjà. Profitez-en.
*   **Tester les Succès et les Échecs** : Couvrez les chemins heureux et les cas d\'erreur attendus pour chaque instruction.
*   **Nettoyage (si nécessaire)** : La plupart du temps, le validateur local d\'Anchor est réinitialisé entre les exécutions de `anchor test`, donc un nettoyage explicite est rarement nécessaire. Si vous effectuez des tests sur un cluster persistant (devnet), envisagez le nettoyage.
*   **Gérer les `Keypair`s** : Créez de nouveaux `Keypair`s pour les entités uniques dans vos tests (utilisateurs, proposeurs) et assurez-vous qu\'ils ont des SOL si ce sont des payeurs de transactions ou de rent. `ctx.adminKeypair` est déjà provisionné.

En suivant ce guide, vous devriez être en mesure d\'écrire des tests robustes et maintenables pour vos programmes Solana. 