---
title: TODOs du code
category: Outils d’espace de travail
order: 93
summary: Chaque TODO, FIXME et HACK que porte le code, groupés par étiquette, par responsable ou par dossier.
keywords: todo todos fixme hack xxx note marqueur marqueurs commentaire commentaires arbre étiquette responsable assigné cgm dette technique grep analyse
---

# TODOs du code

Un TODO est une promesse que quelqu’un s’est faite à lui-même, puis a perdue. Il
s’écrit là où est le problème, c’est-à-dire exactement là où personne ne
regarde plus, et quand il devient important, celui qui l’a écrit a changé
d’équipe. Grep les trouve, et mille lignes de sortie de grep équivalent à ne pas
les trouver.

L’onglet **TODOs** du dock d’analyse les lit tous, puis fait ce que grep ne sait
pas faire : il les groupe. Ouvrez le dock depuis la barre d’état ou la palette de
commandes (`TODOs du code`) et passez au second onglet.

La barre d’état compte les marqueurs à côté des erreurs et avertissements des
analyseurs ; cliquer ce compteur ouvre cet onglet.

![L’onglet TODOs, groupé par responsable](../../screenshots/code-todos.webp)

## Ce qui compte comme marqueur

Une étiquette, dans un commentaire, dans un fichier que Git suit ou suivrait :

| Écrit | Lu comme |
|-------|----------|
| `// TODO: livrer ça` | étiquette `TODO`, sans responsable |
| `//todo livrer ça` | pareil — les deux-points et l’espace sont facultatifs |
| `# todo livrer ça` | pareil — ni la casse ni le langage ne comptent |
| `/* TODO(cgm): livrer ça */` | étiquette `TODO`, responsable `cgm` |
| `-- TODO (CGM) livrer ça` | le même responsable : `cgm`, `(CGM)` et `[cgm]` sont une seule personne |
| `<!-- TODO: @cgm livrer ça -->` | encore la même chose |

Les étiquettes sont `TODO`, `FIXME`, `BUG`, `HACK`, `XXX`, `NOTE`, `OPTIMIZE`,
`REVIEW`, `REFACTOR`, `DEPRECATED`, `QUESTION`, `IDEA`, `WIP` et `TEMP`. Les
quatre premières sont colorées, parce que « c’est cassé » et « c’est une idée que
j’ai eue » ne devraient pas se ressembler dans une liste.

L’étiquette doit suivre un début de commentaire — `//`, `#`, `--`, `;`, `%`,
`/*`, `*`, `<!--`, `"""`. Rien d’autre ne compte : `todo = [l for l in lines]`
est du code, et un panneau qui compte une affectation de variable comme de la
dette est un panneau auquel on ne se fie pas deux fois. La même règle tient une
fonction nommée `reviewNotes` hors de la liste.

## Le groupement, c’est la fonctionnalité

Quatre axes, un clic chacun :

| Grouper par | Répond à |
|-------------|----------|
| **Étiquette** | Quelle sorte de dette ce dépôt traîne-t-il ? |
| **Responsable** | Qu’a laissé chacun — et que contient le tas non attribué ? |
| **Dossier** | Quel coin de l’arbre est en train de pourrir ? |
| **Fichier** | La liste ordinaire, quand vous savez déjà où vous allez. |

**Non attribué** est un vrai groupe, pas un reliquat : les marqueurs sur lesquels
personne n’a mis son nom sont ceux que personne ne reprend jamais, et les voir
comptés est précisément l’intérêt.

Les pastilles d’étiquette en haut filtrent la liste ; cliquer le badge de
responsable sur une ligne aussi, tout comme la recherche, qui porte sur le
message, le fichier, l’étiquette et le responsable. **Modifiés seulement**
restreint aux fichiers que vous avez édités sans les valider — la dernière
vérification avant un push, quand un `// FIXME` laissé il y a une heure est sur
le point de devenir définitif.

Cliquer une ligne ouvre le fichier à la ligne concernée.

## Ce qu’il ne fait pas

- **Il lit, il n’écrit jamais.** Pas de « marquer comme fait » : la façon de
  fermer un TODO est de supprimer la ligne et de valider. Pour une liste que
  Gitcito garde pour vous, voyez [todos](todos.md), qui est tout autre chose :
  des notes privées qui vivent dans l’application, pas dans le code.
- **Les fichiers ignorés sont sautés**, `node_modules` compris, quoi que disent
  les étiquettes à l’intérieur. Les fichiers non suivis, eux, sont inclus : un
  marqueur écrit il y a cinq minutes est celui qu’il vaut le plus la peine de
  voir.
- **Il ne distingue pas un commentaire d’une chaîne.** Une ligne
  `const banner = "// TODO"` est un marqueur pour l’analyse. Il n’a pas
  d’analyseur syntaxique pour quarante langages et ne prétend pas en avoir un.
- **L’analyse est un instantané.** Modifiez un fichier et le panneau garde les
  chiffres qu’il avait jusqu’à la prochaine analyse ; le bouton d’actualisation
  est toute l’histoire.
- **Il s’arrête à 5 000 marqueurs.** Un dépôt au-delà a un problème de dette
  qu’aucun panneau ne résoudra.

## Où il s’exécute

Un seul `git grep` sur l’arbre de travail, d’où des millisecondes là où l’onglet
[Problèmes](problems.md) prend des secondes : rien n’est compilé, aucune chaîne
d’outils n’intervient, et la recherche saute les binaires et les chemins ignorés
parce que Git sait déjà lesquels ce sont.
