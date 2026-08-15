---
title: La ligne de commande
category: Outils de l'espace de travail
order: 93
summary: `gitcito .` — comme `code .`, mais pour Git.
keywords: cli ligne de commande command line terminal passerelle shim path installer install ouvrir dossier folder instance unique single instance
---

# La ligne de commande

```sh
gitcito .                        # open this folder
gitcito ~/code/api               # …or that one
gitcito . -n "My API"            # with a display name
gitcito . -g "Work"              # inside a group tab
gitcito . -n "My API" -g "Work"  # both
```

## Installer la passerelle

Palette de commandes (<kbd>⌘K</kbd>) → **Installer la commande 'gitcito' dans le
PATH** (macOS). Cela crée un lien symbolique vers une petite passerelle dans
`/usr/local/bin` ou `/opt/homebrew/bin`, en demandant des droits administrateur
uniquement si aucun des deux ne vous est accessible en écriture. Relancez la même
commande pour désinstaller.

## Comment elle se comporte

- Si le chemin est **déjà ouvert** — en onglet ou dans un groupe — Gitcito **lui
  donne le focus** au lieu d'ouvrir un doublon.
- Si ce n'est pas encore un dépôt Git, il s'ouvre quand même, en proposant le
  flux « initialiser un dépôt ici ».
- `-g` ajoute le dépôt à un groupe de ce nom, en créant le groupe s'il n'existe
  pas.
- Gitcito est en **instance unique** : lancer `gitcito` alors que l'application
  est ouverte transmet la demande à cette fenêtre plutôt que de démarrer une
  seconde copie.

**Voir aussi :** [Espaces de travail, onglets et groupes](workspaces.md)
