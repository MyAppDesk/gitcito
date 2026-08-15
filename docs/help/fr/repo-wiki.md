---
title: Wiki du dépôt (IA)
category: IA
order: 81
summary: Un guide généré d'une base de code où chaque affirmation cite un fichier.
keywords: wiki documentation généré generated base de code codebase vue d'ensemble overview dépendances dependencies architecture export docs
---

# Wiki du dépôt

Pointez-le vers un dépôt et il écrit un court wiki expliquant la base de code.

## La fiche du dépôt

- **Répartition des langages** par octets.
- **La pile** — les frameworks affichés en badges (Next, Angular, Electron,
  Tailwind, Django…).
- **Les dépendances** lues directement dans vos manifestes (`package.json`,
  `Cargo.toml`, `go.mod`, `pyproject.toml`, `pubspec.yaml`, `Gemfile`…) et
  groupées par rôle architectural. L'échafaudage — définitions de types,
  chargeurs, greffons de lint — est filtré d'abord, et seuls les paquets que le
  projet déclare réellement peuvent apparaître.
- **Un graphe de dépendances entre modules**, analysé depuis les sources (JS/TS,
  Python, Go, Rust, Dart, Ruby, C/C++, PHP) et résolu contre les propres fichiers
  du dépôt, pour qu'un import de paquet ne devienne jamais une arête fictive.

## Les pages rédigées

Gitcito planifie une poignée de pages à partir des fichiers que le dépôt suit —
la documentation et les manifestes d'abord, puis ce qui bouge le plus — et écrit
chaque page à partir des fichiers qu'elle couvre.

**Chaque affirmation cite le fichier dont elle provient**, et une affirmation
qu'aucun fichier n'étaye est rejetée plutôt que publiée. Les pages sont écrites
en parallèle et stockées d'un seul coup : une exécution ratée ne remplace donc
jamais un bon wiki. Il vous dit quand le wiki a été rédigé à un commit plus
ancien.

## Export

**Exporter vers docs/** écrit l'ensemble dans `docs/wiki/` sous forme de Markdown
lié — de sorte qu'il puisse être validé, relu dans une pull request, et lu chez
votre hébergeur.

Les fichiers qui ressemblent à des secrets ne sont jamais envoyés.

**Voir aussi :** [Fonctions IA](ai.md)
