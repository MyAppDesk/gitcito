---
title: Attributs de fichiers
category: Outils de l'espace de travail
order: 96
summary: .gitattributes avec une interface — fins de ligne, binaires, changelogs fusionnés en union, export-ignore, et des diffs lisibles pour Word et PDF.
keywords: gitattributes attributs attributes pilote de diff diff driver textconv merge union binaire binary export-ignore eol crlf lf text auto filter clean smudge lfs linguist check-attr
---

# Attributs de fichiers

`.gitattributes` est le fichier le plus utile de git que presque personne
n'écrit. C'est par lui qu'un dépôt **apprend à git ce que contient le dépôt** :
quels fichiers sont binaires, lesquels doivent se concaténer plutôt qu'entrer en
conflit, lesquels ne partent jamais dans une archive, quelles fins de ligne tout
le monde reçoit.

Le point important : il est versionné. Une règle que vous ajoutez règle le
problème pour tous ceux qui clonent, sur tous les systèmes, pour toujours —
contrairement à un réglage dans votre propre configuration, qui le règle pour
vous et laisse vos collègues le découvrir à la dure.

`⌘K` → **Attributs de fichiers**.

![Les règles que porte déjà un dépôt, les préréglages, le vérificateur de chemin et les pilotes de diff](../../screenshots/attributes.webp)

## Ce que font les règles

| Attribut | Règle |
|-----------|-------|
| `text=auto eol=lf` | Des fins de ligne qui basculent selon qui a extrait le fichier |
| `binary` | Git qui essaie de differ ou de fusionner à trois points un PSD, un DOCX, un actif compilé |
| `merge=union` | Un changelog auquel tout le monde ajoute, et sur lequel tout le monde entre en conflit |
| `-merge` | Les fichiers où une fusion à trois points produit du n'importe quoi — fichiers de verrouillage, code généré |
| `export-ignore` | La configuration de CI et les fixtures livrées dans un tarball de release |
| `diff=<driver>` | Des diffs illisibles pour des formats qui *sont* lisibles, moyennant un convertisseur |
| `filter=lfs` | Les gros fichiers stockés via [LFS](lfs-sparse.md) |
| `linguist-vendored` | Du code embarqué compté comme le vôtre dans les statistiques de langages |

`binary` est un raccourci pour `-diff -merge -text`, soit trois réponses à
« arrête de deviner à propos de ce fichier » en un seul mot.

## Éditer

Les préréglages remplissent un motif et ses attributs ; modifiez le motif avant
d'ajouter — `CHANGELOG.md` est une suggestion, pas une règle sur votre projet.

**Les modifications sont chirurgicales.** Ajouter une règle pour un motif qui en
a déjà une réécrit cette ligne là où elle se trouve, plutôt que d'ajouter une
seconde règle qui l'emporte parce qu'elle vient après. Les commentaires du
fichier survivent intacts, parce que le « pourquoi » à côté d'une règle vaut
généralement plus que la règle.

Chaque enregistrement est une action Gitcito ordinaire : il affiche une
notification, et **Annuler** restaure le fichier exactement tel qu'il était.

**Un dépôt peut avoir plusieurs fichiers d'attributs.** Un à la racine, un dans
n'importe quel sous-répertoire, et un `.git/info/attributes` privé qui n'est
jamais versionné et ne s'applique que sur votre machine — l'endroit qui convient
à une règle qui parle de vous et non du projet. Gitcito les liste tous et dit
lequel est lequel.

## Qu'est-ce qui s'applique à un chemin ?

Les règles viennent de plusieurs fichiers, la plus spécifique l'emporte, et les
lire pour en déduire la réponse relève de la devinette. **Qu'est-ce qui s'applique
à un chemin ?** exécute `git check-attr` et montre ce que git lui-même conclut —
la seule réponse qui compte.

## Pilotes de diff : rendre un document Word lisible

Un `.docx` est un zip. Un `.pdf` est un graphe d'objets compressé. Git les diffe
pour ce qu'ils sont — du bruit — si bien que l'histoire d'un document est
illisible alors que le document, lui, ne l'est pas.

Un **pilote de diff** règle cela avec `textconv` : une commande qui transforme le
fichier en texte *pour le diff uniquement*. Le fichier dans votre copie de
travail n'est pas touché ; git compare simplement le texte converti.

Deux moitiés, et les deux sont nécessaires :

1. `diff.<name>.textconv` dans la configuration git — la commande de conversion.
2. `*.docx diff=<name>` dans `.gitattributes` — les fichiers auxquels elle
   s'applique.

Les boutons d'ici font les deux d'un coup. Gitcito **ne livre aucun de ces
convertisseurs** et ne prétend pas le contraire : il inspecte votre PATH et ne
propose que ce qui est réellement installé, grisant le reste avec le binaire qui
lui manquerait.

| Pilote | Exige | Vous donne |
|--------|-------|-----------|
| `word` | `pandoc` | Des diffs en prose des `.docx` |
| `pdf` | `pdftotext` (poppler) | Des diffs textuels des `.pdf` |
| `excel` | `xlsx2csv` | Des diffs ligne à ligne des tableurs |
| `exif` | `exiftool` | Ce qui a changé sur une image, quand les pixels sont opaques |
| `json` | `jq` | Des diffs JSON stables, à clés triées |

La moitié « convertisseur » vit dans **votre** configuration, pas dans le dépôt —
git n'exécutera pas des commandes qu'un clone lui tend, ce qui est une propriété
de sécurité qu'il vaut mieux conserver. Un coéquipier qui clone reçoit donc la
règle `diff=word` et, tant qu'il n'a pas installé pandoc, l'ancien diff
illisible. Dites-le dans votre README.

## Limites qu'il vaut mieux connaître

- **Les filtres clean/smudge ne sont pas proposés ici.** Les règles
  `filter=<name>` peuvent s'écrire à la main, mais Gitcito ne configurera pas les
  commandes : un filtre s'exécute à chaque extraction de chaque fichier
  correspondant, et un mauvais filtre corrompt silencieusement votre copie de
  travail.
- **`text=auto` change ce qui est validé**, en normalisant les fins de ligne à
  l'entrée. Sur un dépôt existant, ajoutez-le puis exécutez délibérément
  `git add --renormalize .`, dans un commit à part.
- **Les attributs ne s'appliquent pas rétroactivement.** Marquer un fichier
  `binary` aujourd'hui ne change pas la façon dont ses diffs passés ont été
  stockés ; cela change la façon dont git le traite à partir de maintenant.
- **Les règles ne prennent effet que là où le fichier est visible.** Une règle
  dans `design/.gitattributes` ne dit rien de `src/`.
- Gitcito écrit des fichiers entiers : un fichier mis en forme à la main revient
  donc avec sa mise en forme — mais une règle que Gitcito réécrit est reformatée
  selon l'espacement canonique de git, `motif attr attr`.

Voir aussi : [LFS et sparse-checkout](lfs-sparse.md) ·
[Bundles et archives](export.md) · [Options de fusion](merge-options.md) ·
[Hooks](hooks.md)
