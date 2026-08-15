---
title: Fusion et rebase
category: Branches et chirurgie
order: 41
summary: Fusionner, rebaser, comparer des références, et glisser une référence sur une autre dans la barre latérale ou dans le graphe.
keywords: fusion merge rebase avance rapide fast-forward comparer compare références refs glisser déposer drag drop branche sur graphe badge de référence étiquette tag distant remote revert reset cherry-pick
---

# Fusion et rebase

## Depuis la barre latérale

Clic droit sur une branche pour **Fusionner dans la branche courante** ou
**Rebaser sur** — ou **Fusionner avec des options…** quand c'est la fusion
ordinaire qui ne cesse de mal tourner ; voir [les options de
fusion](merge-options.md).

## Glisser une référence sur une autre

Le geste le plus rapide de l'application : attrapez une branche et déposez-la sur
une autre. Gitcito ouvre un petit menu de ce que ce dépôt pourrait signifier, et
ne fait rien tant que vous n'avez pas choisi.

![Glisser une branche sur une autre ouvre le menu de ce que le dépôt pourrait signifier](../../screenshots/clip-branch-drop.webp)

Cela fonctionne aux **deux** endroits où les références sont affichées : les
lignes de branches, de distants et d'étiquettes de la barre latérale, et les
**badges de références colorés dans le graphe** lui-même. Glissez entre eux dans
n'importe quelle combinaison ; la cible se met en surbrillance pendant que vous
la survolez.

| Dépôt | Signifie |
|------|-------|
| **Fusionner {source} → {cible}** | Extrait la cible et y fusionne la source |
| **Rebaser {source} sur {cible}** | Rejoue les commits de la source par-dessus la cible |
| **Comparer** | Ouvre la [comparaison](#comparer-deux-références-quelconques) — ne change rien |

**Le menu ne propose que ce que git sait faire.** Fusionner valide un commit sur
la cible : la cible doit donc être une branche locale — on ne peut pas fusionner
dans une étiquette ni dans une référence de suivi distant. Rebaser réécrit la
source : la source doit donc être une branche locale. Déposez une étiquette sur
une branche distante et tout ce qu'on vous propose est *Comparer*, parce que
c'est sincèrement tout ce qui existe.

Le rebase demande d'abord confirmation : il donne un nouveau hash à chaque commit
rejoué, ce qui signifie un push forcé si la branche est déjà publiée. La fusion,
elle, ne demande rien — elle ne fait qu'ajouter. Dans les deux cas, un seul
**Annuler** vous ramène.

## Fusion

Avance rapide quand c'est possible, ou commit de fusion forcé quand vous voulez
que la topologie soit enregistrée. En cas de conflit, vous atterrissez dans [le
résolveur](conflicts.md).

## Comparer deux références quelconques

Choisissez une base et une référence à comparer — branche, étiquette ou SHA brut,
avec un bouton d'échange — et vous obtenez les compteurs d'avance/retard, les
commits propres à chaque côté, le diff combiné complet, et un passage de relais
en un clic vers **ouvrir une pull request**.

![Comparaison de deux branches : ce qui est propre à chaque côté, et le diff combiné](../../screenshots/branch-compare.webp)

Accessible depuis la barre latérale (comparer avec la branche courante), depuis
le menu Outils, ou par <kbd>⌘K</kbd>.

## Cherry-pick, revert, réinitialisation

Les trois depuis le menu contextuel du graphe. La réinitialisation propose
**soft / mixed / hard** et explique ce que chacune fait à votre copie de travail
avant que vous ne choisissiez.

Sélectionnez d'abord plusieurs commits et le cherry-pick applique toute la
sélection, dans l'ordre.

## Avant de fusionner quoi que ce soit

Le [radar de conflits](conflict-radar.md) balaye chaque branche contre une base
et vous dit lesquelles vont se battre, sans rien extraire.

**Voir aussi :** [Rebase interactif](rebase.md) · [Branches empilées](stacks.md) · [Radar de conflits](conflict-radar.md)
