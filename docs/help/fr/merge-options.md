---
title: Options de fusion
category: Branches et chirurgie
order: 45
summary: Les commutateurs de git merge pour les fusions qui échouent de la même façon à chaque fois — -X ours, espaces, squash, subtree.
keywords: options de fusion merge options stratégie strategy -X ours theirs ignore-space-change espaces whitespace squash no-ff ff-only no-commit subtree sous-arbre resolve ort recursive log --merge pourquoi ce conflit
---

# Options de fusion

Une fusion ordinaire, c'est un bouton, et la plupart du temps l'histoire s'arrête
là. Cette page est pour les autres fois : le fichier de verrouillage qui
s'oppose à chaque fusion, le fichier que quelqu'un a réindenté, le projet
embarqué dont les chemins ne coïncident pas. Git a des commutateurs pour ces
trois cas depuis des années ; ils sont simplement enterrés dans une page de
manuel que personne n'ouvre en plein conflit.

Clic droit sur une branche → **Fusionner avec des options…** — dans les lignes de
branches et de distants de la barre latérale *et* sur les badges de références
colorés du graphe, qui partagent un même bloc de menu — ou `⌘K` → **Fusionner
avec des options**.

![Les options de fusion, avec la commande git exacte écrite en dessous](../../screenshots/merge-options.webp)

La commande s'imprime à mesure que vous la construisez. Elle est là pour être
confrontée au manuel — et pour être lancée depuis un terminal la prochaine fois,
sans cette boîte de dialogue.

## Quand une section entre en conflit

| Choix | Option | Signifie |
|--------|------|-------|
| M'arrêter et me demander | — | Le comportement par défaut. C'est vous qui résolvez |
| Garder le côté de cette branche | `-X ours` | Les sections qui s'opposent se résolvent vers ce qui est déjà extrait |
| Prendre le côté entrant | `-X theirs` | Les sections qui s'opposent se résolvent vers la branche entrante |

**`-X ours` n'est pas `-s ours`.** Le commutateur d'ici ne décide que des
sections qui s'opposent réellement ; tous les autres changements de l'autre
branche fusionnent normalement. La stratégie appelée `ours` — que Gitcito ne
propose pas — prend votre arbre en bloc et jette l'autre côté, produisant un
commit de fusion qui prétend contenir un travail qu'il ne contient pas. Cette
distinction est la chose la plus mal comprise des fusions git.

**Elle ne peut pas tout décider.** Un conflit modification/suppression — un côté
a édité un fichier, l'autre l'a supprimé — n'est pas une section de contenu, et
`-X` vous le laisse. C'est correct : il n'existe aucune version de « préférer les
nôtres » qui réponde à la question de savoir si un fichier supprimé doit revenir.

## Espaces

| Choix | Option |
|--------|------|
| Ignorer les changements dans les espaces existants | `-X ignore-space-change` |
| Ignorer entièrement les espaces | `-X ignore-space-at-eol`, `-X ignore-all-space` |

Le cas pour lequel cela existe : une branche a réindenté un fichier (ou un
formateur l'a fait), l'autre a édité les mêmes lignes. Git voit deux modifications
sur une même ligne et s'arrête. Espaces ignorés, la réindentation n'est plus un
changement à peser, et la vraie modification passe.

Le résultat conserve les espaces de l'*autre* côté sur les lignes qu'il a
touchées : repasser un formateur juste après n'est donc pas une mauvaise idée.

## Ce qu'il faut enregistrer

| Choix | Option | Ce qu'il vous reste |
|--------|------|-----------------|
| Avance rapide quand c'est possible | — | Un commit de fusion seulement si l'histoire a divergé |
| Toujours créer un commit de fusion | `--no-ff` | Un commit de fusion même pour une avance rapide, pour que la branche reste visible à jamais dans le graphe |
| Avance rapide uniquement, sinon refus | `--ff-only` | Rien, si une vraie fusion était nécessaire. Utile comme garde-fou |
| Squash | `--squash` | Les changements indexés, aucune fusion enregistrée, le commit à vous d'écrire |
| Fusionner sans valider | `--no-commit` | La fusion indexée et en cours, pour que vous puissiez l'inspecter ou la retoucher d'abord |

**Squash et `--no-commit` ne sont pas la même chose.** Le squash oublie qu'une
fusion a eu lieu : git n'enregistre pas de second parent, et la branche paraîtra
non fusionnée la prochaine fois. `--no-commit` est une fusion en cours qui vous
attend simplement — `MERGE_HEAD` est positionné, et valider la termine
normalement.

**`--ff-only` n'échoue pas en silence.** Si un commit de fusion s'avérait
nécessaire, git refuse et rien ne bouge, ce qui en fait précisément un bon
contrôle de cohérence avant une fusion scriptée.

## Stratégie

| Stratégie | Pour |
|----------|-----|
| Par défaut (`ort`) | Tout. La fusion à trois points moderne de git |
| `subtree` | Les deux côtés vivent à des chemins différents — un projet embarqué dans un sous-répertoire de celui-ci |
| `resolve` | L'ancienne fusion à trois points. Réussit à l'occasion là où `ort` abandonne sur une histoire entrecroisée |

`-s subtree` est celle qui vaut la peine d'être retenue. Fusionner les mises à
jour d'un projet qui vit dans `vendor/parser/` se lirait sinon comme « tous les
fichiers supprimés, tous les fichiers ajoutés » ; la stratégie subtree calcule
d'abord le décalage de chemin. Voir [les sous-arbres](subtree.md) pour le flux
complet.

## Pourquoi ça entre en conflit

À l'intérieur du [résolveur de conflits](conflicts.md) se trouve un bouton
**Pourquoi ça entre en conflit**. Il exécute `git log --merge` pour le fichier
que vous avez sous les yeux et liste, par côté, les commits qui l'ont touché
depuis que les branches se sont séparées.

![Les commits de chaque côté ayant touché le fichier en conflit](../../screenshots/conflict-why.webp)

Les marqueurs de conflit disent *ce qui* s'oppose. Ceci dit *qui l'a modifié,
quand et pourquoi* — ce qui est généralement la question qui tranche réellement
la résolution, et la raison d'aller demander à quelqu'un avant de choisir un
côté.

S'il n'affiche rien, aucun des deux côtés n'a validé de changement sur ce fichier
précis : l'opposition vient d'un renommage ou d'un déplacement de répertoire plus
haut.

## Limites qu'il vaut mieux connaître

- **Les options valent pour une seule fusion.** Elles ne sont pas mémorisées, et
  elles ne changent ni l'entrée **Fusionner dans la branche courante** ordinaire
  ni le menu de glisser-déposer.
- **L'annulation fonctionne toujours** : une fusion lancée avec des options
  enregistre la même entrée d'annulation, qui réinitialise vers `ORIG_HEAD`.
- **Les fusions pieuvre** (plus de deux branches à la fois) ne sont pas proposées
  ici.
- **Les entrées « Fusionner X dans Y » par référence du menu de commit** restent
  des fusions ordinaires. Utilisez le badge de référence lui-même quand vous
  voulez les options.
- **`-X` décide en silence.** Rien n'indique quelles sections ont été résolues
  automatiquement : sur une fusion importante, lisez donc le diff après coup
  plutôt que de vous fier à l'absence de conflits.

Voir aussi : [Fusion et rebase](merging.md) · [Conflits](conflicts.md) ·
[Sous-arbres](subtree.md) · [Radar de conflits](conflict-radar.md)
