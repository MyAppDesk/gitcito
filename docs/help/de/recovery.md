---
title: Wiederherstellung & das Reflog
category: Wiederherstellung & Schutz
order: 60
summary: Das Auffangnetz: Reflog, WIP-Schnappschüsse und Bisect.
keywords: reflog wiederherstellung recovery undo rückgängig verlorene commits schnappschüsse snapshots wip bisect bisect run automatisiert skript exit code restore hard reset
---

# Wiederherstellung & das Reflog

Git verliert selten etwas. Das Schwierige ist, es wiederzufinden.

## Reflog

Jede Bewegung von `HEAD` — und von jedem Branch — samt dem, was sie ausgelöst
hat: Checkout, Reset, Rebase, Amend, ein erzwungener Fetch. Von jedem früheren
Eintrag aus kannst du ihn **auschecken**, **einen Branch davon abzweigen** oder
**hart dorthin zurücksetzen**.

![Die Reflog-Ansicht](../../screenshots/reflog.webp)

Das ist der „ich habe gerade den falschen Branch zurückgesetzt“-Knopf.

## WIP-Schnappschüsse

Nicht committete Arbeit ist das Einzige, was das Reflog nicht retten kann, also
macht Gitcito Schnappschüsse davon: deine getrackten Änderungen plus den
gestagten Index, festgehalten als ein `git stash create`-Commit, der unter
`refs/gitcito/wip` festgepinnt wird.

![WIP-Schnappschüsse](../../screenshots/snapshots.webp)

- Er **fasst dein Arbeitsverzeichnis nie an** und **taucht nie in deiner
  Stash-Liste auf** — es ist eine versteckte Ref, kein Stash.
- Nimm einen von Hand auf, oder lass es alle **5 / 15 / 30 Minuten** laufen.
- Stell jeden Schnappschuss aus der Liste wieder her oder lösch ihn.

## Geführtes Bisect

Markier Commits als gut und schlecht, sieh zu, wie der Bereich enger wird, und
lande beim ersten schlechten Commit. Gitcito verfolgt mit, wie viele Schritte
noch bleiben, damit du weißt, ob du zwei Fragen von der Antwort entfernt bist
oder zehn.

![Geführtes Bisect](../../screenshots/bisect.webp)

### Einen Befehl entscheiden lassen

Sobald der Bereich abgesteckt ist, übergibt **Einen Befehl entscheiden lassen**
die gesamte Suche an `git bisect run`. Git checkt jeden Kandidaten aus, führt
deinen Befehl aus und liest dessen Exit-Code:

| Exit-Code | Bedeutet |
|-----------|-------|
| `0` | Gut — der Fehler steckt nicht hier |
| `125` | Lässt sich nicht testen; überspringen |
| alles andere | Schlecht |

Eine Testsuite spricht diese Sprache bereits, deshalb ist `npm test` meist schon
die ganze Antwort. Gitcito bietet die Skripte dieses Projekts als Ein-Klick-
Vorlagen an, streamt die Ausgabe während des Laufs und landet beim ersten
schlechten Commit, ohne dass du eine einzige Frage beantwortest.

![Das Befehlsfeld, bereit die Suche an eine Testsuite zu übergeben](../../screenshots/bisect-run.webp)

**Worauf du achten solltest.** Der Befehl läuft bei *jedem* Commit, den git
testet — ein Befehl, der deployt, veröffentlicht oder außerhalb des Repositorys
schreibt, tut das also mehrfach. Beschränk ihn auf etwas, das nur liest und
berichtet. **Stoppen** beendet den Lauf und lässt die Sitzung offen, sodass du
von Hand weitermarkieren kannst; **Bisect abbrechen** beendet das Bisect ganz.

Ein Befehl, der aus einem unabhängigen Grund fehlschlägt — etwa eine an dieser
Stelle der Historie fehlende Abhängigkeit — markiert einen guten Commit als
schlecht und schickt die Suche in die falsche Richtung. Ein Wrapper-Skript, das
mit `125` beendet, ist gits Ausweg daraus.

## Undo / Redo

Die meisten Operationen legen einen Eintrag auf einen Undo-Stapel, sodass
<kbd>⌘Z</kbd> die letzte davon rückgängig macht, wo git es zulässt.

**Siehe auch:** [Was sich geändert hat seit](range-diff.md) · [Stashes](stashes.md)
