---
title: Ungetrackte Dateien entfernen
category: Mit Änderungen arbeiten
order: 35
summary: Ein Trockenlauf von git clean — jeder ungetrackte Pfad mit Größe, ignorierte Dateien separat und der Papierkorb als Standardziel.
keywords: clean git clean ungetrackt untracked entfernen löschen müll build-ausgabe ignoriert gitignore trockenlauf dry run papierkorb node_modules dist aufräumen
---

# Ungetrackte Dateien entfernen

Ein Arbeitsverzeichnis sammelt Dateien an, von denen git nie eine Kopie
genommen hat: eine Notiz nebenbei, eine `debug-output.txt`, ein `dist/` aus
einem fehlgeschlagenen Build, ein `node_modules` aus einem Branch, den du
letzten Monat verlassen hast. Git hat dafür einen Befehl — `git clean` — und das
ist die eine git-Operation, hinter der **nichts steht**. Der Inhalt war nie in
einem Commit, also gibt es keinen Reflog-Eintrag, keinen Stash, kein
Rückgängig und keine `git`-Beschwörung, die ihn zurückholt.

Deshalb ist es die Operation, die Leute im Terminal ausführen und danach
bereuen. Gitcitos Variante zeigt dir die vollständige Liste, bevor irgendetwas
passiert.

`⌘K` → **Ungetrackte Dateien entfernen**.

![Ungetrackte und ignorierte Pfade getrennt aufgelistet, jeweils mit Größe, bevor etwas entfernt wird](../../screenshots/clean.webp)

## Was die Liste bedeutet

Jeder Eintrag ist ein Pfad, den `git clean` erreichen könnte, mit seiner Größe
auf der Platte, in zwei Gruppen:

| Gruppe | Was es ist | Standardmäßig ausgewählt |
|-------|-----------|---------------------|
| **Ungetrackt** | Nie committet, nicht von `.gitignore` erfasst | Ja |
| **Ignoriert** | Von `.gitignore` erfasst — Build-Ausgaben, Caches, `.env` | **Nein** |

Genau um diese Trennung geht es. Ignorierte Pfade sind meistens wertlos und
gelegentlich die einzige Kopie von etwas Wichtigem: eine lokale `.env`, ein
Datenbank-Dump, ein heruntergeladenes Fixture. Nichts, was auf `.gitignore`
passt, wird jemals für dich vorausgewählt.

Ein komplett ungetracktes **Verzeichnis ist eine Zeile**, nicht eine Zeile pro
Datei — `tmp/`, `dist/`, `node_modules/` — weil git sie in genau dieser
Granularität entfernt und weil eine Liste mit 40.000 Dateien eine Liste ist, die
niemand liest. Die angezeigte Größe ist die Summe des Inhalts.

Ein Ordner, der als **eigenes Repository** markiert ist, hat ein eigenes `.git`:
ein Klon, den du hier hineingelegt hast, oder ein Experiment, das du nie
angebunden hast. Git weigert sich, so etwas zu entfernen (es will `-ff`, ein
Flag, das Gitcito nicht anbietet) — der Papierkorb nimmt sie.

## Papierkorb oder löschen

**In den Papierkorb verschieben** ist standardmäßig an und läuft überhaupt nicht
über git: die Pfade wandern in den Papierkorb deines Systems, wo du sie
zurücklegen kannst. Das ist der einzige Weg, der ein verschachteltes Repository
entfernt, und der einzige, den ein falsch gesetztes Häkchen überlebt.

Schaltest du das aus, ist es ein echtes `git clean -f -d -x` auf genau den
ausgewählten Pfaden, und du musst bestätigen — mit der Anzahl und der
Gesamtgröße vor Augen. Davon erholt sich nichts.

## Grenzen, die man kennen sollte

- **Nur ungetrackte Dateien.** Eine geänderte, getrackte Datei steht hier nicht
  — dafür gibt es [Verwerfen](staging.md), das sie aus dem Index oder aus HEAD
  wiederherstellt.
- **Die Liste ist gedeckelt** bei den ersten 400 Pfaden. Hat ein Repository
  mehr, entferne das Aufgelistete und drücke **Erneut scannen** für den Rest.
- **Verzeichnisgrößen sind Näherungswerte** bei sehr großen Bäumen: der Scan
  hört nach 20.000 Dateien auf, ein riesiges `node_modules` kann also kleiner
  wirken, als es ist. Größer wirkt es nie.
- **Der Scan ist eine Momentaufnahme.** Schreibt ein Build Dateien, während der
  Dialog offen ist, drücke **Erneut scannen**, bevor du etwas entfernst.
- Pfade werden gegen gits eigene Liste entfernbarer Dateien geprüft, bevor
  irgendetwas angefasst wird — durch diesen Dialog kann also nichts Getracktes
  entfernt werden, auch nicht über den Namen.

Siehe auch: [Staging & Verwerfen](staging.md) · [Dateien ignorieren](hooks.md) ·
[Eine Datei aus der Historie entfernen](history-purge.md)
