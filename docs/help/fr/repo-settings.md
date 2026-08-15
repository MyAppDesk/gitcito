---
title: Réglages par dépôt
category: Outils de l'espace de travail
order: 94
summary: Branches protégées, informations, statistiques d'usage, historique et journal des opérations.
keywords: réglages du dépôt repo settings branches protégées protected branches analytics journal des opérations operation log historique history info roue dentée gear
---

# Réglages par dépôt

La roue dentée à côté des outils de la barre d'outils ouvre les réglages qui
appartiennent à **ce** dépôt, pas à l'application.

![Les réglages par dépôt](../../screenshots/repo-settings.webp)

| Onglet | Ce qu'il contient |
|---|---|
| **Général** | Branches protégées (une sélection multiple de branches, stockée dans la configuration git), signature |
| **Infos** | Notes et champs libres à propos de ce dépôt, conservés localement |
| **Coffre** | Les entrées de [coffre](vault.md) de ce dépôt |
| **Analyses** | Le [tableau de bord d'historique](insights.md) |
| **Statistiques d'usage** | Ce que vous avez fait dans ce dépôt, compté localement |
| **Historique** · **Journaux** | Le journal des opérations : chaque commande git que Gitcito a exécutée, avec sa sortie |

Le journal des opérations est celui qui est honnête : quand quelque chose se
comporte bizarrement, il montre la commande exacte et l'erreur exacte, pour qu'un
rapport de bug puisse porter des faits plutôt que des adjectifs.

**Voir aussi :** [Sécurité et secrets](security.md) · [Analyses](insights.md)
