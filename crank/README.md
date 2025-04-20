# Crank Service for NoRug.fun

Ce service off-chain est responsable du traitement des époques terminées sur la plateforme NoRug.fun.

## Fonctionnement

Le script `src/main.ts` contient la logique pour :
1. Charger la configuration (RPC URL, chemin vers la clé admin) depuis les variables d'environnement.
2. Se connecter au cluster Solana spécifié.
3. Rechercher les comptes `EpochManagement` qui sont dans l'état `Closed` et dont le flag `processed` est à `false`.
4. Pour chaque époque trouvée :
    a. Récupérer toutes les `TokenProposal` associées.
    b. Filtrer celles qui sont `Active`.
    c. S'il y a des propositions actives, les trier par `sol_raised` (montant de SOL levé).
    d. Appeler l'instruction `updateProposalStatus` du programme on-chain pour marquer les 10 premières comme `Validated` et les autres comme `Rejected`.
    e. Appeler l'instruction `markEpochProcessed` pour mettre le flag `processed` de l'époque à `true` (si le traitement des propositions s'est bien passé).

**La logique principale est encapsulée dans une fonction exportable `runCrankLogic()`** qui peut être importée et utilisée par d'autres modules Node.js (par exemple, une route API). Le script peut également être exécuté directement.

## Configuration

Le service (qu'il soit lancé directement ou via `runCrankLogic`) nécessite les variables d'environnement suivantes :

- `RPC_URL`: L'URL du node RPC Solana à utiliser (ex: `http://127.0.0.1:8899` pour le réseau local, ou une URL QuickNode/Helius pour devnet/mainnet).
- `ADMIN_AUTHORITY_SECRET_KEY_PATH`: Le chemin absolu ou relatif (depuis la racine du projet) vers le fichier JSON contenant la clé secrète (byte array) du portefeuille qui a l'autorité admin sur le programme (défini dans `ProgramConfig`).

Ces variables sont typiquement définies dans un fichier `.env` à la racine du dossier `/crank` lors de l'exécution directe, ou dans l'environnement du processus appelant (`runCrankLogic`).

## Exécution

### En tant que script autonome :

1. Assurez-vous que les dépendances sont installées (`npm install` ou `pnpm install` dans le dossier `crank`).
2. Compilez le code TypeScript (`npm run build` ou `pnpm build` dans le dossier `crank`).
3. Créez un fichier `.env` dans `crank/` avec les variables `RPC_URL` et `ADMIN_AUTHORITY_SECRET_KEY_PATH`.
4. Lancez le script compilé (`node dist/main.js`).

Il est conçu pour être exécuté périodiquement (par exemple, via une tâche cron) de cette manière.

### En tant que module importé :

1. Assurez-vous que le processus appelant (ex: votre serveur Next.js) a accès aux variables d'environnement `RPC_URL` et `ADMIN_AUTHORITY_SECRET_KEY_PATH`.
2. Importez la fonction : `import { runCrankLogic } from './path/to/crank/src/main';` (adaptez le chemin).
3. Appelez la fonction : `const result = await runCrankLogic();`

Cette approche est utile pour intégrer le déclenchement du crank dans une API ou un autre flux backend. 