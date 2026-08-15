---
title: Externer Editor
category: Workspace-Werkzeuge
order: 95
summary: Schick ein Repository, eine Datei oder eine einzelne Codezeile an den Editor, in dem du wirklich schreibst.
keywords: editor vscode code cursor windsurf zed sublime jetbrains intellij webstorm xcode öffnen in editor zeile spalte line column eigener befehl custom command argv
---

# Externer Editor

Ein Git-Client ist der Ort, an dem du Code liest; er ist selten der Ort, an dem
du ihn reparierst. Zwischen „Problem im Diff entdeckt“ und „Cursor steht auf
dieser Zeile im Editor“ liegen eine Dateisuche und ein Scrollen — jedes Mal.

Zeig Gitcito einmal, wo dein Editor ist, und diese Lücke schließt sich: Rechtsklick
auf eine Zeile in der Datei- oder Blame-Ansicht öffnet sie dort, genau auf dieser
Zeile.

## Einen auswählen

**Einstellungen → Allgemein → Externer Editor.** Das Dropdown listet die
Editoren, die Gitcito auf dieser Maschine finden kann — es sucht zuerst nach dem
Befehl jedes Editors und dann, unter macOS, nach dem Application Bundle in
`/Applications` und `~/Applications`. Der Scan läuft jedes Mal, wenn du die
Einstellungen öffnest, sodass ein vor fünf Minuten installierter Editor ohne
Neustart auftaucht.

Ab Werk erkannt:

| Editor | Befehl, nach dem gesucht wird |
|--------|----------------------|
| Visual Studio Code | `code`, `code-insiders` |
| Cursor | `cursor` |
| Windsurf | `windsurf` |
| Zed | `zed` |
| Sublime Text | `subl` |
| JetBrains-IDEs | `idea`, `webstorm`, `pycharm`, `rustrover`, `goland`, `clion`, `rider`, `phpstorm` |
| Xcode | `xed` |

## Die Grenze, die du kennen solltest

**Der Sprung zu einer Zeile braucht den Befehl des Editors, nicht sein Icon.**
Ein macOS-`.app`-Bundle wird über `open` gestartet, und das akzeptiert einen Pfad
und sonst nichts — ein Editor, der nur als Bundle gefunden wurde, öffnet die
Datei also ganz oben, und Gitcito sagt das unter dem Dropdown, statt so zu tun
als wäre es anders.

Die Lösung liegt auf der Editor-Seite: VS Codes *Shell Command: Install 'code'
command in PATH*, Sublimes `subl`-Symlink, JetBrains' *Toolbox → Settings →
Shell scripts*. Sobald der Befehl existiert, wähle den Editor erneut aus, und der
Zeilensprung funktioniert.

## Wo die Aktionen auftauchen

| Oberfläche | Was geöffnet wird |
|---------|---------------|
| Repo-Tab, Repo in der Seitenleiste, Statusleiste | Der Repository-Ordner |
| Dateibaum, Commit-Dateien, Stash-Dateien, der Commit-Composer | Diese Datei |
| Das Icon am Zeilenende im Dateibaum | Diese Datei, mit einem Klick |
| Rechtsklick auf eine Zeile in der **Datei**-Ansicht | Die Datei, auf dieser Zeile |
| Rechtsklick auf eine Zeile in der **Blame**-Ansicht | Die Datei, auf dieser Zeile |

Zeilenaktionen erscheinen nur dort, wo die Zeilennummer noch etwas bedeutet: Eine
Datei, die auf einem alten Commit angezeigt wird, oder ein Blame, das auf eine
frühere Revision zurückgespult wurde, hat Zeilen, die nicht mehr zu dem passen,
was auf der Platte liegt. Gitcito bietet dort also keinen Sprung an, statt dich
an die falsche Stelle zu schicken.

## Ein eigener Befehl

Wähle **Eigener Befehl** für alles, was nicht in der Tabelle steht — ein
Wrapper-Skript, einen Launcher für Remote-Entwicklung, einen Terminal-Editor, den
du über deinen eigenen Shim startest.

| Feld | Bedeutung |
|-------|---------|
| Befehl | Die auszuführende Datei. Keine Shell, also kein `&&`, keine Pipes, keine Globs. |
| Name | Wie die Menüeinträge ihn nennen. |
| Argumente für eine Datei | argv-Vorlage, z. B. `-g {path}:{line}:{col}` |
| Argumente für einen Ordner | argv-Vorlage, meist nur `{path}` |

Vorlagen werden an Leerzeichen zerlegt, und jedes Token wird genau einmal
ersetzt — ein Pfad mit einem Leerzeichen bleibt ein Argument, und danach wird
nichts erneut geparst, sodass ein Dateiname niemals zu Syntax werden kann. Vier
Platzhalter: `{path}`, `{line}`, `{col}`, `{repo}`.

Ein Platzhalter ohne Wert nimmt sein Flag mit: `--line {line} {path}` ohne Zeile
ausgeführt wird einfach zum Pfad, niemals zu einem einsamen `--line`, das den
Dateinamen als sein Argument verschlucken würde. Eine Vorlage ohne `{line}`
bedeutet schlicht, dass Gitcito für diesen Editor keine zeilengenauen Aktionen
anbietet.

## Was das nicht ist

Das ist nicht die Einstellung [„Öffnen mit“-App](repo-settings.md), die den
System-Dialog zeigt und sich eine App merkt, um *irgendetwas* zu öffnen — ein
Bild, ein PDF, einen Ordner im Finder. Der Editor ist der spezifischere der
beiden: Wo beide gesetzt sind, gewinnt der Editor beim Icon am Zeilenende im
Dateibaum; im Rechtsklick-Menü bleiben beide gelistet.

Gitcito startet deinen Editor niemals von selbst, und Gitcito zu schließen
schließt ihn nie mit: Der Editor wird abgekoppelt gestartet, als eigener Prozess.
