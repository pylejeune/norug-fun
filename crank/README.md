# Crank Service for NoRug.fun

Ce service off-chain est responsable du traitement des époques terminées sur la plateforme NoRug.fun.

## Fonctionnement

Le script `src/main.ts` :
1. Se connecte au cluster Solana spécifié.
2. Recherche les comptes `EpochManagement` qui sont dans l'état `Closed` et dont le flag `processed` est à `false`.
3. Pour chaque époque trouvée, il récupère toutes les `TokenProposal` associées qui sont encore `Active`.
4. S'il y a des propositions actives, il les trie par `sol_raised` (montant de SOL levé).
5. Il appelle l'instruction `updateProposalStatus` du programme on-chain pour :
   - Marquer les 10 premières propositions comme `Validated`.
   - Marquer les autres propositions comme `Rejected`.
6. Une fois toutes les propositions d'une époque traitées (ou s'il n'y en avait pas d'actives), il appelle l'instruction `markEpochProcessed` pour mettre le flag `processed` de l'époque à `true`.

## Configuration

Le service nécessite les variables d'environnement suivantes (généralement via un fichier `.env` à la racine de `/crank`) :

- `RPC_URL`: L'URL du node RPC Solana à utiliser (ex: `http://127.0.0.1:8899` pour le réseau local, ou une URL QuickNode/Helius pour devnet/mainnet).
- `ADMIN_AUTHORITY_SECRET_KEY_PATH`: Le chemin absolu vers le fichier JSON contenant la clé secrète (byte array) du portefeuille qui a l'autorité admin sur le programme (défini dans `ProgramConfig`).

## Exécution

1. Assurez-vous que les dépendances sont installées (`npm install` ou `pnpm install` dans le dossier `crank`).
2. Compilez le code TypeScript (`npm run build` ou `pnpm build`).
3. Lancez le script compilé (`node dist/main.js`).

Il est conçu pour être exécuté périodiquement (par exemple, via une tâche cron). 