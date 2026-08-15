---
title: Blame et historique de fichier
category: Lire les changements
order: 22
summary: Qui a écrit cette ligne, quand, et à quoi elle ressemblait avant.
keywords: blame annotation historique history fichier file ligne line auteur author annotate reblame suivre follow
---

# Blame et historique de fichier

Ouvrez n'importe quel fichier et changez de mode d'affichage : **Aperçu ·
Fichier · Diff · Blame · Historique**.

![Le blame, avec le commit derrière chaque ligne dans la gouttière](../../screenshots/blame.webp)

## Blame

Chaque ligne porte son commit, son auteur et sa date, avec un code couleur par
commit : les blocs d'histoire partagée sautent aux yeux.

- **Suivre la ligne jusque dans le diff** : sautez d'une ligne de blame
  directement au changement qui l'a produite.
- **Refaire le blame avant ce commit** : clic droit sur une ligne pour blâmer le
  fichier tel qu'il était *avant* ce commit — c'est ainsi qu'on remonte
  l'histoire d'une ligne sans quitter la vue.

## Historique

Tous les commits qui ont touché ce fichier, du plus récent au plus ancien. En
sélectionner un affiche la version du fichier à ce commit : vous pouvez donc
feuilleter la façon dont il a grandi.

![Tous les commits qui ont touché un fichier, du plus récent au plus ancien](../../screenshots/file-history.webp)

Pour le dépôt entier plutôt qu'un seul fichier, utilisez la [machine à remonter
le temps](time-machine.md).

## Survoler pour comprendre

Avec l'IA activée, maintenir <kbd>⇧</kbd> (configurable, ou aucune touche du
tout) en pointant un identifiant en donne une explication d'une ligne, ainsi que
les lignes dont elle s'inspire — cliquez-en une pour y sauter. La lecture se
limite à une fenêtre numérotée autour du jeton : quand quelque chose est défini
ailleurs, elle le dit au lieu de l'inventer. Voir [Fonctions IA](ai.md).

**Voir aussi :** [Le graphe des commits](graph.md) · [Diffs](diffs.md)
