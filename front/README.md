## Configuration de l'API Epoch Scheduler

Pour que l'API `epoch-scheduler` fonctionne correctement sur Vercel, vous devez configurer les variables d'environnement suivantes:

| Variable | Description |
|----------|-------------|
| `SOLANA_RPC_ENDPOINT` | Point de terminaison RPC Solana (ex: https://api.devnet.solana.com) |
| `PROGRAM_ID` | ID du programme Solana (ex: 3HBzNutk8DrRfffCS74S55adJAjgY8NHrWXgRtABaSbF) |
| `ADMIN_SEED_BASE64` | Clé privée de l'administrateur encodée en Base64 |
| `API_SECRET_KEY` | Clé secrète pour sécuriser l'accès à l'API |

### Pour générer ADMIN_SEED_BASE64

Utilisez la commande suivante pour convertir la clé secrète ADMIN_SEED en Base64:

```bash
node -e "console.log(Buffer.from(new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32])).toString('base64'))"
```

Remplacez les nombres dans le tableau par votre ADMIN_SEED.

### Planification des exécutions

L'API est configurée pour s'exécuter automatiquement toutes les 5 minutes grâce à la configuration cron dans `vercel.json`. Vous pouvez modifier la fréquence d'exécution en ajustant le paramètre `schedule`.

### Test de l'API

Vous pouvez tester l'API en envoyant une requête GET avec le header d'autorisation adéquat:

```bash
curl -H "Authorization: Bearer VOTRE_API_SECRET_KEY" https://votre-domaine.vercel.app/api/epoch-scheduler
```
