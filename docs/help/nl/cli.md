---
title: De commandoregel
category: Werkomgeving & tools
order: 93
summary: `gitcito .` — zoals `code .`, maar dan voor Git.
keywords: cli commandoregel command line terminal shim path installeren map openen single instance
---

# De commandoregel

```sh
gitcito .                        # open this folder
gitcito ~/code/api               # …or that one
gitcito . -n "My API"            # with a display name
gitcito . -g "Work"              # inside a group tab
gitcito . -n "My API" -g "Work"  # both
```

## De shim installeren

Commandopalet (<kbd>⌘K</kbd>) → **Installeer 'gitcito'-commando in PATH**
(macOS). Het legt een symlink naar een kleine shim in `/usr/local/bin` of
`/opt/homebrew/bin`, en vraagt alleen om beheerdersrechten als geen van beide
voor jou schrijfbaar is. Draai hetzelfde commando nog eens om het te
verwijderen.

## Hoe het zich gedraagt

- Is het pad **al geopend** — als tabblad of binnen een groep — dan brengt
  Gitcito het **naar voren** in plaats van een duplicaat te openen.
- Is het nog geen Git-repository, dan opent het toch en krijg je de flow
  "repository hier initialiseren" aangeboden.
- `-g` voegt de repository toe aan een groep met die naam, en maakt de groep aan
  als hij nog niet bestaat.
- Gitcito draait als **één instantie**: `gitcito` draaien terwijl de app open
  staat geeft het verzoek door aan dat venster in plaats van een tweede kopie te
  starten.

**Zie ook:** [Workspaces, tabbladen & groepen](workspaces.md)
