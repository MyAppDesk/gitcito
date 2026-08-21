---
title: Workspaces, Tabs & Gruppen
category: Erste Schritte
order: 3
summary: Viele Repositorys, ohne unterzugehen: Tabs, Gruppen, Ordner und Workspaces.
keywords: workspace arbeitsbereich tabs gruppen ordner mehrere repos organisieren wechseln layout
---

# Workspaces, Tabs & Gruppen

Drei Ebenen, von der lockersten zur festesten.

## Tabs

Ein Repository, ein Tab. Mit <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> öffnest du die
Auswahl für einen neuen Tab, mit <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> schließt du den
aktiven. Du kannst sie außerdem per Drag umsortieren, mit der mittleren Maustaste
schließen oder mit <kbd>⌘⇧T</kbd> den zuletzt geschlossenen wieder öffnen.
Rechtsklick auf einen Repository-Tab (oder einen Chip in einer
[Gruppe](#gruppen)) öffnet das [Repository-Kontextmenü](repo-menu.md) — Alias,
Worktrees, GitHub, Terminal, Anzeigen, Editor und Entfernen.
Schließt du den letzten Tab, schließt <kbd>⌘W</kbd> stattdessen das Fenster. Ein
Punkt auf dem Tab bedeutet nicht committete Arbeit; ein anderer bedeutet
Konflikte.

Erscheint eine Warnung beim Schließen, bricht <kbd>Escape</kbd> immer ab.
<kbd>Enter</kbd> bestätigt nur, wenn der Tab sauber ist — bei nicht committeten
Änderungen oder Konflikten zwingt dich die Warnung absichtlich, zum Button zu
greifen, damit ein versehentlicher Tastendruck nach <kbd>⌘W</kbd> keine Arbeit
schließen kann, die du noch festhieltest.

## Gruppen

Bündle zusammengehörige Repositorys in einem benannten, farblich markierten
**Gruppen-Tab**. Innerhalb einer Gruppe bekommst du eine zweite Zeile mit einem
Chip pro Repository, und die Gruppe selbst kann in einem Rutsch **alles fetchen**
oder **alles pullen**.

![Ein Gruppen-Tab mit mehreren Repositorys](../../screenshots/repo-groups.webp)

Gruppen können **Ordner enthalten, beliebig tief verschachtelt**: Rechtsklick auf
die Gruppe → *Neuer Ordner…*, dann zieh Repositorys auf einen Ordner-Chip. Jeder
Ordner bekommt eine Farbe, klappt zu einem Chip mit Zähler zusammen, aggregiert
die Status-Punkte von allem, was in ihm steckt, und kann seinen ganzen Teilbaum
fetchen oder pullen.

![Ordner in der Tab-Leiste der Gruppe, jeder ein Chip mit Zähler — Internal verschachtelt in Services](../../screenshots/nested-folders.webp)

> Ordner organisieren nur. Löschst du einen, wandern seine Repositorys eine Ebene
> nach oben — ein Repository wird dabei nie geschlossen.

## Workspaces

Ein Workspace ist eine **komplette gespeicherte Tab-Leiste**. Ein Wechsel tauscht
alle Tabs auf einmal aus: `Work` und `Personal` treten sich nicht mehr gegenseitig
auf die Füße.

Der Workspace-Name sitzt oben links, neben dem Gitcito-Zeichen. Klick ihn an, um
zu wechseln, anzulegen, umzubenennen, umzusortieren oder zu löschen. Daneben liegt
die Anzeige, die [Mission Control](mission-control.md) für den Workspace öffnet, in
dem du gerade bist.

**Siehe auch:** [Mission Control](mission-control.md) · [Die Kommandozeile](cli.md)
