---
title: Ce qui a changé depuis
category: Lire les changements
order: 23
summary: Quelqu'un a force-pushé la branche que vous aviez relue. Voyez ce qui a réellement changé.
keywords: range-diff force push push forcé rebase réécrit rewritten revue review interdiff reflog mise à jour forcée
---

# Ce qui a changé depuis

Vous avez relu une branche. Quelqu'un l'a rebasée et l'a poussée en force. Un
diff normal ne vaut plus rien : après un rebase, chaque commit est un nouveau
commit, donc tout paraît nouveau.

`git range-diff` apparie les deux versions commit par commit, et Gitcito lit les
anciennes positions directement dans le **reflog** — rien n'a donc eu besoin
d'être enregistré à l'avance pour que cela fonctionne.

![Commits réécrits, nouveaux et abandonnés après un push forcé](../../screenshots/range-diff.webp)

| Verdict | Signification |
|---|---|
| **Réécrit** | Même commit, modifié. Dépliez-le pour l'interdiff — la retouche du message et la vérification en plus, pas le fichier entier. |
| **Nouveau** | Ajouté depuis votre lecture. |
| **Abandonné** | Disparu depuis votre lecture. |
| **Inchangé** | A survécu intact à la réécriture. |

## Y accéder

- **Un fetch qui découvre de l'histoire réécrite vous le signale.** Une
  notification nomme la branche, et sa ligne sous Distants gagne un **⟳** sur
  lequel cliquer pour ouvrir la comparaison exactement au commit qu'elle
  désignait auparavant.
- Clic droit sur une branche → *Ce qui a changé depuis…*
- <kbd>⌘K</kbd> → *Ce qui a changé depuis*

## Positions précédentes

Les pastilles sous les champs de références sont le reflog de la branche : mises
à jour forcées, rebases, réinitialisations, chacune avec sa date. Choisissez-en
une et la comparaison est relancée contre elle. C'est toute la fonctionnalité —
l'histoire des endroits où une branche est passée est déjà sur votre disque.

**Voir aussi :** [Radar de conflits](conflict-radar.md) · [Récupération et reflog](recovery.md)
