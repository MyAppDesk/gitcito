---
title: Exécuter et déboguer (launch.json)
category: Outils de l'espace de travail
order: 91
summary: Lancer vos configurations VS Code sans quitter Gitcito.
keywords: launch.json exécuter run déboguer debug vscode configurations configs tâches tasks preLaunchTask input arrière-plan background
---

# Exécuter et déboguer

Gitcito lit votre `.vscode/launch.json` — celui de la racine et tous ceux qui
sont imbriqués, groupés par des séparateurs — et exécute la configuration que
vous choisissez dans le terminal intégré.

![Le sélecteur de lancement et la barre d'outils flottante](../../screenshots/launch-configs.webp)

- Les **variables** VS Code **sont résolues** (`${workspaceFolder}` et
  consorts).
- Le **`preLaunchTask`** d'une configuration s'exécute d'abord.
- Les valeurs **`${input:…}`** sont demandées interactivement avant le lancement
  (`promptString` et `pickString`).
- Les tâches **`isBackground`** (observateurs, serveurs de développement)
  s'exécutent détachées : elles ne bloquent donc jamais le lancement.

Une barre d'outils flottante vous donne **pause / reprise, redémarrage, arrêt**,
et permet de passer d'une session en cours à l'autre.

Activez-le dans **Réglages → Général → Activer launch.json**. Le bouton
**LANCER** apparaît à côté des onglets Git / Fichiers.

**Voir aussi :** [Terminal intégré](terminal.md)
