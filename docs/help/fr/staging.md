---
title: Indexation
category: Travailler sur les changements
order: 30
summary: Indexer des fichiers entiers, des sections isolées ou des lignes individuelles.
keywords: indexation staging indexer stage désindexer unstage abandonner discard section hunk lignes lines index partiel partial
---

# Indexation

Le panneau de commit contient trois listes : **En conflit**, **Non indexé** et
**Indexé**. Chacune se replie, et chacune se souvient si vous l'aviez laissée
ouverte.

![Un diff non indexé, avec les contrôles de section et de fichier à côté](../../screenshots/line-staging.webp)

## Trois niveaux de précision

| Niveau | Comment |
|---|---|
| **Fichier** | Cliquez le ✚ sur la ligne, ou sélectionnez plusieurs lignes et indexez le tout |
| **Section** | Ouvrez le diff et utilisez le bouton sur l'en-tête de la section |
| **Ligne** | Sélectionnez des lignes à l'intérieur du diff et indexez exactement celles-là |

L'indexation par ligne est ce qui rend praticable de tenir un `console.log` de
débogage hors d'un commit sans avoir à le supprimer d'abord.

## Abandonner

L'abandon fonctionne aux mêmes niveaux, et demande toujours confirmation. Les
fichiers non suivis sont supprimés ; les fichiers suivis reviennent à leur état
indexé (ou validé).

## Clavier

<kbd>↑</kbd> <kbd>↓</kbd> (ou <kbd>j</kbd> <kbd>k</kbd>) parcourent les listes de
fichiers, avec <kbd>⇧</kbd> pour une plage et <kbd>⌘</kbd>/<kbd>Ctrl</kbd> pour
basculer des fichiers individuels.

<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> étend la sélection depuis la dernière
ligne cliquée. Un clic droit sur la sélection permet d'indexer, de désindexer,
de remiser ou d'annuler tout d'un coup.

## Copier les chemins

Un clic droit sur un fichier non validé propose **Copier le chemin du fichier**
(absolu, avec les séparateurs de la plateforme) et **Copier le chemin relatif
du fichier** (`src/index.ts`, sans `./` initial). Plusieurs fichiers
sélectionnés copient un chemin par ligne, dans l'ordre de la liste. Les fichiers
supprimés restent disponibles : ces actions ne copient que du texte. Les
dossiers copient toujours le chemin du dossier.

## Avant de valider

Gitcito vérifie quelques points et demande une fois, jamais en silence :

- un fichier qui ressemble à un **secret** (`.env`, `*.pem`, `id_rsa`…),
- un blob **très volumineux** (seuil dans Réglages → Sécurité),
- un commit **directement sur une branche protégée** (`main`/`master` par
  défaut).

Chacun de ces cas propose un *Ignorer et ne plus suivre* en un clic. Voir
[Sécurité et secrets](security.md).

**Voir aussi :** [Faire des commits](committing.md) · [Diffs](diffs.md) · [Absorption](absorb.md)
