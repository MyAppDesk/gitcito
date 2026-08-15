---
title: Clavier et raccourcis
category: Pour commencer
order: 2
summary: Les touches qui valent la peine d'être apprises, et comment les réassigner.
keywords: raccourcis shortcuts clavier keyboard touches keys antisèche cheatsheet réassigner rebind hotkeys palette
---

# Clavier et raccourcis

Appuyez sur <kbd>?</kbd> n'importe où pour l'antisèche.

![L'antisèche des raccourcis](../../screenshots/cheatsheet.webp)

## Ceux qui valent la peine d'être appris

| Touches | Effet |
|---|---|
| <kbd>⌘K</kbd> | [Palette de commandes](search.md) — branches, commits, fichiers, actions |
| <kbd>⌘⇧F</kbd> | [Recherche dans le code](search.md) à travers la copie de travail |
| <kbd>⌘⇧V</kbd> | [Coffre](vault.md) |
| <kbd>⌘O</kbd> / <kbd>Ctrl+O</kbd> | Ouvrir un dépôt |
| <kbd>⌘,</kbd> / <kbd>Ctrl+,</kbd> | Ouvrir les réglages |
| <kbd>⌘F</kbd> | Chercher dans le fichier ou le diff que vous lisez |
| <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> | Ouvrir le sélecteur de dépôt ou de groupe pour un nouvel onglet |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | Fermer l'onglet actif — ou la fenêtre, une fois qu'il n'en reste plus |
| <kbd>⌘1</kbd>–<kbd>⌘9</kbd> / <kbd>Ctrl+1</kbd>–<kbd>Ctrl+9</kbd> | Aller à un onglet par sa position |
| <kbd>⌘⇧T</kbd> | Rouvrir le dernier onglet fermé |
| <kbd>?</kbd> | Cette antisèche |

## Se déplacer sans la souris

| Où | Touches |
|---|---|
| Graphe des commits | <kbd>↑</kbd> <kbd>↓</kbd> ou <kbd>j</kbd> <kbd>k</kbd> |
| Listes de fichiers (commit, travail en cours, remisage) | les mêmes |
| [Machine à remonter le temps](time-machine.md) | <kbd>←</kbd> <kbd>→</kbd>, <kbd>⇧</kbd> pour dix, <kbd>Home</kbd>/<kbd>End</kbd> |
| [Centre de contrôle](mission-control.md) | <kbd>↑</kbd><kbd>↓</kbd>, <kbd>Enter</kbd> pour ouvrir, <kbd>f</kbd>/<kbd>p</kbd> pour fetch/pull, <kbd>/</kbd> pour filtrer |
| Zone du message de commit | <kbd>↑</kbd> <kbd>↓</kbd> rappelle vos messages récents |

## Réassigner

**Réglages → Raccourcis**. Les raccourcis de navigation principaux (palette,
recherche dans le code, coffre, ouvrir un dépôt, réglages) sont réassignables,
avec détection des conflits et une réinitialisation par raccourci.

Les raccourcis fixes ci-dessus ne sont pas réassignables, et ils sont aussi
refusés comme _cible_ : l'application répond à <kbd>⌘T</kbd>, <kbd>⌘W</kbd>,
<kbd>⌘1</kbd>–<kbd>⌘9</kbd>, <kbd>⌘⇧T</kbd>, <kbd>⌘S</kbd>, <kbd>⌘Z</kbd>,
<kbd>⌘⇧Z</kbd> et <kbd>⌘F</kbd> avant de consulter vos assignations ; un
raccourci associé à l'un d'eux semblerait donc défini sans jamais se déclencher.
Choisissez-en un et l'éditeur vous le dit au lieu de l'accepter.

![Les raccourcis réassignables dans les réglages](../../screenshots/settings-shortcuts.webp)

**Voir aussi :** [Palette de commandes et recherche](search.md)
