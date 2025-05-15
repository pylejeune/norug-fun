## 📝 Description de la fonctionnalité
Ajout d'un workflow GitHub Actions qui envoie automatiquement une notification Discord lorsqu'une Pull Request est approuvée par un reviewer.

## 🎯 Problème ou besoin
Il est important de maintenir une communication transparente au sein de l'équipe concernant l'état des Pull Requests. Actuellement, il n'y a pas de notification automatique lorsqu'une PR est approuvée, ce qui peut ralentir le processus de review et de merge.

## 💡 Solution proposée
Implémentation d'un workflow GitHub Actions (`notify-approved-pr-discord.yml`) qui :
- Se déclenche sur l'événement `pull_request_review` de type `submitted`
- Vérifie si la review est une approbation
- Envoie une notification Discord avec :
  - Le numéro et le titre de la PR
  - Un lien direct vers la PR
  - L'auteur de la PR
  - Le reviewer qui a approuvé
  - Un horodatage

## 🔄 Alternatives envisagées
1. Utilisation d'intégrations GitHub-Discord tierces
2. Notifications par email
3. Notifications dans d'autres canaux de communication

La solution actuelle a été choisie car elle :
- Est native à GitHub Actions
- Est facilement personnalisable
- Ne nécessite pas de services tiers supplémentaires
- S'intègre parfaitement avec notre système de notification Discord existant

## 📸 Captures d'écran ou maquettes
Le message Discord ressemblera à ceci :
```
✅ PR Approuvée
Une PR a été approuvée !

PR: #123 - Titre de la PR
Auteur: username
Approuvé par: reviewer
[Horodatage]
```

## 📚 Informations supplémentaires
Pour que le workflow fonctionne, il faut :
1. Configurer un webhook Discord dans les paramètres du repository
2. Ajouter le secret `DISCORD_WEBHOOK` dans les paramètres du repository GitHub
3. S'assurer que le webhook Discord a les permissions nécessaires pour envoyer des messages

Le workflow utilise l'action `Ilshidur/action-discord@master` qui est largement utilisée et maintenue par la communauté. 