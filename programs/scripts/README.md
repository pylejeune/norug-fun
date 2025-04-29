# Scheduler d'Époques

Ce dossier contient les scripts nécessaires pour exécuter le scheduler d'époques qui vérifie et ferme automatiquement les époques expirées.

## Configuration

Le scheduler utilise les variables d'environnement suivantes :

- `RPC_ENDPOINT` : L'URL du endpoint RPC Solana (par défaut: http://localhost:8899)
- `ADMIN_KEYPAIR_PATH` : Le chemin vers le fichier keypair de l'administrateur (par défaut: admin-keypair.json)

## Installation

1. Assurez-vous d'avoir les dépendances nécessaires installées :
   ```bash
   npm install -g ts-node typescript @types/node
   ```

2. Créez un fichier keypair pour l'administrateur si vous n'en avez pas déjà un :
   ```bash
   solana-keygen new -o admin-keypair.json
   ```

## Utilisation

Pour démarrer le scheduler, exécutez simplement le script `run-scheduler.sh` :

```bash
./run-scheduler.sh
```

Le scheduler va :
1. Vérifier toutes les minutes les époques actives
2. Fermer automatiquement les époques dont la date de fin est dépassée
3. Logger les actions effectuées dans la console

## Logs

Le scheduler affiche les logs suivants :
- Nombre d'époques actives trouvées
- Fermeture des époques expirées
- Erreurs éventuelles lors de la fermeture des époques

## Arrêt

Pour arrêter le scheduler, utilisez Ctrl+C dans le terminal où il s'exécute. 