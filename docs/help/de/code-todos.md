---
title: TODOs im Code
category: Workspace-Werkzeuge
order: 93
summary: Jedes TODO, FIXME und HACK im Quelltext — gruppiert nach Schlagwort, nach Zuständigem oder nach Ordner.
keywords: todo todos fixme hack xxx note markierung markierungen kommentar kommentare baum schlagwort zuständig zugewiesen cgm schulden technische grep suche
---

# TODOs im Code

Ein TODO ist ein Versprechen, das jemand sich selbst gegeben und dann verloren
hat. Es steht dort, wo das Problem ist — also genau dort, wo niemand ein zweites
Mal hinsieht — und wenn es wichtig wird, ist die Person, die es geschrieben hat,
längst im nächsten Team. Grep findet sie, und tausend Zeilen Grep-Ausgabe sind
dasselbe, als hätte man sie nicht gefunden.

Der Reiter **TODOs** im Analyse-Dock liest sie alle und tut dann, was Grep nicht
kann: Er gruppiert sie. Öffnen Sie das Dock über die Statusleiste oder die
Befehlspalette (`TODOs im Code`) und wechseln Sie auf den zweiten Reiter.

Die Statusleiste zählt die Markierungen neben den Fehlern und Warnungen der
Analyse; ein Klick auf diesen Zähler öffnet diesen Reiter.

![Der Reiter TODOs, nach Zuständigem gruppiert](../../screenshots/code-todos.webp)

## Was als Markierung zählt

Ein Schlagwort, in einem Kommentar, in einer Datei, die Git verfolgt oder
verfolgen würde:

| Geschrieben | Gelesen als |
|-------------|-------------|
| `// TODO: ausliefern` | Schlagwort `TODO`, ohne Zuständigen |
| `//todo ausliefern` | dasselbe — Doppelpunkt und Leerzeichen sind optional |
| `# todo ausliefern` | dasselbe — Groß-/Kleinschreibung und Sprache sind egal |
| `/* TODO(cgm): ausliefern */` | Schlagwort `TODO`, zuständig `cgm` |
| `-- TODO (CGM) ausliefern` | derselbe Zuständige: `cgm`, `(CGM)` und `[cgm]` sind eine Person |
| `<!-- TODO: @cgm ausliefern -->` | wieder dasselbe |

Die Schlagwörter sind `TODO`, `FIXME`, `BUG`, `HACK`, `XXX`, `NOTE`, `OPTIMIZE`,
`REVIEW`, `REFACTOR`, `DEPRECATED`, `QUESTION`, `IDEA`, `WIP` und `TEMP`. Die
ersten vier sind farbig, denn „das ist kaputt“ und „das war so eine Idee“ dürfen
in einer Liste nicht gleich aussehen.

Das Schlagwort muss hinter einem Kommentarzeichen stehen — `//`, `#`, `--`, `;`,
`%`, `/*`, `*`, `<!--`, `"""`. Mehr zählt nicht: `todo = [l for l in lines]` ist
Code, und ein Panel, das eine Variablenzuweisung als Schuld führt, ist ein Panel,
dem man kein zweites Mal glaubt. Dieselbe Regel hält eine Funktion namens
`reviewNotes` aus der Liste heraus.

## Die Gruppierung ist der Punkt

Vier Achsen, je ein Klick:

| Gruppieren nach | Beantwortet |
|-----------------|-------------|
| **Schlagwort** | Welche Art von Schulden trägt dieses Repository? |
| **Zuständig** | Was hat wer hinterlassen — und was liegt im nicht zugewiesenen Stapel? |
| **Ordner** | Welche Ecke des Baums verrottet gerade? |
| **Datei** | Die schlichte Liste, wenn Sie ohnehin wissen, wohin Sie wollen. |

**Nicht zugewiesen** ist eine echte Gruppe, kein Rest: Markierungen ohne Namen
sind die, die niemand je aufnimmt, und sie gezählt zu sehen ist genau der Zweck.

Die Schlagwort-Chips oben filtern die Liste; ein Klick auf das Zuständigen-Abzeichen
einer Zeile ebenso, und die Suche, die auf Nachricht, Datei, Schlagwort und
Zuständigen passt. **Nur geänderte** engt auf Dateien ein, die Sie bearbeitet und
noch nicht committet haben — die letzte Kontrolle vor einem Push, wenn ein
`// FIXME` von vor einer Stunde gleich dauerhaft wird.

Ein Klick auf eine Zeile öffnet die Datei an dieser Stelle.

## Was es nicht tut

- **Es liest, es schreibt nie.** Es gibt kein „erledigt“: Ein TODO schließt man,
  indem man die Zeile löscht und das committet. Für eine Liste, die Gitcito für
  Sie führt, siehe [Todos](todos.md) — etwas ganz anderes: private Notizen, die
  in der App leben, nicht im Quelltext.
- **Ignorierte Dateien werden übersprungen**, `node_modules` inbegriffen, egal
  was die Schlagwörter darin sagen. Nicht verfolgte Dateien sind dabei: eine vor
  fünf Minuten geschriebene Markierung ist die sehenswerteste.
- **Es unterscheidet Kommentar und Zeichenkette nicht.** Eine Zeile
  `const banner = "// TODO"` ist für den Scan eine Markierung. Es hat keinen
  Parser für vierzig Sprachen und behauptet das auch nicht.
- **Der Scan ist eine Momentaufnahme.** Bearbeiten Sie eine Datei, behält das
  Panel seine Zahlen, bis Sie erneut scannen; die Aktualisieren-Schaltfläche ist
  die ganze Geschichte.
- **Bei 5.000 Markierungen ist Schluss.** Ein Repository darüber hat ein
  Schuldenproblem, das kein Panel löst.

## Wo es läuft

Ein `git grep` über das Arbeitsverzeichnis — deshalb dauert es Millisekunden, wo
der Reiter [Probleme](problems.md) Sekunden braucht: Nichts wird kompiliert,
keine Toolchain ist beteiligt, und die Suche überspringt Binärdateien und
ignorierte Pfade, weil Git längst weiß, welche das sind.
