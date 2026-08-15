---
title: Premiers pas
category: Pour commencer
order: 1
summary: Ouvrir un dépôt, lire le graphe, faire son premier commit.
keywords: intro premiers pas débuter ouvrir cloner clone onglets tabs graphe graph commit valider
---

# Premiers pas

Gitcito ouvre un dossier et vous montre son historique. Rien n'est écrit dans
votre dépôt tant que vous ne le demandez pas.

![Un dépôt fraîchement ouvert, encore sans aucun commit](../../screenshots/empty-repo.webp)

## Ouvrir un dépôt

- **Glissez un dossier** sur la fenêtre, ou utilisez **Ouvrir un dépôt** depuis
  l'écran d'accueil.
- **Clonez-en un** depuis une URL ou directement depuis votre hébergeur — voir
  [le clonage](cloning.md) pour les options qui rendent rapide le clonage d'un
  dépôt énorme.
- Depuis un terminal, `gitcito .` ouvre le dossier courant dans l'application
  déjà lancée — voir [la ligne de commande](cli.md).
- Un dossier qui n'est pas encore un dépôt Git s'ouvre quand même, en vous
  proposant de l'initialiser.

## Les trois panneaux

| Panneau | Ce qu'il contient |
|---|---|
| Gauche | Branches, distants, étiquettes, remisages, arbres de travail — et l'onglet **Fichiers** pour la copie de travail |
| Milieu | Le graphe des commits, et ce que vous y sélectionnez |
| Droite | Le compositeur de commit, ou les détails du commit sélectionné |

## Trouver tout le reste

Deux chemins, et ils mènent aux mêmes endroits :

- **`⌘K`** (`Ctrl+K`) — la palette de commandes. Tapez ce que vous voulez ; elle
  saute aussi vers les branches, les commits et les fichiers.
- **Outils** dans la barre d'outils — le même ensemble, à l'échelle du dépôt,
  présenté comme un menu, avec la longue traîne repliée en groupes pour rester
  lisible.

![Le menu Outils : les outils fréquents d'abord, le reste groupé](../../screenshots/tools-menu.webp)

Tout ce qui est atteignable par l'un l'est par l'autre : il n'y a donc rien que
seuls les utilisateurs avancés puissent trouver.

## Votre premier commit

1. Modifiez un fichier. Il apparaît sous **Non indexé**.
2. Indexez-le — le fichier entier, une section, ou [ligne par ligne](staging.md).
3. Écrivez un message et appuyez sur **Commit**.

Tout le reste dans Gitcito est optionnel.

