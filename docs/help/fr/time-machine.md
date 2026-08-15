---
title: Machine à remonter le temps
category: Dépôt et historique
order: 13
summary: Faites glisser un curseur et regardez le dépôt lui-même changer, commit par commit.
keywords: machine à remonter le temps time machine parcourir scrub historique history curseur slider passé arborescence tree rembobiner rewind ancienne version
---

# Machine à remonter le temps

Lire un vieux commit veut d'habitude dire l'extraire, ce qui veut dire remiser ce
que vous étiez en train de faire. Pas ici.

Faites glisser le curseur et l'**arborescence de fichiers se redessine à chaque
commit** : des dossiers apparaissent, des fichiers passent de l'un à l'autre, des
fichiers supprimés reviennent. Choisissez un fichier et vous le lisez tel qu'il
était à ce commit.

Tout est lu depuis la base d'objets (`git ls-tree`, `git show`). **Aucune
extraction, HEAD ne bouge jamais, votre travail non validé n'est pas touché** —
vous pouvez parcourir un an d'histoire au beau milieu d'une modification.

![L'arborescence telle qu'elle était à un commit antérieur, avec un fichier ouvert à côté](../../screenshots/time-machine.webp)

![Déplacement du curseur : l'arborescence se reconstruit commit par commit](../../screenshots/clip-time-machine.webp)

## Commandes

| Touche | Action |
|---|---|
| <kbd>←</kbd> <kbd>→</kbd> | Un commit |
| <kbd>⇧</kbd> + <kbd>←</kbd> <kbd>→</kbd> | Dix commits |
| <kbd>Home</kbd> / <kbd>End</kbd> | Le plus ancien / le plus récent |

Les flèches de part et d'autre du curseur font la même chose. Les fichiers que le
commit courant a touchés sont mis en évidence dans l'arborescence, avec un
compteur dans l'en-tête.

## La sélection survit au temps

Choisissez un fichier et remontez au-delà du commit qui l'a créé : le panneau dit
qu'il n'existe pas ici, et **conserve votre sélection**. Redescendez et le
fichier revient avec son ancien contenu. C'est tout l'intérêt — c'est le dépôt
que vous déplacez, pas votre curseur.

**Ouvrir cette version** confie le fichier à la vue de fichier habituelle, à ce
commit.

**Voir aussi :** [Timelapse](timelapse.md) · [Blame et historique](blame.md)
