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

Les trois panneaux se redimensionnent, et l'en-tête de la sortie porte deux
bascules d'affichage :

| Bascule | Ce qu'elle fait |
|---|---|
| **Retour à la ligne** | Coupe les lignes longues dans les panneaux A et B au lieu de les faire défiler. Le panneau de sortie garde une rangée par ligne — ses marqueurs latéraux en dépendent — donc il défile toujours |
| **Lié** | Fait défiler A, B et la sortie ensemble, verticalement et latéralement. Leurs nombres de lignes diffèrent, donc la position verticale est alignée par proportion |

Le retour à la ligne démarre désactivé, Lié démarre activé, et les deux
retiennent leur état.

## Se déplacer

Ouvrir un fichier vous amène sur son **premier conflit**, pas en haut du
fichier. Les flèches ⌃ / ⌄ de l'en-tête de la sortie — ou <kbd>Alt+↑</kbd> /
<kbd>Alt+↓</kbd> — parcourent les suivants, en faisant défiler les trois
panneaux jusqu'à chacun.

## Choisir

Par **ligne**, par **bloc**, ou le **côté entier** d'un coup — et vous pouvez
prendre les deux côtés d'un bloc quand la réponse est « garder les deux ». Un
navigateur conflit par conflit vous fait passer en revue ce qui reste, pour que
vous ne puissiez pas laisser un marqueur derrière vous par accident.

## Assistance IA

Avec l'IA activée, **Résoudre avec l'IA** propose une fusion dans le panneau de
sortie. Elle n'applique jamais rien d'elle-même : vous la lisez, l'éditez et
l'indexez. Voir [Fonctions IA](ai.md).

## Fichiers de projet Xcode

`project.pbxproj` entre en conflit plus que tout autre fichier d'un dépôt iOS,
et presque jamais parce que quelqu'un aurait été en désaccord. C'est un
dictionnaire plat d'objets indexés par des identifiants de 24 caractères
hexadécimaux : ajouter un fichier écrit donc quatre entrées — un `PBXBuildFile`,
un `PBXFileReference`, une ligne dans les `children` du groupe qui le contient,
une ligne dans la phase de compilation de la cible. Deux personnes qui ajoutent
un fichier chacune écrivent huit entrées qui tombent sur les mêmes quelques
lignes. Git voit une collision ; il n'y a rien à résoudre.

Quand le fichier en conflit est un `project.pbxproj`, le résolveur lit les trois
versions comme des projets plutôt que comme du texte et propose de **fusionner
par structure** : apparier les objets par identifiant, prendre tous les ajouts
des deux côtés, unir les tableaux `children` et `files`, et s'arrêter sur ce qui
a réellement divergé. Le bandeau au-dessus des panneaux indique ce que chaque
côté a ajouté et ce qui — le cas échéant — vous reste à trancher.

Comme la proposition de l'IA, elle atterrit dans le panneau de sortie et
n'indexe rien. Vous la relisez avant d'enregistrer.

![Le bandeau de fusion structurelle au-dessus des panneaux de conflit, sur un fichier de projet Xcode](../../screenshots/conflict-pbxproj.webp)

### Ce qu'elle refuse de faire

**Elle ne devine jamais un réglage que vous avez tous les deux déplacé.** Si
vous mettez `MARKETING_VERSION` à `1.1` et eux à `2.0`, c'est une décision,
nommée dans le bandeau — le réglage, votre valeur, la leur — plutôt que réglée
dans votre dos. Un objet qu'elle n'a pas pu trancher conserve *votre* version à
l'identique : une fusion à moitié appliquée n'atteint jamais le disque.

**Elle refuse le fichier entier si l'une des trois versions ne s'analyse pas.**
Un `project.pbxproj` que Xcode ne peut pas ouvrir coûte plus cher qu'une fusion
manuelle ; tout ce qu'elle ne peut pas lire avec certitude reste donc un conflit
de texte ordinaire, et elle le dit.

**Elle ne détecte pas deux identifiants créés pour des objets différents.**
C'est rare, Xcode les tirant au hasard — mais quand cela arrive, prendre l'un ou
l'autre côté supprimerait silencieusement le fichier de quelqu'un : c'est donc
signalé plutôt que fusionné.

### Pas `merge=union`

Le remède qui circule pour cela est `*.pbxproj merge=union` dans
[`.gitattributes`](attributes.md). À éviter. L'union fonctionne tant que les
seuls changements sont des ajouts indépendants ; dès que deux personnes
modifient le même réglage de compilation, elle émet les deux lignes et produit
un fichier que Xcode refuse d'ouvrir — au moment précis où vous avez le moins de
chances de relire le diff attentivement. La fusion structurelle offre le même
confort sans cette défaillance.

## Fichiers de verrouillage

`Podfile.lock`, `Package.resolved`, `yarn.lock` et leurs cousins enregistrent un
graphe de dépendances que le résolveur de quelqu'un a déjà résolu. La moitié
d'une solution cousue à la moitié d'une autre est un graphe que personne n'a
résolu : il peut ne pas s'installer, et s'il s'installe, il installe quelque
chose qu'aucune des deux branches n'a testé.

Aussi, quand le fichier en conflit est un lockfile, le bandeau nomme l'outil qui
le gouverne, propose **Garder les nôtres** et **Garder les leurs** sur place, et
vous donne la commande qui le régénère ensuite. Prendre un côté n'est pas un
compromis ici — c'est toute la méthode, et c'est la régénération qui la rend
correcte.

![Le bandeau de lockfile au-dessus des panneaux de conflit](../../screenshots/conflict-lockfile.webp)

Les trois panneaux restent disponibles, car de temps à autre vous voulez lire ce
qui a changé : une somme de contrôle que vous reconnaissez, une version que vous
attendiez. C'est de les modifier à la main que ceci cherche à vous dissuader.

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
