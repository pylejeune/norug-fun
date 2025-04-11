# 📌 Organisation du Projet GitHub

J’ai décrit et découpé tout ce que l’on doit faire dans les issues GitHub, et j’ai créé un **projet Kanban** pour que tout soit bien organisé.

🖼️ **Screenshot Issue**

![issues_list](/img/issues_list.png "issues_list")

🗂️ **Screen Kanban**  
🔗 Lien Kanban : [Projet GitHub](https://github.com/users/pylejeune/projects/1)

![Kanban](/img/kanban.png "Kanban")

---

## 🛠️ Utilisation du Kanban

### ✅ Lorsque vous prenez une issue :

1. ➡️ **Assignez-vous** à l’issue (par ordre de priorité — `priority: 0` est la plus urgente)
![assign_yourself](/img/assign_yourself.png "assign_yourself")
![assign_someone](/img/assign_someone.png "assign_someone")


2. ➡️ **Déplacez** le ticket vers la droite dans le Kanban
3. ➡️ **Créez une branche depuis l’issue** (⚠️ *ne pas créer manuellement*)
cela associe le ticket de l'issue à la branch

![create_branch](/img/create_branch.png "create_branch")

4. ➡️ **Pullez la branche** sur votre poste local

🧠 **Pourquoi ?**

- Chacun peut avancer sans se poser de questions
- Permet de suivre l’avancée du projet en mode *asynchrone* selon les disponibilités

---

## 📏 Règles à suivre pour une bonne fluidité

### 1️⃣ Pull Request (PR)

- 🎯 **Ajoutez les 2 autres personnes en reviewers**
  - Cela envoie un mail pour review 📬
  - Permet d’échanger sur le code si besoin

![add_reviewers](/img/add_reviewers.png "add_reviewers")  

### 2️⃣ Validation d’une PR

- ✅ **Les tests doivent être présents et passants**
- ✅ Les reviewers doivent valider
- ✅ Le pipeline doit passer
- 🔀 Ensuite on merge et **on supprime la branche** (pas develop)
![delete_branch](/img/delete_branch.png "delete_branch")  

- 📌 N’oubliez pas de **mettre à jour le ticket dans le Kanban** si ce n’est pas fait automatiquement
- 🎯 Objectif : **1 à 2 reviews minimum par jour**

### 3️⃣ Convention de Commit

- On suit la norme [Conventional Commits](https://www.conventionalcommits.org/) 🧾

---

## 🙌 Répartition naturelle des tâches

Je n’ai **pas assigné de tâches** volontairement.  
L’objectif est que **chacun choisisse** selon :

- sa maîtrise 🧠  
- ses préférences ❤️

> 💡 Une issue = Une PR (autant que possible)  
> 🧩 Certaines PR peuvent regrouper plusieurs issues, mais le **1:1 est conseillé**

---

## 💡 Suggestions de répartition (non imposées)

- **Alex** → Écrans avec **Next.js**

  https://github.com/pylejeune/norug-fun/issues/13
  https://github.com/pylejeune/norug-fun/issues/12
  Tu as fait l'init, tu es à l’aise avec Cursor, tu iras vite dessus 🚀  
  (👉 Quelques heures max)

- **AlexK** → Structures dans le **State**

  https://github.com/pylejeune/norug-fun/issues/13
  https://github.com/pylejeune/norug-fun/issues/9
  On a bien bossé le schéma ensemble, et je sais que tu veux faire du **Anchor / Rust** 🦀

- **Moi** → Fonctions générales, **pipeline**, **déploiement app** & **déploiement program** ⚙️

  https://github.com/pylejeune/norug-fun/issues/13
  https://github.com/pylejeune/norug-fun/issues/17

---

## 🧰 Infos utiles

- Vous pouvez **rajouter des issues** si de nouvelles tâches apparaissent

![new_issue](/img/new_issue.png "new_issue")

- Exemple d’issue ci-dessous ⬇️

![issue1](/img/issue1.png "issue1")
![issue2](/img/issue2.png "issue2")
![issue3](/img/issue3.png "issue3")
![issue4](/img/issue4.png "issue4")