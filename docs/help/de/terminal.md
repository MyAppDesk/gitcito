---
title: Integriertes Terminal
category: Workspace-Werkzeuge
order: 90
summary: Ein echtes PTY, unter dem Repo angedockt, mit Tabs pro Repository.
keywords: terminal shell pty xterm konsole tabs angedockt dock
---

# Integriertes Terminal

Ein echtes PTY (xterm + node-pty), kein Kommando-Runner. Deine Shell, dein Prompt,
deine Aliase.

![Das integrierte Terminal](../../screenshots/terminal.webp)

- **Mehrere Tabs pro Repository**, jeder startet im Ordner dieses Repositorys.
- Docke es **unter** dem Graphen oder als **rechte Spalte** an; das Panel merkt
  sich seine Größe.
- Die Sichtbarkeit des Terminals gilt pro Repository: wechselst du zu einem Tab,
  der nie eines geöffnet hat, bleibt es geschlossen.
- Tabs benennen sich nach dem, was in ihnen läuft.
- Klappst du die Terminal-Liste ein, schrumpft sie zu einer **Leiste**: ein Icon
  pro Terminal (geteilte Terminals zeigen eine Mini-Karte der Panels), Klick zum
  Wechseln, Rechtsklick für das übliche Menü zum Umbenennen/Teilen/Beenden.
- **Ziehe ein Terminal auf ein anderes** in der Liste, um sie zu einer
  geteilten Gruppe zu verschmelzen. Jedes Terminal behält seinen Namen als
  Bereich; die Gruppe bekommt einen frischen nummerierten Namen.

![Zwei Panels nebeneinander geteilt in einer Terminal-Gruppe](../../screenshots/terminal-split.webp)

## Tasten

| Tasten | Bewirkt |
|---|---|
| <kbd>⌃`</kbd> | Terminal ein- oder ausblenden — die physische Control-Taste, auf jeder Plattform |
| <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> | Neues Terminal, solange das Terminal den Fokus hat |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | Schließt das fokussierte Terminal; das letzte zu schließen blendet das Panel aus |
| <kbd>Ctrl+Shift+C</kbd> | Kopiert die Auswahl; ein einfaches <kbd>Ctrl+C</kbd> kopiert ebenfalls, solange etwas ausgewählt ist, und bleibt sonst SIGINT |
| <kbd>Ctrl+V</kbd> / <kbd>Ctrl+Shift+V</kbd> / <kbd>Shift+Ins</kbd> | Aus der Zwischenablage einfügen |
| Rechtsklick | Kopiert die Auswahl oder fügt ein, wenn nichts ausgewählt ist |

Die ersten beiden gelten absichtlich nur im Terminal: außerhalb öffnen und
schließen sie weiterhin [Workspace-Tabs](workspaces.md). Unter macOS verhalten
sich Kopieren/Einfügen im Menü Bearbeiten genauso.

## Skript-Vorschläge

Tippe `npm run ` (oder `pnpm`, `yarn`, `bun run`), und am Cursor erscheint eine
Liste der Skripte des Projekts, gefiltert während du tippst: `npm run loc` findet
`LOCAL_SERVER`. Jeder Name zeigt den Befehl, den er ausführt.

| Taste | Bewirkt |
|-------|---------|
| **Tab** | Vervollständigt das ausgewählte Skript |
| **↑ / ↓** | Ein anderes wählen |
| **Esc** | Schließt die Liste, bis du wieder tippst |

Andere Befehle bekommen eine eigene Liste:

| Getippt | Listet | Gelesen aus |
|-------|------|-----------|
| `composer run ` | Composer-Skripte | der nächstgelegenen `composer.json` |
| `make ` | Makefile-Ziele, mit dem `## Text` nach einem Ziel als Beschreibung | dem `Makefile` des aktuellen Verzeichnisses, wie `make` es liest |
| `git checkout `, `switch`, `merge`, `rebase` | Lokale Branches, dann entfernte mit ihrem Kurznamen | dem Repository, in dem die Shell steht |

Ein Makefile-Ziel aus Variablen oder einem Muster (`%.o`) erscheint nicht, und
`git checkout -b` bekommt keine Liste: Es benennt einen neuen Branch.

Die Skripte kommen aus der `package.json`, die dem **aktuellen** Verzeichnis der
Shell am nächsten liegt — nach `cd frontend` also die des Frontends. Namen, die
mit dem Getippten beginnen, stehen vorn, danach Namen, die es enthalten.

Die Liste kennt nur die Tasten, die du seit dem letzten Enter getippt hast. Einen
Befehl mit ↑ zurückholen, den Cursor bewegen oder die Tab-Vervollständigung der
Shell nutzen verändert die Zeile außerhalb ihrer Sicht; dann bleibt sie bis zum
nächsten Enter still, statt das Falsche zu vervollständigen. Unter Windows lässt
sich das aktuelle Verzeichnis nicht lesen, daher folgt die Liste dem Ordner, in
dem das Terminal geöffnet wurde.

## Dein PATH

Die Shell startet als **Login-Shell**, genau wie in Terminal.app oder iTerm —
`~/.zprofile`, `~/.zlogin` und `~/.bash_profile` laufen also mit. Das zählt,
weil Versionsmanager und `brew shellenv` sich üblicherweise genau dort
eintragen: Ein Werkzeug wie `fvm`, `nvm` oder `pyenv`, das in deinem Terminal
funktioniert, funktioniert auch hier.

Gitcito fragt außerdem beim Start deine Login-Shell nach ihrem echten `PATH` und
mischt ihn in alles, was es startet — eine GUI-App aus dem Dock erbt sonst so
gut wie nichts. Wird ein Befehl trotzdem nicht gefunden, prüfe, ob er im `PATH`
einer Login-Shell liegt und nicht nur in dem einer interaktiven Shell.

Alles, was du hier ausführst, ist für Gitcitos eigenes Locking unsichtbar — ein
von Hand getipptes langes `git rebase` und ein Klick in der UI können sich also
weiterhin in die Quere kommen. Die App lädt von der Platte neu, wenn das Terminal
etwas verändert.

## Shell, Theme & Oh My Posh

Unter Windows wählt Einstellungen → Layout die Shell, die jedes neue Terminal
startet — PowerShell, PowerShell Core (`pwsh`), `cmd`, Git Bash, WSL oder eine
eigene ausführbare Datei. Das Aussehen des Terminals (Theme, Schriftgröße,
Schriftfamilie) liegt unter Einstellungen → Themes → Terminal-Theme und gilt
sofort für jede Sitzung.

Ist [Oh My Posh](https://ohmyposh.dev) installiert, listet der Bereich auch jede
`*.omp.json` unter `%POSH_THEMES_PATH%` mit Live-Vorschau — die Auswahl wird
neuen Terminals als `POSH_THEME` mitgegeben, sodass ein schlichtes
`oh-my-posh init pwsh` in deinem Profil sie übernimmt. Ein eigener
`.omp.json`-Pfad geht auch; bleibt das Feld auf Standard, gilt, was dein
Shell-Profil oder ein globales `POSH_THEME` bereits setzt. Laufende Sitzungen
behalten ihr Theme — schließe ein Terminal und öffne es neu, um ein neues
anzuwenden. Prompt-Glyphen brauchen eine Nerd Font in der Schriftfamilie des
Terminals (z. B. `CaskaydiaMono Nerd Font`), sonst erscheinen Icons als Kästchen.

Zur Geschwindigkeit: Oh My Posh startet sein Programm einmal pro Prompt — unter
Windows etwa 100–200 ms, mehr bei Themes mit Git-Segment in einem großen Repo —
spürbar als kurze Pause vor jedem Prompt, nicht als Verzögerung von Gitcito.
Themes ohne Git-Segment sind am schnellsten. Auch PowerShells Vorhersage-Stil
zählt: `-PredictionViewStyle InlineView` zeichnet pro Taste einen kleinen Bereich
neu, `ListView` einen ganzen Block.

**Siehe auch:** [Ausführen & Debuggen](launch.md) · [Hooks](hooks.md)
