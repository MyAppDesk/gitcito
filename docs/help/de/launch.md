---
title: Ausführen & Debuggen (launch.json)
category: Workspace-Werkzeuge
order: 91
summary: Deine VS-Code-Launch-Konfigurationen starten, ohne Gitcito zu verlassen.
keywords: launch.json ausführen run debuggen debug vscode konfigurationen configs tasks aufgaben preLaunchTask input hintergrund background compound compounds stopAll serverReadyAction parallele Sitzungen
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
  Ein `pickString` zeigt seine Optionen als echten Picker mit vorausgewähltem
  Standardwert; ein als `password` markierter `promptString` wird maskiert.
- **`isBackground`**-Tasks (Watcher, Dev-Server) laufen abgekoppelt und
  blockieren den Start daher nie.
- **Compounds** starten jedes Mitglied als **eigene parallele Sitzung** — in
  einem geteilten Terminal mit dem Namen des Compounds, ein Bereich pro
  Mitglied, genau wie die Debug-Sitzungen in VS Code. Mit `stopAll: true`
  stoppt das Stoppen eines Mitglieds alle.
  Aufgaben, die mehrere Mitglieder teilen, laufen **einmal**, in einem eigenen
  Bereich, bevor die Mitglieder starten — eine Versions-Abfrage fragt einmal,
  nicht einmal pro Mitglied.
  Der Bereich schließt sich bei Erfolg selbst und bleibt bei einem Fehler offen.
- **`serverReadyAction`** wird beachtet: Sobald die Ausgabe der Sitzung dem
  konfigurierten Muster entspricht, öffnet sich die angekündigte URL im Browser
  (`openExternally`; `debugWithChrome` / `debugWithEdge` öffnen ebenfalls den
  Browser — Gitcito kann keinen Debugger anhängen).

![Ein Compound mit zwei parallelen Sitzungen](../../screenshots/launch-compound.webp)

![Der ${input}-Picker mit vorausgewähltem Standardwert](../../screenshots/launch-input.webp)

Eine schwebende Werkzeugleiste gibt dir **Pause / Fortsetzen, Neustart, Stopp**
und wechselt zwischen laufenden Sitzungen.

Einschalten unter **Einstellungen → Allgemein → launch.json aktivieren**. Der
Knopf **LAUNCH** erscheint dann neben den Tabs Git / Dateien.

Ein Compound-Mitglied erscheint als *Compound › Mitglied*, und ein Neustart
startet nur dieses Mitglied neu.

Was Gitcito bewusst **nicht** tut: Es führt deine Programme in echten Terminals
aus, ist aber kein Debugger — keine Breakpoints, keine Variablenansicht, kein
Debug Adapter Protocol. Reine Attach-Konfigurationen funktionieren, wenn sie
einen `preLaunchTask` mitbringen (die Aufgabe ist die Arbeit); ein reines
Attach hat nichts auszuführen.

**Siehe auch:** [Integriertes Terminal](terminal.md)
