---
title: Rebase interactif
category: Branches et chirurgie
order: 42
summary: Réordonner, squasher, fixup, reformuler, éditer ou jeter — en glissant.
keywords: rebase interactif interactive squash fixup reword reformuler drop jeter edit éditer autosquash todo
---

# Rebase interactif

La liste todo de `git rebase -i`, sous forme de liste que vous pouvez faire
glisser.

![L'éditeur de rebase interactif](../../screenshots/interactive-rebase.webp)

| Action | Signifie |
|---|---|
| **pick** | Le garder tel quel |
| **reword** | Garder le changement, éditer le message |
| **squash** | Replier dans le commit du dessus, en fusionnant les deux messages |
| **fixup** | Replier dans le commit du dessus, en jetant ce message |
| **edit** | S'arrêter ici pour que vous puissiez amender |
| **drop** | Jeter le commit |

Faites glisser les lignes pour réordonner. L'éditeur ne s'ouvre jamais dans un
terminal — Gitcito écrit la todo pour vous.

## Autosquash, en un clic

- **Transformer les changements indexés en fixup de ce commit** crée le `fixup!`
  pour vous.
- **Autosquash à partir d'ici** replie chaque `fixup!` / `squash!` dans sa cible.

Si vous avez un tas de corrections de revue plutôt qu'une seule,
l'[absorption](absorb.md) détermine à quel commit appartient chaque section, pour
que vous n'ayez pas à le faire.

> Rebaser réécrit l'histoire. Tout ce qui est déjà poussé exigera un push forcé,
> et celui qui l'avait relu voudra savoir [ce qui a changé
> depuis](range-diff.md).

**Voir aussi :** [Absorption](absorb.md) · [Ce qui a changé depuis](range-diff.md) · [Récupération](recovery.md)
