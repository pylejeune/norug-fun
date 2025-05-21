# Front NoRug.fun

## Tests End-to-End et Couverture de Code

### Exécuter les tests E2E

Pour exécuter les tests end-to-end avec Playwright :

```bash
pnpm test:e2e
```

### Générer un rapport de couverture de code

Pour générer un rapport de couverture de code :

```bash
pnpm test:coverage
```

Le rapport HTML sera disponible dans le dossier `coverage/lcov-report/`.

### Exécuter les tests E2E avec couverture de code

Pour exécuter les tests E2E puis générer et afficher automatiquement le rapport de couverture :

```bash
pnpm test:e2e:coverage
```

Cette commande va :
1. Exécuter les tests end-to-end
2. Générer le rapport de couverture de code
3. Ouvrir automatiquement le rapport HTML dans votre navigateur

### Visualiser le rapport de couverture

Vous pouvez également ouvrir manuellement le rapport HTML :

```bash
open coverage/lcov-report/index.html  # macOS
# ou
xdg-open coverage/lcov-report/index.html  # Linux
# ou
start coverage/lcov-report/index.html  # Windows
```

### API de couverture de code

Une API REST est disponible pour récupérer les données de couverture de code :

```
GET /api/coverage
```

Cette API renvoie les statistiques de couverture au format JSON. 