---
title: La riga di comando
category: Strumenti dell'area di lavoro
order: 93
summary: `gitcito .` — come `code .`, ma per Git.
keywords: cli riga di comando command line terminale shim path installa apri cartella istanza singola
---

# La riga di comando

```sh
gitcito .                        # open this folder
gitcito ~/code/api               # …or that one
gitcito . -n "My API"            # with a display name
gitcito . -g "Work"              # inside a group tab
gitcito . -n "My API" -g "Work"  # both
```

## Installare lo shim

Tavolozza dei comandi (<kbd>⌘K</kbd>) → **Installa il comando 'gitcito' nel
PATH** (macOS). Crea un link simbolico a un piccolo shim in `/usr/local/bin` o
`/opt/homebrew/bin`, chiedendo i permessi di amministratore solo se nessuno dei
due è scrivibile da te. Esegui di nuovo lo stesso comando per disinstallarlo.

## Come si comporta

- Se il percorso è **già aperto** — come scheda o dentro un gruppo — Gitcito
  **gli dà il fuoco** invece di aprire un doppione.
- Se non è ancora un repository Git, si apre lo stesso e ti propone il percorso
  "inizializza qui un repository".
- `-g` aggiunge il repository a un gruppo con quel nome, creandolo se non esiste.
- Gitcito è a **istanza singola**: eseguire `gitcito` con l'app già aperta passa
  la richiesta a quella finestra invece di lanciare una seconda copia.

**Vedi anche:** [Aree di lavoro, schede e gruppi](workspaces.md)
