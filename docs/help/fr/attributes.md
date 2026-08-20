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

Les boutons d'ici font les deux d'un coup. Pour Word, Excel et JSON, Gitcito
**livre lui-même le convertisseur** — la même analyse de documents que ses
aperçus utilisent, exposée comme une petite commande `gitcito-textconv` dans
l'app — si bien que ces trois-là fonctionnent sans rien installer. Les autres
exigent toujours un vrai outil dans votre PATH : Gitcito vérifie et grise ce
qui manque plutôt que d'écrire un pilote qui échoue au premier diff.

| Pilote | Exige | Vous donne |
|--------|-------|-----------|
| `word` | rien — livré avec Gitcito | Des diffs en prose des `.docx` |
| `excel` | rien — livré avec Gitcito | Des diffs ligne à ligne (CSV par feuille) des `.xlsx`/`.xls` |
| `json` | rien — livré avec Gitcito | Des diffs JSON stables, à clés triées |
| `pdf` | `pdftotext` (poppler) | Des diffs textuels des `.pdf` |
| `exif` | `exiftool` | Ce qui a changé sur une image, quand les pixels sont opaques |

Les limites du convertisseur embarqué, dites franchement : `.doc` (l'ancien
format binaire de Word) n'est pas compris, seulement `.docx` ; le PDF n'est pas
couvert — Gitcito prévisualise les PDF avec le lecteur du navigateur et n'a pas
d'extracteur de texte à réutiliser ; et chaque diff d'un document paie un bref
coût de démarrage du convertisseur. Avec
`git config diff.<name>.cachetextconv true`, git met la sortie en cache par
blob.

La moitié « convertisseur » vit dans **votre** configuration, pas dans le dépôt —
git n'exécutera pas des commandes qu'un clone lui tend, ce qui est une propriété
de sécurité qu'il vaut mieux conserver. Les pilotes embarqués pointent en outre
vers *votre* chemin d'installation de Gitcito : un coéquipier qui clone reçoit
donc la règle `diff=word` et, tant qu'il n'a pas branché son propre
convertisseur (Gitcito ou autre), l'ancien diff illisible. Dites-le dans votre
README.

## Filtres clean/smudge — avec un essai à blanc d'abord

Un **filtre** réécrit le contenu à l'entrée et à la sortie du dépôt : `clean`
s'exécute à l'indexation (copie de travail → dépôt), `smudge` à l'extraction
(dépôt → copie de travail). C'est ainsi que fonctionne git-lfs, et ainsi que
des équipes retirent des identifiants ou du bruit généré de ce qui est validé.

C'est aussi la chose la plus dangereuse que `.gitattributes` puisse désigner :
un filtre s'exécute à **chaque extraction de chaque fichier correspondant**, et
un mauvais filtre corrompt silencieusement votre copie de travail. Gitcito
refuse donc d'être ici une simple zone de texte. Configurer un filtre
passe par un **essai à blanc** contre de vrais fichiers correspondants de votre
dépôt :

1. La commande `clean` s'exécute sur une copie de chaque fichier correspondant
   (jusqu'à cinq) — rien dans le dépôt ni dans sa configuration n'est touché.
2. Si une commande `smudge` est donnée, elle s'exécute sur la sortie nettoyée
   et le résultat est comparé octet par octet à l'original — la **vérification
   aller-retour**. Un filtre qui ne fait pas l'aller-retour signifie qu'une
   extraction ne restaurera pas ce que vous aviez.
3. Ce n'est qu'après un essai à blanc sur exactement les valeurs que vous
   enregistrez que le bouton d'enregistrement s'active. Un essai qui a échoué —
   erreur de commande, aucun fichier correspondant, ou un aller-retour qui
   diffère — peut tout de même être enregistré, mais seulement via un
   avertissement explicite qui dit ce qui peut être perdu.

Enregistrer écrit `filter.<name>.clean/smudge` dans votre configuration git
**locale** et la règle `filter=<name>` dans le fichier d'attributs, et laisse
une entrée d'annulation qui restaure ce que la configuration contenait
auparavant. L'interrupteur **required** définit `filter.<name>.required`, avec
lequel git fait échouer l'opération au lieu de laisser passer silencieusement
les fichiers quand le filtre casse.

Les limites, dites franchement : l'essai à blanc échantillonne jusqu'à cinq
fichiers correspondants d'au plus 5 Mo chacun, avec un délai de 10 secondes par
commande — un filtre qui se comporte bien sur l'échantillon peut encore mal se
comporter sur un fichier que l'échantillon a manqué. Les commandes vivent dans
*votre* configuration : un coéquipier qui clone reçoit donc la règle
`filter=<name>` mais pas les commandes ; sans elles (et sans **required**), ses
fichiers passent inchangés.

## Limites qu'il vaut mieux connaître

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
