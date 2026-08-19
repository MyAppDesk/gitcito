---
title: Remisages
category: Synchronisation et multi-dépôts
order: 52
summary: Remisages partiels, application fichier par fichier, et remisage → branche.
keywords: remisage remisages remiser stash stashes partiel partial keep-index apply appliquer pop drop supprimer non suivi untracked branche branch
---

# Remisages

Remiser dans Gitcito n'est pas du tout ou rien.

| Action | Ce qu'elle fait |
|---|---|
| **Remiser** | Tout, y compris les fichiers non suivis si vous le souhaitez, avec un message |
| **Remisage partiel** | Cochez uniquement les fichiers voulus ; `--keep-index` en option |
| **Appliquer / Dépiler** | Le remisage entier, ou **seulement certains de ses fichiers** |
| **Remisage → branche** | `git stash branch` — la porte de sortie quand un remisage refuse de s'appliquer proprement |

Sélectionner un remisage affiche ses fichiers et ses diffs, exactement comme un
commit.

La liste de fichiers se sélectionne en groupe avec les mêmes gestes que
l'[indexation](staging.md) — clic <kbd>⌘</kbd>/<kbd>Ctrl</kbd>, clic
<kbd>⇧</kbd>, <kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> — et un clic droit (ou le
bouton *Appliquer n fichiers*) ne restaure que la sélection.

![Un remisage partiel : ne cochez que les fichiers qui doivent y entrer](../../screenshots/stash-partial.webp)

## Quand un remisage refuse de s'appliquer

Si appliquer un remisage devait écraser des fichiers non suivis, git s'arrête.
Gitcito propose de les écraser et de réessayer, plutôt que de vous laisser
chercher l'incantation.

Si l'arborescence a trop bougé, **remisage → branche** recrée la branche depuis
laquelle le remisage a été pris, l'y applique proprement, et supprime le
remisage.

## À ne pas confondre avec les instantanés

Les [instantanés de travail en cours](recovery.md) sont automatiques et cachés ;
les remisages sont délibérés et listés. Les instantanés ne touchent jamais à
votre liste de remisages.

**Voir aussi :** [Récupération](recovery.md) · [Indexation](staging.md)
