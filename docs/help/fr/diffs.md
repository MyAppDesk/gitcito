---
title: Diffs et aperçus
category: Lire les changements
order: 20
summary: Vue partagée, surlignage au mot près, diffs d'images et aperçus de fichiers.
keywords: diff différence split côte à côte side-by-side mot word level espaces whitespace image aperçu preview markdown docx pdf
---

# Diffs et aperçus

## Lire un diff

| Bascule | Ce qu'elle fait |
|---|---|
| **Unifié ↔ partagé** | Côte à côte quand vous voulez comparer, empilé quand vous voulez lire |
| **Au niveau du mot** | Ne surligne que les jetons modifiés à l'intérieur d'une ligne éditée — rouge sur l'ancienne, vert sur la nouvelle |
| **Ignorer les espaces** | Masque les réindentations pour faire remonter le vrai changement |
| <kbd>⌘F</kbd> | Chercher dans le diff, avec passage au suivant/précédent |

![Diff partagé avec surlignage au mot près](../../screenshots/split-diff.webp)

Au-dessus de chaque diff se trouve le [résumé sémantique](semantic-diff.md) — ce
qui a changé, symbole par symbole, plutôt que ligne par ligne.

## Diffs d'images

Les images modifiées ont droit à une vraie comparaison : côte à côte, ou une
poignée à faire glisser entre l'avant et l'après.

![Diff d'image](../../screenshots/image-diff.webp)

## Prévisualiser n'importe quoi

Le mode **Aperçu** rend le fichier au lieu d'en montrer la source : Markdown,
Word (`.docx`), Excel (`.xlsx`), PDF, vidéo, audio, images, et du code coloré
syntaxiquement pour tout le reste.

![Aperçu Markdown](../../screenshots/markdown-preview.webp)

## L'onglet Fichiers

L'onglet **Fichiers** de la barre latérale gauche parcourt la copie de travail
elle-même, avec des badges d'état sur les dossiers (ajouté / modifié / supprimé)
qui agrègent ce qu'ils contiennent.

![L'onglet fichiers avec un aperçu](../../screenshots/file-tree.webp)

![Des badges de dossier totalisant ce qui a changé à l'intérieur de chacun](../../screenshots/tree-badges.webp)

**Voir aussi :** [Diff sémantique](semantic-diff.md) · [Indexation](staging.md)
