---
title: Règles du dépôt (.gitcito.json)
category: Outils de l'espace de travail
order: 98
summary: Les règles de la maison que le dépôt emporte avec lui — branches protégées, portées de commit, ce dont un clone a besoin et une liste avant de pousser.
keywords: gitcito.json configuration du dépôt règles doctor prérequis branches protégées portées scopes trailers ticket liens vers le tracker checklist onboarding hooksPath node sous-modules lfs env example
---

# Règles du dépôt (`.gitcito.json`)

Tout projet transporte des règles que le code ne laisse pas deviner. *Ne jamais
pousser directement sur `release/*`.* *Les portées de commit sont `api`, `web` et
`infra`, et rien d'autre.* *Il faut Node 20, les sous-modules initialisés et un
`.env` copié depuis `.env.example` avant que quoi que ce soit démarre.* Ces
règles vivent dans un README que personne ne relit, dans un échec de CI, ou dans
la tête de la personne présente depuis le plus longtemps.

`.gitcito.json` est l'endroit où le dépôt les écrit pour que l'outil puisse s'en
servir. Il se trouve à la racine du dépôt, il est versionné comme n'importe quel
fichier et voyage donc avec le clone : toute personne qui ouvre le projet reçoit
les mêmes règles, et un nouvel arrivant les obtient dès le premier jour plutôt
qu'au premier push refusé.

Le fichier est entièrement facultatif. Un dépôt sans lui se comporte exactement
comme avant.

![L'onglet Config du dépôt, avec les lignes du doctor et les sections de règles](../../screenshots/repo-config.webp)

## Où l'éditer

La roue dentée à côté des outils de la barre → **Config**. Cet éditeur écrit le
fichier dans votre copie de travail ; il n'est enregistré nulle part ailleurs,
alors **committez-le** pour partager les règles avec l'équipe.

Si le dépôt n'en a pas, **Lire le dépôt** en propose un à partir de ce qui existe
déjà : un `.nvmrc` ou `engines.node`, un `.gitmodules`, `filter=lfs` dans
`.gitattributes`, un `.env.example` sans `.env` à côté, les branches que vous
protégez déjà localement, et les portées utilisées par les 500 derniers sujets de
commit. Rien n'est écrit avant l'enregistrement. Depuis un terminal,
`gitcito config init` fait la même chose (voir [la ligne de commande](cli.md)).

## Ce que le fichier peut dire

```json
{
  "version": 1,
  "protect": ["main", "release/*"],
  "links": {
    "tickets": [
      { "match": "\\b[A-Z][A-Z0-9]+-\\d+\\b", "url": "https://tracker.example.com/browse/$0", "label": "Jira" }
    ]
  },
  "commit": {
    "scopes": ["api", "web", "infra"],
    "ticketFromBranch": true,
    "trailers": ["Refs: {ticket}"]
  },
  "requires": {
    "node": ">=20",
    "hooksPath": ".husky",
    "submodules": true,
    "lfs": true,
    "files": [{ "path": ".env", "from": ".env.example", "why": "URL de base de l'API et un jeton de dev" }]
  },
  "checklist": {
    "push": ["Passer la suite d'intégration sur la préproduction"]
  }
}
```

| Champ | Ce qu'il fait |
|---|---|
| `version` | Doit valoir `1`. Un fichier d'un schéma plus récent est ignoré en entier plutôt que deviné. |
| `protect` | Des noms de branches, `*` correspondant à n'importe quelle suite de caractères. **Ajoutés** aux branches que vous protégez localement — voir [branches protégées](repo-settings.md). |
| `links.tickets` | Une expression régulière et un gabarit d'URL. `$0` est la correspondance entière, `$1`…`$9` ses groupes. Les correspondances dans les sujets et corps de commit deviennent des liens. |
| `commit.scopes` | Les portées que le compositeur propose, à la place d'un champ libre. Les déclarer transforme aussi une portée inconnue d'un conseil de style en erreur dans `gitcito commit-check`. |
| `commit.ticketFromBranch` | Remplit la clé de ticket depuis le nom de branche (`feature/ABC-123-truc` → `ABC-123`) — mais seulement dans un compositeur vide, jamais par-dessus ce que vous écrivez. |
| `commit.trailers` | Lignes ajoutées au corps du commit. `{ticket}` et `{branch}` sont remplis ; une ligne dont l'emplacement n'a rien à recevoir est abandonnée plutôt qu'écrite à moitié. |
| `requires.*` | Ce dont un clone fonctionnel a besoin. Chaque entrée devient une ligne du doctor, ci-dessous. |
| `checklist.push` | Texte libre affiché une fois par session, avant le premier push. |

## Le doctor

`requires` est la partie qui répond à *« je l'ai cloné et ça ne démarre pas »*.
Gitcito le vérifie à l'ouverture du dépôt et affiche une pastille stéthoscope
dans la barre d'état quand quelque chose cloche. Un clic sur la pastille ouvre
l'onglet Config sur les lignes du doctor ; **Revérifier** les relance.

| Vérification | Passe quand | Réparée par |
|---|---|---|
| `node` | Le `node` de votre PATH satisfait la spécification | — |
| `submodules` | Aucun sous-module n'est sans checkout | `git submodule update --init --recursive` |
| `lfs` | git-lfs est installé et les fichiers suivis sont du vrai contenu, pas du texte de pointeur | `git lfs pull` |
| `hooksPath` | `core.hooksPath` correspond au chemin déclaré | définir `core.hooksPath` |
| `files` | Le fichier existe | le copier depuis `from`, s'il existe |

Deux limites volontaires. Un **avertissement** ne veut jamais dire « cassé » : il
veut dire que le doctor n'a pas pu trancher (une spécification Node illisible
passe plutôt que d'inventer un échec sur lequel vous ne pouvez rien), et les
avertissements ne font pas échouer `gitcito doctor` en CI. Et une réparation
n'est jamais fournie par le fichier : l'ensemble ci-dessus est l'ensemble
complet, fermé à la compilation. La configuration lui donne une valeur — un
chemin à copier, une valeur pour `core.hooksPath` — jamais une commande.

Copier un fichier n'écrase jamais : son absence est précisément la raison d'être
de la ligne.

## Les commits

Avec `commit.scopes` déclarées, le bouton de portée du compositeur propose cette
liste au lieu d'un champ libre — la différence entre `feat(renderer)` et
`feat(rendererr)`. `ticketFromBranch` et `trailers` remplissent les parties
mécaniques d'un message, et `links.tickets` retransforme les clés en liens
partout où un commit s'affiche.

Les mêmes règles s'appliquent hors de la fenêtre : `gitcito commit-check` lit ce
fichier, si bien qu'un hook `commit-msg` et la CI exigent exactement ce que le
compositeur suggère. Voir [la ligne de commande](cli.md) et
[committer](committing.md).

## La liste avant de pousser

`checklist.push` s'affiche comme une confirmation avant le premier push de la
session, une ligne par entrée. C'est la place de ce qui relève vraiment du
jugement — *quelqu'un a-t-il prévenu le support ?* — car Gitcito **ne les vérifie
jamais pour vous**. Ce sont des rappels, pas des barrières : lisez, puis poussez,
ou annulez. Affiché une fois par dépôt et par session, parce qu'une boîte de
dialogue à chaque push est une boîte que personne ne lit.

## Pourquoi il ne peut pas vous nuire

Le fichier arrive avec le dépôt, donc de la part de qui a écrit le dépôt. Il est
traité comme du contenu non fiable, exactement comme un message de commit :

- **Rien dedans ne s'exécute.** Aucun champ ne contient de commande, et les
  réparations du doctor forment une liste fixe.
- **Il ne peut qu'ajouter des restrictions.** `protect` est une union avec votre
  liste locale : un dépôt peut protéger plus que ce que vous avez choisi, jamais
  vous dissuader de protéger quelque chose. Aucun champ ne désactive une
  protection.
- **Les chemins ne peuvent pas sortir du dépôt.** Chemins absolus, `..`, `~`,
  lettres de lecteur et tout ce qui touche à `.git` sont refusés, et revérifiés
  au moment où une chaîne devient un vrai chemin.
- **Les liens doivent être en `http(s)`.** Rien d'autre n'est confié à
  l'ouvreur d'URL du système.
- **Tout est plafonné** — longueur des listes, des chaînes, des motifs — pour
  qu'un dépôt hostile ne puisse pas coller un mur de texte dans une boîte de
  dialogue ni mille pastilles dans un panneau.

Un champ invalide est abandonné, pas fatal. Le reste du fichier s'applique
toujours, et ce qui a été écarté est listé sous **Ignoré par Gitcito** dans
l'onglet Config, avec la raison. Seule exception : un JSON invalide ou une
`version` inconnue, où il n'y a rien à sauver.

## Ce qu'il ne fait délibérément pas

- **Ni commandes, ni scripts, ni hooks.** C'est le rôle des [hooks](hooks.md),
  et c'est une décision que vous prenez par clone.
- **Aucune règle par branche ni par personne.** Un fichier, un jeu de règles.
- **Il ne remplace pas la CI.** La liste est du texte ; le doctor vérifie
  l'environnement, pas votre travail.
- **Il ne peut rien affaiblir.** Toutes les protections de Gitcito restent les
  vôtres.

**Voir aussi :** [Réglages par dépôt](repo-settings.md) ·
[La ligne de commande](cli.md) · [Committer](committing.md) ·
[Hooks et .gitignore](hooks.md)
