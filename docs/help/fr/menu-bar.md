---
title: La barre de menus
category: Pour commencer
order: 5
summary: Ce que contiennent les menus macOS de Gitcito, et pourquoi Windows et Linux n'en ont pas.
keywords: barre de menus menus application fichier édition affichage fenêtre aide dépôt macos natif à propos quitter
---

# La barre de menus

Une barre de menus répond à une question qu'aucune autre surface ne traite
bien : *que sait faire cette application ?* La [palette de
commandes](search.md) est plus rapide une fois qu'on sait ce qu'on cherche, et
l'[aide-mémoire](keyboard.md) liste les touches — mais on ne parcourt ni l'une
ni l'autre. Les menus, si.

Tout ce qui s'y trouve est également accessible depuis la fenêtre. Rien n'existe
uniquement dans le menu, et c'est délibéré : une fonction qui ne vit que dans un
menu est une fonction dont les utilisateurs de Windows et de Linux sont privés.

## Ce qui se trouve où

| Menu | Contient |
|---|---|
| **Gitcito** | À propos, recherche de mises à jour, [Réglages](repo-settings.md), les entrées standard masquer et quitter |
| **Fichier** | Nouvel onglet, ouvrir ou [cloner](cloning.md) un dépôt, ouvrir un élément récent, fermer et rouvrir des onglets |
| **Édition** | Couper, copier, coller, annuler — l'édition de texte que votre clavier fait déjà — plus la [recherche dans le code](search.md) |
| **Affichage** | Palette de commandes, bascules de la barre latérale et du panneau, le [terminal](terminal.md), [mission control](mission-control.md), le [coffre](vault.md), le zoom |
| **Dépôt** | Fetch, pull, push, valider, remiser, nouvelle branche, [pull request](hosting.md), annuler, afficher dans le Finder, réglages du dépôt |
| **Fenêtre** | Réduire, zoom, tout ramener au premier plan |
| **Aide** | Ce manuel, l'aide-mémoire, les nouveautés, les licences, signaler un problème |

Le menu Dépôt est entièrement grisé quand l'onglet actif n'est pas un dépôt git,
et **Annuler** est grisé quand il n'y a rien à annuler : le menu est un résumé
lisible de ce que l'application vous laissera faire à cet instant.

## Des raccourcis affichés, pas confisqués

Les touches indiquées à côté de chaque entrée sont celles que vous avez
réellement associées. Réassignez <kbd>⌘K</kbd> dans les Réglages et le menu
Affichage le dira.

Cela fonctionne parce que le menu *affiche* ces combinaisons sans les réclamer :
la gestion clavier de Gitcito reste aux commandes, ce qui permet à un raccourci
de se comporter différemment selon l'endroit où se trouve le curseur. La seule
chose que cela ne peut pas montrer est un raccourci que Gitcito ne possède pas :
<kbd>⌘F</kbd> appartient au fichier ou au diff que vous lisez, aucune entrée de
menu ne le réclame donc.

## Les limites

- **macOS uniquement.** Sous Windows et Linux la fenêtre est sans cadre — la
  barre de titre est dessinée par Gitcito et une barre de menus n'a nulle part
  où vivre. Ces plateformes obtiennent les mêmes commandes via la [palette de
  commandes](search.md) et les [raccourcis clavier](keyboard.md).
- **Recharger et les Outils de développement n'apparaissent que dans les builds
  de développement.** Recharger jette l'état de tous les onglets ouverts, ce
  qu'une version publiée n'a pas à proposer à côté de Zoom.
- **Ouvrir un élément récent liste dix dépôts au maximum**, du plus récent au
  plus ancien, et suit la même liste que l'[écran d'accueil](getting-started.md).
- **Rouvrir l'onglet fermé n'est jamais grisé.** La pile des onglets fermés ne
  vit que le temps de la session et le menu ne peut pas la voir ; choisir cette
  entrée sans rien à rouvrir ne fait rien.
