---
title: Modifier n'importe quel commit
category: Branches et chirurgie
order: 46
summary: Réécrire les fichiers ou le message d'un commit historique sur place — avec la cascade prévisualisée d'abord.
keywords: modifier commit edit réécrire historique rewrite history amend passé reword corriger faute typo cascade replay rebase in place chirurgie surgery
---

# Modifier n'importe quel commit

La faute de frappe est dans un commit d'il y a trois semaines. Le remède
habituel est un rebase interactif : s'arrêter au commit, modifier, continuer,
prier. Le remède de Gitcito : clic droit sur le commit, **Modifier ce
commit**, changer le texte, terminé. Le bouton stylo dans le panneau des
détails du commit ouvre le même éditeur.

![Modification d'un commit historique](../../screenshots/commit-edit.webp)

## Ce que ça fait

Choisissez n'importe quel commit sur un chemin linéaire jusqu'à `HEAD`. La
fenêtre montre ses fichiers et son message ; modifiez l'un ou l'autre. Deux
choses se passent ensuite :

1. **Prévisualiser la cascade** rejoue chaque commit au-dessus de celui
   modifié *en mémoire* (une chaîne de cherry-picks `merge-tree` — pas de
   checkout, pas d'arbre de travail, pas de refs). Chaque descendant apparaît
   en vert ou en rouge, vous savez donc **avant que quoi que ce soit ne
   bouge** si la modification se propage proprement ou entre en collision avec
   un changement ultérieur.
2. **Réécrire l'historique** le fait pour de vrai : la même chaîne est
   construite avec la plomberie, puis la branche se déplace avec
   `reset --keep` — vos changements non commités sont emportés, ou le reset
   s'interrompt et rien ne s'est passé. Un
   [instantané gardien](recovery.md) est pris d'abord, et l'annulation
   restaure l'ancienne chaîne.

L'auteur et les dates de chaque commit rejoué sont préservés ; seuls les
hachages changent — c'est exactement ce que réécrire l'historique veut dire.

## Quand la cascade entre en conflit

Un commit ultérieur a touché les mêmes lignes que vous modifiez. L'aperçu
marque ce commit en rouge avec les fichiers en conflit, et la réécriture
refuse de s'exécuter — rien n'est jamais appliqué à moitié. Soit vous modifiez
autrement, soit vous affrontez le conflit de face avec un
[rebase interactif](rebase.md).

## Limites

- **Historique linéaire uniquement.** Un merge entre le commit et `HEAD`
  désactive la modification — rejouer des merges est un problème différent,
  plus difficile.
- Les fichiers binaires et les fichiers de plus de 2 Mo sont affichés mais pas
  modifiables.
- Un commit déjà présent sur un distant peut être modifié, mais votre prochain
  push devra être un **push forcé** — la fenêtre vous prévient avant que vous
  ne vous y engagiez.
- Les fichiers supprimés dans le commit ne peuvent pas être modifiés (il n'y a
  pas de contenu à modifier).

**Voir aussi :** [Rebase interactif](rebase.md) · [Récupération et le reflog](recovery.md) · [Absorption](absorb.md)
