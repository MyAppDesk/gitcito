---
title: Sous-arbres
category: Branches et chirurgie
order: 49
summary: Embarquer un autre dépôt dans un répertoire de celui-ci — des fichiers réellement présents, sans la cérémonie des sous-modules.
keywords: sous-arbre subtree git subtree embarquer vendor bibliothèque library prefix préfixe split squash monorepo sous-module submodule alternative pull push
---

# Sous-arbres

Un sous-arbre copie un autre dépôt dans un répertoire du vôtre. Après cela, les
fichiers sont **réellement là** : un simple `git clone` les récupère, `git
checkout` les déplace comme n'importe quel autre fichier, et personne n'a besoin
de savoir que le répertoire vient d'ailleurs.

C'est toute la différence avec un [sous-module](lfs-sparse.md), qui ne stocke
qu'un pointeur et réclame `--recurse-submodules`, sa propre extraction et son
propre HEAD détaché à tenir droit.

`⌘K` → **Sous-arbres**.

![Un répertoire embarqué retrouvé dans l'historique, avec la source que Gitcito lui associe](../../screenshots/subtree.webp)

## Le piège dont personne ne parle

**Git n'enregistre aucun manifeste pour les sous-arbres.** Un sous-module a
`.gitmodules`, qui liste chaque URL et chaque chemin. Un sous-arbre n'a rien —
seulement une ligne `git-subtree-dir:` sur le commit qui a fait l'import.

Un dépôt peut donc contenir un sous-arbre sans vous donner le moindre moyen de
savoir d'où il vient. Gitcito fait ce qu'il peut :

- La liste est découverte depuis l'historique, en lisant ces lignes. N'importe
  quel sous-arbre ajouté par n'importe qui, avec n'importe quel outil, apparaît.
- Le **dépôt source et la référence** sont mémorisés par Gitcito, dans la
  configuration git de ce dépôt. Un sous-arbre découvert depuis l'historique
  démarre avec ces champs vides — remplissez-les une fois et pull et push
  fonctionnent à partir de là.

Les valeurs mémorisées vivent sous `gitcito.subtree.*` dans `.git/config` : elles
restent donc avec le dépôt mais ne voyagent pas vers un clone. **Oublier** les
efface et ne touche à rien d'autre.

## En ajouter un

| Champ | Signification |
|-------|---------|
| Répertoire | Où il atterrit, p. ex. `vendor/parser`. Ne doit pas exister encore |
| Dépôt source | Une URL ou un chemin sur le disque |
| Branche ou étiquette | Ce qu'il faut importer |
| Squash | Le faire entrer en un seul commit au lieu de tout son historique |

**Laissez Squash activé** sauf raison contraire. Sans lui, chaque commit de la
bibliothèque est entrelacé dans votre journal pour toujours, et `git log` cesse
de parler de votre projet.

## Vivre avec

| Action | Ce qu'elle exécute |
|--------|--------------|
| **Pull** | `git subtree pull` — les changements amont arrivent sous forme de fusion dans votre répertoire |
| **Push** | `git subtree push` — vos changements locaux sous ce répertoire repartent vers la source |
| **Split** | `git subtree split -b <branch>` — extrait l'historique propre au répertoire dans une branche, avec les fichiers à sa racine |

**Split** est celui qu'il vaut la peine de connaître : il retransforme un
répertoire embarqué en l'historique d'un dépôt autonome, ce qui est la façon dont
un sous-arbre cesse d'être un sous-arbre.

## Limites qu'il vaut mieux connaître

- **Le push est lent.** Il recalcule l'historique du répertoire à partir de zéro
  à chaque fois. Sur un gros dépôt, cela va de quelques secondes à quelques
  minutes, pas de l'instantané, et Gitcito ne peut que l'attendre.
- **Un pull est une fusion**, il peut donc entrer en conflit comme n'importe
  quelle fusion — vous atterrissez dans [le résolveur](conflicts.md).
- **`git subtree` est un script contrib**, pas une commande intégrée de git. Une
  installation de git allégée peut ne pas l'avoir ; Gitcito le dit clairement
  plutôt que de vous répercuter « 'subtree' is not a git command ».
- **Un historique squashé ne peut pas être dé-squashé** plus tard. Les commits
  n'ont jamais été importés.
- Gitcito ne convertit pas un sous-module en sous-arbre, ni l'inverse.

Voir aussi : [Fusion et rebase](merging.md) · [La plomberie avec une interface](lfs-sparse.md)
