---
title: Ausführen & Debuggen (launch.json)
category: Workspace-Werkzeuge
order: 91
summary: Deine VS-Code-Launch-Konfigurationen starten, ohne Gitcito zu verlassen.
keywords: launch.json ausführen run debuggen debug vscode konfigurationen configs tasks aufgaben preLaunchTask input hintergrund background compound compounds stopAll serverReadyAction parallele Sitzungen hot reload hot restart device simulator emulator run target flutter metro expo vite nodemon vitest jest mocha ava wrangler dotnet watch adb simctl avd xcodebuild capacitor
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
Wenn die Leiste etwas verdeckt, ziehe sie an ihrem Griff zur Seite — die
Position wird gemerkt, und ein Doppelklick auf den Griff zentriert sie wieder.

Was Gitcito bewusst **nicht** tut: Es führt deine Programme in echten Terminals
aus, ist aber kein Debugger — keine Breakpoints, keine Variablenansicht, kein
Debug Adapter Protocol. Reine Attach-Konfigurationen funktionieren, wenn sie
einen `preLaunchTask` mitbringen (die Aufgabe ist die Arbeit); ein reines
Attach hat nichts auszuführen.

## Hot-Aktionen — der schnelle Weg neben Neu starten

![Ein Hot Reload aus der Debug-Leiste](../../screenshots/launch-hot.webp)

Die meisten Entwicklungs-Runtimes laden längst per Tastendruck neu: `flutter run`
mit **r**, Metro mit **r**, nodemon mit **rs ⏎**, Vitest führt die Suite mit **a**
erneut aus. Die Startkonfiguration dafür neu zu starten ist der langsame Weg — er
beendet den Prozess, führt jeden `preLaunchTask` erneut aus und wirft den Zustand
der App weg.

Gitcito liest deshalb den Befehl, den eine Konfiguration wirklich startet —
einem `npm run dev` folgt es bis in die Skripte deiner `package.json` — und legt
die Tasten dieser Runtime in die Debug-Leiste. Ein Klick schreibt den
Tastendruck in die Standardeingabe der Sitzung, genau als hättest du ihn selbst
im Terminal getippt.

| Runtime | Schaltflächen | Hinter ⋯ |
|---------|---------------|----------|
| Flutter (`flutter run`) | Hot Reload `r`, Hot Restart `R` | Debug-Paint, Performance-Overlay, Plattformwechsel, DevTools |
| Expo | Neu laden `r` | Entwicklermenü, Debugger |
| Metro / React Native | Neu laden `r` | Entwicklermenü, Debugger |
| Vite (dev, serve, preview) | Server neu starten `r ⏎` | Browser öffnen, URLs anzeigen, Konsole leeren |
| nodemon | Neu starten `rs ⏎` | — |
| Vitest (Watch-Modus) | Alle erneut `a`, fehlgeschlagene erneut `f` | Snapshots aktualisieren |
| Jest (`--watch`) | Alle erneut `a`, fehlgeschlagene erneut `f` | nur geänderte Dateien, Snapshots aktualisieren |
| Mocha (`--watch`) | Erneut ausführen `rs ⏎` | — |
| AVA (`--watch`) | Alle erneut `r ⏎`, Snapshots aktualisieren `u ⏎` | — |
| `dotnet watch` | Neustart erzwingen `Strg+R` | — |
| Wrangler (`wrangler dev`) | Browser öffnen `b` | DevTools, lokal/remote, Konsole leeren |

Runtimes, die von selbst neu laden, bekommen keine Schaltflächen — `node --watch`,
`ng serve`, `tsc --watch`, `cargo watch`, `next dev`, webpack-dev-server. Eine
Schaltfläche, die eine Taste sendet, die niemand liest, ist schlimmer als keine,
weil sie so aussieht, als hätte sie funktioniert.

**Die Grenzen.** Die Erkennung ist rein textuell: Sie sucht den Programmnamen in
der Befehlszeile. Eine Konfiguration, die deinen Dev-Server über ein Wrapper-
Skript startet, das Gitcito nicht lesen kann, bekommt nichts. Es gibt auch keine
Bestätigung — die Schaltfläche blinkt kurz, die Ausgabe des Prozesses ist die
echte Antwort. Eine pausierte oder beendete Sitzung nimmt keine Eingaben an, die
Schaltflächen sind dann ausgegraut.

**Wenn die Vermutung falsch ist**, sag es in der Konfiguration selbst:

```json
{
  "name": "API (watch)",
  "type": "node-terminal",
  "command": "./scripts/dev.sh",
  "gitcito": { "hotActions": [{ "label": "Reload", "send": "r", "icon": "reload" }] }
}
```

`send` wird wörtlich geschrieben — beende es mit `\n` für eine CLI, die auf Enter
wartet. `icon` ist optional: `reload`, `restart`, `rerun`, `failed`, `snapshot`, `menu`, `debugger`,
`browser`, `clear`, `paint`, `perf`, `platform`, `devtools`, `urls`.
Ein leeres `hotActions`-Array schaltet die Schaltflächen für diese Konfiguration ab.

## Ziel — auf welchem Gerät eine Konfiguration startet

![Die Zielauswahl neben dem LAUNCH-Tab](../../screenshots/launch-device.webp)

Einer Konfiguration, die eine mobile App baut, muss man sagen, wo sie laufen
soll. Diese Wahl gehört nicht Flutter allein — React Native, Expo, Capacitor und
xcodebuild nehmen ebenfalls ein Ziel entgegen, jedes anders geschrieben. Gitcito
fragt sie deshalb einmal, direkt neben dem **LAUNCH**-Tab, und schreibt die
Antwort in der Form, die die Runtime dieser Konfiguration liest. Die Auswahl
erscheint nur, wenn irgendeine Konfiguration im Repository ein Gerät annehmen
kann.

**Woher die Liste kommt** — von den SDK-Tools, die die Maschine hat, parallel
befragt:

| Werkzeug | Liefert | Wird gefragt |
|----------|---------|--------------|
| `flutter devices` / `flutter emulators` | alles, bereits normalisiert | wenn der Ordner eine `pubspec.yaml` hat |
| `xcrun simctl` | iOS-Simulatoren, laufend und kalt | unter macOS |
| `adb devices` | Android-Geräte und gestartete Emulatoren | immer |
| `emulator -list-avds` | noch kalte Android-Emulatoren | immer |

Denselben Simulator melden bis zu drei davon, also werden Einträge nach
Plattform und Name zusammengeführt; bei Gleichstand gewinnt Flutter, weil dessen
Id die ist, die `flutter run -d` erwartet. Nicht installierte Tools stehen unten
im Menü — eine kurze Liste sollte sich selbst erklären.

**Was die Wahl bewirkt:**

| Familie | Geschrieben als |
|---------|-----------------|
| Flutter | `-d <id>` |
| React Native iOS | `--udid <id>` |
| React Native Android | `--deviceId=<id>` |
| Expo `run:ios` / `run:android` | `--device <id>` |
| Capacitor / Ionic | `--target <id>` |
| xcodebuild | `-destination id=<id>` |
| alles andere | nur Umgebung |

Jede gestartete Konfiguration bekommt zusätzlich `GITCITO_DEVICE_ID`,
`GITCITO_DEVICE_NAME` und `GITCITO_DEVICE_PLATFORM` in ihre Umgebung, dazu
`ANDROID_SERIAL`, wenn das Ziel ein echtes Android-Gerät ist. Genau das lässt ein
Wrapper-Skript, einen Gradle-Task oder ein blankes `adb` dasselbe Gerät treffen,
ohne dass Gitcito etwas umschreibt.

**Ein kaltes Gerät starten.** Alles unter *Nicht gestartet* bootet beim Auswählen:
`flutter emulators --launch`, `xcrun simctl boot` (plus das Simulator-Fenster)
oder `emulator -avd` abgekoppelt — damit das Beenden von Gitcito nicht deinen
Android-Emulator mitnimmt.

**Die Grenzen.** Eine Konfiguration, die bereits ein Gerät nennt — ein
explizites `-d`, ein `--simulator`, Dart-Codes `deviceId` — bleibt unangetastet:
Die Auswahl überschreibt nie, was der Autor geschrieben hat. Eine Id, die
Shell-Quoting bräuchte, fällt auf die Umgebung zurück, statt eine kaputte
Befehlszeile zu riskieren. Das Menü ist auf das gefiltert, was deine
Konfigurationen erreichen können — ein reines Android-Repository bietet dir nie
ein iPhone an. Und die Liste ist eine Momentaufnahme: Gerät anstecken und
**Geräte aktualisieren** drücken.

Die Wahl wird pro Repository gemerkt und vergessen, sobald das Gerät nicht mehr
existiert.

**Siehe auch:** [Integriertes Terminal](terminal.md)
