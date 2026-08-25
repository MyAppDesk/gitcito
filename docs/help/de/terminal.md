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

**Siehe auch:** [Ausführen & Debuggen](launch.md) · [Hooks](hooks.md)
