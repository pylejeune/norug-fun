#!/bin/bash

# Vérifier si les variables d'environnement sont définies
if [ -z "$RPC_ENDPOINT" ]; then
    echo "RPC_ENDPOINT n'est pas défini. Utilisation de la valeur par défaut: http://localhost:8899"
    export RPC_ENDPOINT="http://localhost:8899"
fi

if [ -z "$ADMIN_KEYPAIR_PATH" ]; then
    echo "ADMIN_KEYPAIR_PATH n'est pas défini. Utilisation de la valeur par défaut: admin-keypair.json"
    export ADMIN_KEYPAIR_PATH="admin-keypair.json"
fi

# Compiler le programme
#echo "Compilation du programme..."
#anchor build

# Exécuter le scheduler
echo "Démarrage du scheduler..."
ts-node epoch_scheduler.ts 