---
title: Explorateur d'objets
category: Dépôt et historique
order: 16
summary: Parcourir la couche sous le graphe — commits, arbres, blobs, étiquettes et les références qui pointent vers eux. Rien ici ne modifie quoi que ce soit.
keywords: objets objects explorateur explorer blob arbre tree commit étiquette tag ref référence plomberie plumbing cat-file ls-tree sha1 internes internals base de données rev-parse HEAD^{tree} loose packed
---

# Explorateur d'objets

Git a la réputation d'être compliqué. Presque tout vient du fait qu'on ne voit
jamais le modèle : **quatre sortes d'objets, et des pointeurs**. Dès que vous
pouvez cliquer un commit, atterrir sur son arbre, et découvrir que votre fichier
*est* un blob à qui un arbre a donné un nom, la porcelaine cesse d'être magique.

`⌘K` → **Explorateur d'objets**. Rien sur cette page ne peut changer un octet —
chaque appel derrière elle est une lecture.

![Les champs d'un commit, avec son arbre et ses parents en liens, à côté de la liste des références](../../screenshots/objects.webp)

## Les quatre objets

| Objet | C'est | Il connaît |
|--------|----|-------|
| **blob** | Le *contenu* d'un fichier | Rien. Ni son nom, ni son chemin, ni son histoire |
| **tree** | Un listing de répertoire | Les noms, les modes, et le sha de chaque blob ou arbre enfant |
| **commit** | Un instantané | Son arbre, ses parents, l'auteur, le validateur, le message |
| **tag** | Une étiquette annotée | L'objet vers lequel elle pointe, l'étiqueteur, un message |

La surprise, pour la plupart des gens, c'est la première ligne. **Un blob n'a pas
de nom.** Deux fichiers de contenu identique, n'importe où dans votre historique,
sont le même blob, stocké une seule fois. Le nom vit dans l'arbre qui pointe vers
lui — c'est pourquoi git suit du contenu plutôt que des fichiers, et pourquoi les
renommages sont détectés plutôt qu'enregistrés.

Une **référence** — `refs/heads/main`, `refs/tags/v1.0`, `HEAD` — n'est qu'un
fichier contenant un sha. Voilà tout ce que veut dire « brancher ne coûte rien ».

## Se promener

La colonne de gauche liste toutes les références du dépôt, groupées comme git les
groupe. Cliquez-en une pour atterrir sur l'objet qu'elle nomme.

À partir de là, tout est un lien :

- Un **commit** montre son `tree` et chaque `parent` — cliquez pour aller vers
  l'instantané, ou vers l'arrière dans l'histoire, un commit à la fois.
- Un **arbre** liste ses entrées avec mode, type, sha et taille. Cliquez un nom
  pour ouvrir cet enfant.
- Un **blob** montre son texte (le début, pour tout ce qui est volumineux), ou le
  dit franchement quand il est binaire.
- Une **étiquette annotée** montre ce vers quoi elle pointe — cliquez pour aller
  au commit.

**Retour** refait vos pas en sens inverse.

## Taper une révision

Le champ accepte tout ce qu'accepte `git rev-parse`, et c'est là que l'outil
cesse d'être un navigateur pour devenir une façon d'apprendre :

| Tapez ceci | Pour obtenir |
|-----------|--------|
| `HEAD` | Le commit courant |
| `HEAD~3` | Trois commits en arrière |
| `HEAD^{tree}` | L'arbre de ce commit, pelé |
| `HEAD:src/app.ts` | Le blob de ce chemin, directement |
| `v1.0^{}` | Ce vers quoi pointe une étiquette annotée, plutôt que l'objet étiquette |
| `a1b2c3d` | N'importe quel objet, par son sha — les abréviations fonctionnent |

Les chiffres de mode dans un listing d'arbre valent la peine d'être connus :
`100644` un fichier, `100755` un exécutable, `040000` un sous-arbre, `120000` un
lien symbolique, `160000` un gitlink de sous-module — ce dernier étant la
totalité de ce qu'un sous-module stocke.

## Limites qu'il vaut mieux connaître

- **En lecture seule, à dessein.** Il n'y a rien ici pour écrire. Fabriquer des
  objets à la main est un exercice de `git hash-object`, et sa place est dans un
  terminal.
- **Les gros blobs sont tronqués** après les 200 premiers Ko — assez pour voir de
  quoi il s'agit, pas assez pour figer la fenêtre.
- **Les tailles sont la taille du contenu de l'objet** telle que la rapporte
  `git cat-file -s`, pas ce qu'il coûte sur le disque après empaquetage. Pour
  cela, voir [la maintenance](maintenance.md).
- **Les objets inatteignables restent des objets.** Collez un sha issu d'un
  rapport `git fsck` sur les objets pendants et il s'ouvre, ce qui est souvent la
  façon la plus rapide de voir ce que contenait un commit perdu avant de décider
  s'il faut le récupérer.

Voir aussi : [Le graphe](graph.md) · [Maintenance du dépôt](maintenance.md) ·
[Récupération](recovery.md)
