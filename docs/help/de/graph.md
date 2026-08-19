---
title: Der Commit-Graph
category: Repository & Historie
order: 10
summary: Historie lesen: Spuren, Refs, Spalten, Filter und Mehrfachauswahl.
keywords: graph graf historie verlauf commits spuren lanes branches merges spalten columns filter linear first-parent
---

# Der Commit-Graph

Branches, Merges und Octopus-Merges sauber gezeichnet, hell oder dunkel. Das
Rendering ist gefenstert, deshalb scrollt ein Repository mit hunderttausend
Commits wie eines mit hundert.

| | |
|---|---|
| ![Commit-Graph, hell](../../screenshots/graph-light.webp) | ![Commit-Graph, dunkel](../../screenshots/graph-dark.webp) |

## Navigieren

- <kbd>↑</kbd> <kbd>↓</kbd> (oder <kbd>j</kbd> <kbd>k</kbd>) bewegen die Auswahl.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd>-Klick nimmt einen Commit in eine
  **Mehrfachauswahl** auf oder wieder heraus; <kbd>⇧</kbd>-Klick nimmt einen
  Bereich. Mit mehreren ausgewählten Commits kannst du per Rechtsklick ein
  Cherry-Pick auf den aktuellen Branch machen, eine zusammenhängende Folge
  squashen, einen kombinierten Patch exportieren oder ihre SHAs kopieren.
- Commits, die mit deinem **letzten Fetch oder Pull** hereinkamen, werden als neu
  markiert.

## Ihn zeigen lassen, was du willst

- **Lineare Ansicht** (first-parent) blendet alles Hereingemergte aus und lässt
  den Hauptstrang übrig.
- **Nach Pfad filtern**: Rechtsklick auf eine Datei oder einen Ordner → *Graph
  nach diesem Pfad filtern*, und nur die Commits, die ihn berührt haben, bleiben
  hell.

![Graph heruntergefiltert auf einen einzigen Pfad](../../screenshots/graph-path-filter.webp)

- **Spalten**: Branch-, Nachrichten-, Autor-, Datums-, SHA-, Signatur- und
  Deployment-Spalten anzeigen, ausblenden, in der Größe ändern und umsortieren.
- **Stil**: Einstellungen → Themes → **Graph** — Spurenpalette (8 eingebaute,
  eigene oder KI-generierte), Eckenstil, Zeilendichte und Linienstärke, mit einer
  Live-Vorschau als Mini-Graph.

![Graph-Stileinstellungen mit Live-Vorschau](../../screenshots/settings-graph.webp)

## Commit-Details

Wählst du einen Commit aus, siehst du seine geänderten Dateien (als Baum oder
flach), Autor, SHA, Co-Autoren und seine Signatur. `#123`-Referenzen und
`@mentions` werden automatisch mit deinem Host verlinkt.

Die Dateiliste lässt sich mit den üblichen Gesten mehrfach auswählen
(<kbd>⌘</kbd>/<kbd>Strg</kbd>-Klick, <kbd>⇧</kbd>-Klick,
<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd>). Rechtsklick auf die Auswahl → *{n}
Dateien in den Arbeitsbaum zurückholen* übernimmt diese Dateien genau so, wie
dieser Commit sie hatte: nach einer einzigen Bestätigung werden die
Arbeitskopien überschrieben — HEAD und Index bleiben unangetastet.

![Durch die Commit-Details laufen](../../screenshots/clip-commit-details.webp)

**Siehe auch:** [Blame & Dateiverlauf](blame.md) · [Suche](search.md) · [Zeitmaschine](time-machine.md)
