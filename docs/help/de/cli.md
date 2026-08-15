---
title: Die Kommandozeile
category: Workspace-Werkzeuge
order: 93
summary: `gitcito .` — wie `code .`, nur für Git.
keywords: cli kommandozeile terminal shim path pfad installieren ordner öffnen einzelinstanz command line single instance
---

# Die Kommandozeile

```sh
gitcito .                        # open this folder
gitcito ~/code/api               # …or that one
gitcito . -n "My API"            # with a display name
gitcito . -g "Work"              # inside a group tab
gitcito . -n "My API" -g "Work"  # both
```

## Den Shim installieren

Befehlspalette (<kbd>⌘K</kbd>) → **Install 'gitcito' command in PATH**
(macOS). Damit wird ein kleiner Shim nach `/usr/local/bin` oder
`/opt/homebrew/bin` verlinkt; nach Admin-Rechten wird nur gefragt, wenn keines
der beiden Verzeichnisse für dich schreibbar ist. Führst du denselben Befehl
noch einmal aus, wird der Shim wieder entfernt.

## Wie es sich verhält

- Ist der Pfad **bereits geöffnet** — als Tab oder innerhalb einer Gruppe —,
  dann **fokussiert** Gitcito ihn, statt ein Duplikat zu öffnen.
- Ist es noch gar kein Git-Repository, öffnet es sich trotzdem und bietet dir
  den Ablauf „Repository hier initialisieren“ an.
- `-g` fügt das Repository einer Gruppe dieses Namens hinzu und legt die Gruppe
  an, falls sie noch nicht existiert.
- Gitcito läuft als **Einzelinstanz**: Rufst du `gitcito` auf, während die App
  bereits offen ist, wandert die Anfrage in dieses Fenster, statt eine zweite
  Kopie zu starten.

**Siehe auch:** [Workspaces, Tabs & Gruppen](workspaces.md)
