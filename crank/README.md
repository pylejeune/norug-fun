# NoRug.fun Crank Service

Ce dossier contient le code du service off-chain (souvent appelé "crank") responsable de l'automatisation de certaines tâches essentielles pour le protocole NoRug.fun sur Solana.

## Rôle Principal

Le rôle principal de ce service est de **finaliser le statut des propositions de tokens** une fois qu'une époque de proposition est terminée (`EpochStatus::Closed`).

Le processus est le suivant :

1.  **Surveillance :** Le service s'exécute périodiquement (ex: via un cron job).
2.  **Détection :** Il recherche les comptes `EpochManagement` qui sont passés au statut `Closed` mais n'ont pas encore été traités.
3.  **Récupération & Classement :** Pour une époque fermée à traiter, il récupère tous les comptes `TokenProposal` associés et les classe en fonction du montant de SOL levé (`sol_raised`).
4.  **Détermination des Statuts :** Il identifie les 10 meilleures propositions (statut cible : `Validated`) et toutes les autres (statut cible : `Rejected`).
5.  **Mise à Jour On-Chain :** Il appelle l'instruction `update_proposal_status` du programme Solana pour chaque proposition, en passant le statut correct.
    *   Cette opération est effectuée en utilisant une clé d'autorité dédiée (`admin_authority`) dont la clé privée est détenue de manière sécurisée par ce service.

## Objectif

Ce service garantit que le cycle de vie des propositions est correctement complété on-chain, permettant ainsi le lancement effectif des tokens validés et la possibilité pour les utilisateurs de réclamer les fonds investis dans les propositions rejetées.

## Configuration

Le service nécessite des variables d'environnement pour fonctionner :

*   `RPC_URL`: L'URL de l'endpoint RPC Solana à utiliser.
*   `ADMIN_AUTHORITY_SECRET_KEY_PATH`: Le chemin absolu vers le fichier JSON contenant la clé privée (sous forme de tableau d'octets) de l'autorité admin configurée dans le compte `ProgramConfig` du programme Solana.

Consultez le fichier `.env.example` pour un modèle.

**Sécurité :** La clé privée `admin_authority` est extrêmement sensible. Assurez-vous qu'elle est stockée et gérée de manière sécurisée et n'est jamais commitée dans le dépôt.

## Exécution

(Ajouter ici les instructions pour compiler et lancer le service, par exemple `npm run build && node dist/main.js` ou `ts-node src/main.ts` pour le développement). 