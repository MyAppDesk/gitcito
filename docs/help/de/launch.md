---
title: Ausführen & Debuggen (launch.json)
category: Workspace-Werkzeuge
order: 91
summary: Deine VS-Code-Launch-Konfigurationen starten, ohne Gitcito zu verlassen.
keywords: launch.json ausführen run debuggen debug vscode konfigurationen configs tasks aufgaben preLaunchTask input hintergrund background
---

# Ausführen & Debuggen

Gitcito liest deine `.vscode/launch.json` — die im Wurzelverzeichnis und alle
verschachtelten, gruppiert mit Trennlinien — und startet die Konfiguration, die
du auswählst, im integrierten Terminal.

![Die Auswahl der Launch-Konfigurationen und die schwebende Werkzeugleiste](../../screenshots/launch-configs.webp)

- VS-Code-**Variablen werden aufgelöst** (`${workspaceFolder}` und Verwandte).
- Der **`preLaunchTask`** einer Konfiguration läuft zuerst.
- **`${input:…}`**-Werte werden vor dem Start interaktiv abgefragt
  (`promptString` und `pickString`).
- **`isBackground`**-Tasks (Watcher, Dev-Server) laufen abgekoppelt und
  blockieren den Start daher nie.

Eine schwebende Werkzeugleiste gibt dir **Pause / Fortsetzen, Neustart, Stopp**
und wechselt zwischen laufenden Sitzungen.

Einschalten unter **Einstellungen → Allgemein → launch.json aktivieren**. Der
Knopf **LAUNCH** erscheint dann neben den Tabs Git / Dateien.

**Siehe auch:** [Integriertes Terminal](terminal.md)
