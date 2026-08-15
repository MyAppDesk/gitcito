---
title: Palette de commandes et recherche
category: Dépôt et historique
order: 11
summary: Sauter n'importe où, et fouiller l'arborescence ou l'historique.
keywords: palette de commandes command palette recherche search grep recherche de code code search pioche pickaxe trouver find approximative fuzzy sauter jump
---

# Palette de commandes et recherche

## La palette — <kbd>⌘K</kbd>

Sautez, en recherche approximative, vers une **branche** (elle est extraite), un
**commit** (le graphe défile jusqu'à lui), un **fichier de la copie de travail**,
ou une **action** — fetch, pull, push, remisage, terminal, reflog, réglages, et
chaque fonctionnalité de ce manuel.

Elle apprend : ce que vous avez utilisé récemment remonte en premier, et ce que
vous utilisez souvent passe devant ce que vous n'utilisez pas.

![La palette de commandes](../../screenshots/command-palette.webp)

## Recherche dans le code — <kbd>⌘⇧F</kbd>

Deux questions différentes, une seule boîte de dialogue :

| Mode | Question à laquelle il répond |
|---|---|
| **Contenus** | « Où est cette chaîne en ce moment ? » — `git grep` sur les fichiers suivis *et* non suivis, avec casse / mot entier / expression régulière. |
| **Pioche d'historique** | « Quand cette chaîne est-elle apparue ou a-t-elle disparu ? » — `git log -S` / `-G`. |

Les résultats reviennent colorés syntaxiquement avec la correspondance marquée,
groupés par fichier et dépliables jusqu'aux lignes exactes. Cliquez-en un pour
ouvrir le fichier à cette ligne, ou le commit qui l'a introduite.

![Résultats de recherche dans le code](../../screenshots/code-search.webp)

## Filtrer le graphe

Le champ de recherche au-dessus du graphe filtre les commits par message, auteur,
SHA ou statut de déploiement. Pour « seulement les commits qui ont touché ce
fichier », utilisez le filtre de chemin — voir [le graphe des
commits](graph.md).

**Voir aussi :** [Le graphe des commits](graph.md) · [Clavier et raccourcis](keyboard.md)
