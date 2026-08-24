---
title: Récupérer, tirer et pousser
category: Synchronisation et multi-dépôts
order: 50
summary: Rester au pas, avec des garde-fous sur les opérations qui mordent.
keywords: fetch récupérer pull tirer push pousser force forcé auto-fetch prune élaguer distants remotes amont upstream branche protégée protected branch plusieurs distants fork miroir mirror push tags all
---

# Récupérer, tirer et pousser

## Pull

Trois modes, choisis dans la liste déroulante : **par défaut**, **avance rapide
uniquement**, ou **rebase**. Les changements locaux sont remisés puis restaurés
automatiquement autour du pull : une copie de travail sale ne vous bloque donc
pas.

## Push

Les push forcés utilisent toujours `--force-with-lease` — la variante sûre, qui
refuse si le distant a bougé depuis votre dernier regard. Pousser en force une
**branche protégée** demande confirmation (la liste se trouve dans la roue dentée
des réglages du dépôt).

![La confirmation qu'exige une branche protégée avant un push forcé](../../screenshots/force-push-guard.webp)

### Plus d'un distant

Le bouton **Pousser** vise l'amont de la branche. La flèche à côté propose en
plus, dès qu'un dépôt a plus d'un distant :

| | |
|---|---|
| **Pousser vers un distant** | Choisissez un distant unique — un fork, un miroir, une cible de déploiement |
| **Pousser vers les N distants** | Un push par distant, dans l'ordre |
| **Pousser toutes les étiquettes vers** | `git push <remote> --tags`, toutes les étiquettes locales d'un coup |

Les deux mêmes actions se trouvent sur la ligne propre à chaque distant dans la
barre latérale, qui est généralement là où vous êtes quand la question se pose.

**Un refus n'annule pas le reste.** Pousser un fork et son amont est exactement
le cas où un côté refuse et où l'autre devrait quand même passer : chaque distant
rapporte donc séparément — les succès sont nommés dans une seule notification, et
chaque échec obtient la sienne avec la raison donnée par git.

Seul le **premier** distant de la liste définit l'amont de la branche. Une
branche a un seul amont, et le dernier distant poussé n'est pas automatiquement
celui que vous voulez qu'elle suive.

Les deux chemins exécutent les mêmes vérifications qu'un push ordinaire — la
confirmation de branche protégée et le [garde-fou des secrets](security.md).
Publier vers deux distants, c'est deux fois l'exposition, pas la moitié de la
prudence.

## Les branches sur lesquelles vous n'êtes pas

`git pull` ne déplace jamais que HEAD : c'est pourquoi la plupart des clients
exigent d'extraire une branche avant de pouvoir la mettre à jour. Pas Gitcito :
clic droit sur n'importe quelle branche locale — dans la barre latérale ou sur
son badge dans le [graphe](graph.md) — et vous obtenez **Tirer \<branche\>** et
**Pousser \<branche\>**, qui agissent sur *cette* branche.

| | |
|---|---|
| **Tirer `<branche>`** | Avance la référence locale jusqu'à son amont, sans extraction. La copie de travail n'est pas touchée. **Annulable avec ⌘Z** : l'annulation remet la branche où elle était. |
| **Pousser `<branche>`** | Une poussée ordinaire de cette branche, avec les mêmes garde-fous branche protégée et [secrets](security.md) que le bouton de la barre d'outils. |

Tirer est grisé pour une branche qui ne suit rien — il n'y a rien à tirer. Sur la
branche où vous êtes, les deux retombent sur le pull normal, qui met aussi la
copie de travail à jour.

**La limite à connaître :** une branche qui a **divergé** de son amont est
refusée, avec un message qui le dit. Réconcilier une divergence, c'est une fusion
ou un rebase, et les deux exigent une copie de travail — ce cas-là coûte donc
encore une extraction. La poussée forcée d'une branche où vous n'êtes pas est
proposée quand le distant refuse ; le chemin « tirer puis réessayer », non, pour
la même raison.

## Fetch

**Tout récupérer et élaguer** sur tous les distants, plus une **récupération
automatique** en arrière-plan à l'intervalle que vous fixez (Réglages → Général)
et un badge « récupéré il y a X » dans la barre d'outils.

Un fetch qui découvre de l'**histoire réécrite** le dit : une notification nomme
la branche, et sa ligne gagne un marqueur qui ouvre [ce qui a changé
depuis](range-diff.md) exactement au commit qu'elle désignait auparavant.

## Beaucoup de dépôts à la fois

- Un onglet de groupe peut faire **Tout récupérer / Tout tirer** sur son
  sous-arbre entier.
- Le [centre de contrôle](mission-control.md) le fait à l'échelle de l'espace de
  travail, et peut tirer *uniquement* les dépôts réellement en retard.

## Distants

Ajoutez, modifiez, supprimez et récupérez des distants individuels depuis la
barre latérale. Les lignes de branche portent des badges de présence par distant :
vous voyez donc d'un coup d'œil quels distants ont une copie d'une branche.

**Voir aussi :** [Centre de contrôle](mission-control.md) · [Hébergement et pull requests](hosting.md)
