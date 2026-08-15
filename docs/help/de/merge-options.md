---
title: Merge-Optionen
category: Branches & Eingriffe
order: 45
summary: Die git-merge-Schalter für Merges, die jedes Mal auf dieselbe Weise schiefgehen — -X ours, Whitespace, Squash, Subtree.
keywords: merge optionen strategie strategy -X ours theirs ignore-space-change whitespace leerzeichen squash no-ff ff-only no-commit subtree resolve ort recursive log --merge warum konflikt conflict
---

# Merge-Optionen

Ein schlichter Merge ist ein Knopf, und meistens ist damit alles gesagt. Diese
Seite ist für die anderen Fälle: die Lockfile, die bei jedem Merge kollidiert,
die Datei, die jemand neu eingerückt hat, das eingebettete Fremdprojekt, dessen
Pfade nicht zusammenpassen. Git hat für alle drei seit Jahren Schalter; sie sind
nur in einer Manpage vergraben, die mitten im Konflikt niemand aufschlägt.

Rechtsklick auf einen Branch → **Mergen mit Optionen…** — in den Branch- und
Remote-Zeilen der Seitenleiste *und* auf den farbigen Ref-Badges im Graphen, die
sich einen Menüblock teilen — oder `⌘K` → **Mergen mit Optionen**.

![Merge-Optionen, mit dem exakten git-Befehl darunter ausgeschrieben](../../screenshots/merge-options.webp)

Der Befehl wird ausgedruckt, während du ihn zusammenbaust. Er ist da, um gegen
das Handbuch geprüft zu werden — und um beim nächsten Mal aus einem Terminal
ausgeführt zu werden, ohne diesen Dialog.

## Wenn ein Hunk kollidiert

| Wahl | Flag | Bedeutet |
|--------|------|-------|
| Anhalten und mich fragen | — | Die Voreinstellung. Du löst es auf |
| Die Seite dieses Branches behalten | `-X ours` | Kollidierende Hunks werden zu dem aufgelöst, was schon ausgecheckt ist |
| Die hereinkommende Seite nehmen | `-X theirs` | Kollidierende Hunks werden zum hereinkommenden Branch aufgelöst |

**`-X ours` ist nicht `-s ours`.** Der Schalter hier entscheidet nur über die
Hunks, die tatsächlich kollidieren; jede andere Änderung aus dem anderen Branch
merged ganz normal. Die Strategie namens `ours` — die Gitcito nicht anbietet —
nimmt deinen Baum im Ganzen und wirft die andere Seite weg. Sie erzeugt einen
Merge-Commit, der behauptet, Arbeit zu enthalten, die er nicht enthält. Diese
Unterscheidung ist das am gründlichsten missverstandene Detail an Git-Merges.

**Er kann nicht alles entscheiden.** Ein Modify/Delete-Konflikt — eine Seite hat
eine Datei bearbeitet, die andere sie gelöscht — ist kein Inhalts-Hunk, und `-X`
lässt ihn für dich liegen. Das ist richtig so: Es gibt keine Version von
„nimm unsere", die beantwortet, ob eine gelöschte Datei zurückkommen soll.

## Whitespace

| Wahl | Flag |
|--------|------|
| Änderungen an bestehendem Whitespace ignorieren | `-X ignore-space-change` |
| Whitespace komplett ignorieren | `-X ignore-space-at-eol`, `-X ignore-all-space` |

Der Fall, für den es das gibt: Ein Branch hat eine Datei neu eingerückt (oder
ein Formatierer hat es getan), der andere hat dieselben Zeilen bearbeitet. Git
sieht zwei Änderungen an einer Zeile und hält an. Mit ignoriertem Whitespace ist
die Neueinrückung keine Änderung, die abzuwägen wäre, und die echte Bearbeitung
merged durch.

Das Ergebnis behält den Whitespace der *anderen* Seite auf den Zeilen, die sie
angefasst hat — ein anschließender Lauf des Formatierers ist also keine schlechte
Idee.

## Was festgehalten wird

| Wahl | Flag | Lässt dich zurück mit |
|--------|------|-----------------|
| Fast-forward, wenn möglich | — | Einem Merge-Commit nur dann, wenn die Historie auseinandergelaufen ist |
| Immer einen Merge-Commit machen | `--no-ff` | Einem Merge-Commit auch bei einem Fast-forward, damit der Branch für immer im Graphen sichtbar bleibt |
| Nur Fast-forward, sonst verweigern | `--ff-only` | Nichts, falls ein echter Merge nötig wäre. Nützlich als Prüfung |
| Squash | `--squash` | Den Änderungen gestaged, ohne aufgezeichneten Merge, der Commit ist deiner zu schreiben |
| Mergen, aber nicht committen | `--no-commit` | Dem Merge gestaged und in Arbeit, damit du ihn erst prüfen oder anpassen kannst |

**Squash und `--no-commit` sind nicht dasselbe.** Squash vergisst, dass
überhaupt ein Merge stattgefunden hat: Git zeichnet keinen zweiten Parent auf,
und der Branch wird beim nächsten Mal ungemerged aussehen. `--no-commit` ist ein
laufender Merge, der schlicht auf dich wartet — `MERGE_HEAD` ist gesetzt, und
ein Commit schließt ihn ganz normal ab.

**`--ff-only` scheitert nicht leise.** Wäre ein Merge-Commit nötig, verweigert
Git, und nichts bewegt sich — was es genau zur guten Plausibilitätsprüfung vor
einem skriptgesteuerten Merge macht.

## Strategie

| Strategie | Für |
|----------|-----|
| Voreinstellung (`ort`) | Alles. Gits moderner Drei-Wege-Merge |
| `subtree` | Die beiden Seiten liegen unter verschiedenen Pfaden — ein Projekt, das in ein Unterverzeichnis dieses hier eingebettet ist |
| `resolve` | Der alte Drei-Wege-Merge. Gelingt gelegentlich dort, wo `ort` bei einer Criss-cross-Historie aufgibt |

`-s subtree` ist der, den man sich merken sollte. Aktualisierungen aus einem
Projekt zu mergen, das unter `vendor/parser/` liegt, läse sich sonst als „jede
Datei gelöscht, jede Datei hinzugefügt"; die Subtree-Strategie rechnet den
Pfadversatz zuerst aus. Den gesamten Ablauf findest du unter
[Subtrees](subtree.md).

## Warum das kollidiert

Im [Konflikt-Resolver](conflicts.md) gibt es einen Knopf **Warum das
kollidiert**. Er führt `git log --merge` für die Datei aus, die vor dir liegt,
und listet pro Seite die Commits auf, die sie berührt haben, seit die Branches
sich getrennt haben.

![Die Commits von jeder Seite, die die konfliktbehaftete Datei berührt haben](../../screenshots/conflict-why.webp)

Konfliktmarker sagen, *was* kollidiert. Das hier sagt, *wer es wann und warum
geändert hat* — was meist die Frage ist, die die Auflösung tatsächlich
entscheidet, und der Grund, jemanden zu fragen, bevor du dich für eine Seite
entscheidest.

Zeigt es nichts, hat keine der beiden Seiten eine Änderung an genau dieser
Datei committet: Die Kollision kommt von einer Umbenennung oder einer
Verzeichnisverschiebung weiter oben.

## Grenzen, die man kennen sollte

- **Optionen gelten für einen Merge.** Sie werden nicht gemerkt, und sie ändern
  weder den schlichten Eintrag **In aktuellen mergen** noch das
  Drag-and-drop-Menü.
- **Rückgängig funktioniert weiterhin**: Ein mit Optionen ausgeführter Merge
  legt denselben Undo-Eintrag an, der auf `ORIG_HEAD` zurücksetzt.
- **Octopus-Merges** (mehr als zwei Branches auf einmal) werden hier nicht
  angeboten.
- **Die Einträge „Merge X in Y" pro Ref im Commit-Menü** bleiben schlichte
  Merges. Nimm das Ref-Badge selbst, wenn du die Optionen willst.
- **`-X` entscheidet stillschweigend.** Nichts markiert, welche Hunks
  automatisch aufgelöst wurden — lies bei einem wichtigen Merge also hinterher
  das Diff, statt der Abwesenheit von Konflikten zu vertrauen.

Siehe auch: [Mergen & Rebasen](merging.md) · [Konflikte](conflicts.md) ·
[Subtrees](subtree.md) · [Konfliktradar](conflict-radar.md)
