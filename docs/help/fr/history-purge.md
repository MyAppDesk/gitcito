---
title: Retirer un fichier de l'historique
category: Branches et chirurgie
order: 48
summary: Sortir un identifiant fuité ou un binaire énorme de tous les commits — et comprendre exactement ce que cela coûte.
keywords: purge purger historique history réécriture rewrite filter-branch bfg filter-repo fuite leaked secret identifiant credential jeton token supprimer fichier gros blob réduire shrink dépôt sauvegarde backup pre-purge rotation rotate parcourir browse plus gros fichiers
---

# Retirer un fichier de l'historique

`git rm` empêche un fichier d'apparaître dans les *nouveaux* commits. Il ne fait
rien à ceux qui existent déjà : le blob est toujours dans la base d'objets,
toujours dans chaque clone, toujours à un `git show` de distance.

Cela compte dans deux cas — quand le fichier était un identifiant, et quand il
faisait 400 Mo.

`⌘K` → **Retirer un fichier de l'historique**, ou clic droit sur le fichier —
dans l'arborescence du projet, dans la liste de fichiers d'un commit, ou dans le
compositeur de commit. Le commit qui a *supprimé* un fichier est généralement
l'endroit où l'on réalise qu'il est encore dans l'historique : la porte de sortie
est donc dans ce menu-là aussi.

## Trouver le chemin

Deux entrées, parce qu'elles répondent à des questions différentes.

**Le taper** — relatif au dépôt, sans barre oblique initiale — quand vous savez
déjà ce que vous êtes venu retirer.

**Parcourir l'historique** quand vous ne le savez pas. Il liste tous les chemins
jamais validés, du plus lourd au plus léger, avec le nombre de versions de chacun
et s'il est encore suivi. Les chemins supprimés sont marqués comme tels et sont
généralement ceux que vous voulez : un fichier disparu de la copie de travail
mais toujours présent dans chaque clone est exactement le cas qu'un sélecteur de
fichiers ordinaire ne peut pas vous montrer, puisque le fichier n'est pas là pour
être choisi.

La même liste répond à l'autre raison pour laquelle on vient ici — *pourquoi ce
clone fait-il deux gigaoctets* — puisqu'elle est triée par les octets que les
blobs de chaque chemin occupent réellement. Choisir une ligne la mesure
immédiatement.

![Tous les chemins jamais validés, du plus lourd au plus léger, les supprimés marqués](../../screenshots/history-purge-browse.webp)

## Mesurer avant d'accepter

Appuyez sur **Mesurer** (ou choisissez une ligne). Rien n'est encore écrit. Vous
obtenez :

| | |
|---|---|
| **Commits réécrits** | Tous les commits à partir du premier qui contenait le fichier |
| **Branches / étiquettes** | Les références qui vont bouger |
| **Occupé par ses blobs** | Les octets que ces versions occupent réellement |
| **Premier commit** | Là où la réécriture démarre — tout ce qui suit reçoit un nouveau hash |

![La mesure : commits réécrits, références affectées, octets occupés, et l'avertissement de changer le secret quoi qu'il arrive](../../screenshots/history-purge.webp)

Si le compte est zéro, le chemin est faux. C'est généralement une faute de frappe
ou un préfixe de répertoire, pas une absence.

## Ce que la réécriture fait réellement

Gitcito copie chaque branche et chaque étiquette vers
`refs/gitcito/pre-purge/<timestamp>/…`, puis exécute :

```sh
git filter-branch --force \
  --index-filter 'git rm --cached --ignore-unmatch -- <path>' \
  --prune-empty --tag-name-filter cat -- --branches --tags
```

`--index-filter` réécrit l'index directement au lieu d'extraire chaque commit, ce
qui fait la différence entre des minutes et des heures. `--branches --tags`
plutôt que `--all` est délibéré : `--all` inclurait les références de sauvegarde,
et la réécriture dévorerait son propre filet de sécurité.

Les commits qui ne contenaient que le fichier retiré sont jetés
(`--prune-empty`). Les étiquettes sont repointées vers leurs commits réécrits.

## La sauvegarde, et pourquoi l'espace ne revient pas tout de suite

La purge est annulable, et le prix à payer est que **l'espace disque n'est pas
récupéré tant que vous ne l'avez pas dit**. Tant que la sauvegarde existe, les
anciens commits restent atteignables, et git ne les ramassera donc pas.

| Action | Effet |
|--------|-------|
| **Restaurer** | Chaque branche et chaque étiquette retourne à son commit d'avant la purge ; le fichier revient avec elles |
| **Supprimer la sauvegarde** | Efface les références de sauvegarde, expire le reflog, lance `git gc --prune=now` — espace rendu, purge désormais définitive |

Deux étapes plutôt qu'une, parce que la première est la moitié récupérable et la
seconde ne l'est pas.

## Changez le secret quoi qu'il arrive

**Si un identifiant a été poussé ne serait-ce qu'une fois, réécrire votre
historique ne défait pas la fuite.** Quelqu'un a pu le récupérer ; les serveurs
des forges conservent des objets non référencés ; un journal de CI a pu
l'imprimer. La réécriture l'empêche de se répandre davantage — elle n'annule pas
l'exposition.

Changez la clé. Ensuite purgez, pour que la prochaine personne à cloner ne la
trouve pas.

## Ce qu'il ne fera pas

- **Il ne poussera pas.** La réécriture est locale. Publier le résultat suppose
  un push forcé sur chaque branche affectée, et tous les autres devront recloner
  ou faire un reset hard — le [garde-fou du push forcé](syncing.md) est là où
  cette décision se prend.
- **Il refuse sur une copie de travail sale** ou au milieu d'une fusion ou d'un
  rebase. Une réécriture déplace HEAD à répétition, et faire cela autour de
  travail non validé est la meilleure façon de le perdre.
- **Il réécrit par chemin, pas par contenu.** Retirer un secret collé dans un
  fichier source, plutôt que logé dans son propre fichier, exige un filtre de
  contenu — c'est le domaine de `git filter-repo --replace-text`, et Gitcito ne
  l'enveloppe pas.
- **`filter-branch` est lent sur de très gros historiques.** C'est ce qui est
  livré avec git partout, et c'est pourquoi c'est ce que Gitcito utilise. Sur un
  dépôt de dizaines de milliers de commits, `git filter-repo` dans le
  [terminal](terminal.md) est l'outil le plus rapide.
- **Les clones des autres ne sont pas votre dépôt.** Ils gardent l'ancienne
  histoire jusqu'à ce qu'ils reclonent.
