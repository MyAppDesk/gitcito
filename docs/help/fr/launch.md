---
title: Exécuter et déboguer (launch.json)
category: Outils de l'espace de travail
order: 91
summary: Lancer vos configurations VS Code sans quitter Gitcito.
keywords: launch.json exécuter run déboguer debug vscode configurations configs tâches tasks preLaunchTask input arrière-plan background compound compounds stopAll serverReadyAction sessions parallèles
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
  Un `pickString` affiche ses options dans un vrai sélecteur avec la valeur par
  défaut présélectionnée ; un `promptString` marqué `password` est masqué.
- Les tâches **`isBackground`** (observateurs, serveurs de développement)
  s'exécutent détachées : elles ne bloquent donc jamais le lancement.
- Les **compounds** lancent chaque membre dans sa **propre session parallèle**,
  dans un terminal scindé portant le nom du compound — un volet par membre,
  exactement comme les sessions de débogage de VS Code. Avec `stopAll: true`,
  arrêter un membre les arrête tous.
  Les tâches partagées par plusieurs membres s’exécutent **une seule fois**,
  dans leur propre volet, avant le démarrage des membres — une invite de montée
  de version ne demande qu’une fois, pas une fois par membre.
  Ce volet se ferme seul en cas de succès et reste ouvert en cas d’échec.
- **`serverReadyAction`** est pris en charge : quand la sortie de la session
  correspond au motif configuré, l’URL annoncée s’ouvre dans votre navigateur
  (`openExternally` ; `debugWithChrome` / `debugWithEdge` ouvrent aussi le
  navigateur — Gitcito ne peut pas y attacher de débogueur).

![Un compound exécutant deux sessions parallèles](../../screenshots/launch-compound.webp)

![Le sélecteur ${input} avec la valeur par défaut présélectionnée](../../screenshots/launch-input.webp)

Une barre d'outils flottante vous donne **pause / reprise, redémarrage, arrêt**,
et permet de passer d'une session en cours à l'autre.

Activez-le dans **Réglages → Général → Activer launch.json**. Le bouton
**LANCER** apparaît à côté des onglets Git / Fichiers.

Un membre d’un compound s’affiche comme *compound › membre*, et le redémarrer
ne redémarre que ce membre.
Si la barre recouvre quelque chose dont vous avez besoin, déplacez-la par sa
poignée — la position est mémorisée, et un double-clic sur la poignée la
recentre.

Ce que Gitcito ne fait délibérément **pas** : il exécute vos programmes dans de
vrais terminaux, mais ce n’est pas un débogueur — pas de points d’arrêt, pas
d’inspection de variables, pas de Debug Adapter Protocol. Les configurations
attach fonctionnent quand elles portent un `preLaunchTask` (la tâche est le
travail) ; un attach pur n’a rien à exécuter.

**Voir aussi :** [Terminal intégré](terminal.md)
