---
title: Résoudre les conflits
category: Travailler sur les changements
order: 32
summary: Un résolveur à trois panneaux qui vous dit quel côté est lequel.
keywords: conflit conflict résolveur resolver fusion merge conflits ours theirs nôtre leur résoudre resolve marqueurs markers three-way rerere réutiliser résolution enregistrée mémoriser rejouer
---

# Résoudre les conflits

Quand une fusion, un rebase, un cherry-pick ou un revert s'arrête, une bannière
vous dit **ce qui** s'est arrêté et **entre quoi** — « fusion de `feature/x` dans
`main` », et pas simplement « conflit ».

![Le résolveur de conflits](../../screenshots/conflict-resolver.webp)

## Pourquoi ça entre en conflit

**Pourquoi ça entre en conflit**, dans l'en-tête, liste par côté les commits qui
ont touché ce fichier depuis que les branches se sont séparées — c'est
`git log --merge`, que git livre depuis toujours et que personne ne trouve.

![Les commits de chaque côté ayant touché le fichier en conflit](../../screenshots/conflict-why.webp)

Les marqueurs disent ce qui s'oppose. Ceci dit qui l'a modifié et pourquoi, ce
qui est généralement ce qui tranche réellement la résolution. Une liste vide
signifie qu'aucun des deux côtés n'a validé de changement sur ce chemin exact —
l'opposition vient d'un renommage ou d'un déplacement.

## Les trois panneaux

| Panneau | C'est |
|---|---|
| Gauche | **Le nôtre** — le côté où vous étiez, étiqueté avec son commit |
| Droite | **Le leur** — le côté qui arrive, étiqueté avec son commit |
| Milieu | La **sortie** : éditable, numérotée, et c'est elle qui est réellement indexée |

Les trois panneaux se redimensionnent.

## Choisir

Par **ligne**, par **bloc**, ou le **côté entier** d'un coup — et vous pouvez
prendre les deux côtés d'un bloc quand la réponse est « garder les deux ». Un
navigateur conflit par conflit vous fait passer en revue ce qui reste, pour que
vous ne puissiez pas laisser un marqueur derrière vous par accident.

## Assistance IA

Avec l'IA activée, **Résoudre avec l'IA** propose une fusion dans le panneau de
sortie. Elle n'applique jamais rien d'elle-même : vous la lisez, l'éditez et
l'indexez. Voir [Fonctions IA](ai.md).

## Les éviter en amont

Le [radar de conflits](conflict-radar.md) vous dit quelles branches vont entrer
en conflit avant que vous n'en fusionniez aucune.

## Laisser git se souvenir (rerere)

Rebasez une branche de longue durée et vous rencontrez le même conflit à chaque
fois. `rerere` — *reuse recorded resolution* — est la réponse de git : il
mémorise comment vous avez tranché un conflit et rejoue cette réponse la
prochaine fois que le conflit identique se présente.

**Réglages → Général → Mémoriser les résolutions de conflits.** Cela écrit
`rerere.enabled` dans votre configuration git globale : la ligne de commande se
comporte donc de la même façon.

Quand git a répondu à votre place, le résolveur le dit au lieu d'afficher un
écran vide « aucun marqueur de conflit », et propose **Oublier cette résolution**
— ce qui efface la mémoire *et* fait revenir le conflit, pour que vous puissiez
le trancher autrement.

Deux choses à savoir :

- **Une résolution rejouée n'est pas indexée**, sauf si vous activez *Indexer
  automatiquement une résolution rejouée*. Laissez cela désactivé : tout
  l'intérêt de la pause est qu'une réponse mémorisée peut être fausse pour cette
  fusion-ci, et indexer sans regarder est exactement la façon dont elle atteint
  un commit.

  C'est pourquoi un fichier rejoué **reste dans les fichiers en conflit** : git a
  écrit le contenu, mais l'index le tient toujours pour non fusionné, et seule
  l'indexation règle cela. **Indexer tel quel** dans le résolveur, ou **Tout
  marquer comme résolu** dans la liste, est ce qui le déplace.
- **rerere ne comprend pas tous les conflits.** Les conflits ajout/ajout et
  suppression/modification n'obtiennent pas de préimage : ils reviennent donc
  toujours bruts. Le compteur dans les réglages indique combien il en détient
  réellement, et **Tout oublier** le vide.

**Voir aussi :** [Radar de conflits](conflict-radar.md) · [Fusion et rebase](merging.md)
