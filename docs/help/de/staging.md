---
title: Staging
category: Mit Änderungen arbeiten
order: 30
summary: Ganze Dateien, einzelne Hunks oder einzelne Zeilen stagen.
keywords: staging stagen stage unstage entfernen verwerfen discard hunk zeilen lines index teilweise partial
---

# Staging

Das Commit-Panel hat drei Listen: **Konflikte**, **Nicht gestagt** und
**Gestagt**. Jede lässt sich einklappen, und jede merkt sich, ob du sie offen
gelassen hast.

![Ein nicht gestagtes Diff, daneben die Bedienelemente für Hunk und Datei](../../screenshots/line-staging.webp)

## Drei Genauigkeitsstufen

| Stufe | Wie |
|---|---|
| **Datei** | Klick auf das ✚ in der Zeile — oder wähle mehrere Zeilen aus und stage sie alle |
| **Hunk** | Öffne das Diff und nutze den Knopf in der Hunk-Kopfzeile |
| **Zeile** | Markiere Zeilen im Diff und stage genau diese |

Zeilenweises Staging ist das, was es praktikabel macht, ein
Debug-`console.log` aus einem Commit herauszuhalten, ohne es vorher zu löschen.

## Verwerfen

Verwerfen arbeitet auf denselben Stufen und fragt immer nach. Ungetrackte
Dateien werden gelöscht; getrackte kehren in ihren gestagten (oder committeten)
Zustand zurück.

## Tastatur

<kbd>↑</kbd> <kbd>↓</kbd> (oder <kbd>j</kbd> <kbd>k</kbd>) laufen durch die
Dateilisten, mit <kbd>⇧</kbd> für einen Bereich und <kbd>⌘</kbd>/<kbd>Ctrl</kbd>
zum Umschalten einzelner Dateien.

<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> erweitert die Auswahl von der zuletzt
geklickten Zeile aus. Ein Rechtsklick auf die Auswahl staged, unstaged, stasht
oder verwirft alles darin auf einmal.

## Pfade kopieren

Ein Rechtsklick auf eine uncommittete Datei bietet **Dateipfad kopieren**
(absolut, mit den Trennzeichen der Plattform) und **Relativen Dateipfad
kopieren** (`src/index.ts`, ohne führendes `./`). Mehrere ausgewählte Dateien
landen eine pro Zeile, in Listenreihenfolge. Gelöschte Dateien bleiben
aktiviert — kopiert wird nur der Pfadtext. Ordner kopieren weiterhin den
Ordnerpfad.

## Bevor du committest

Gitcito prüft ein paar Dinge und fragt einmal nach — nie stillschweigend:

- eine Datei, die nach einem **Geheimnis** aussieht (`.env`, `*.pem`,
  `id_rsa`…),
- ein **sehr großer** Blob (Schwellwert unter Einstellungen → Sicherheit),
- ein Commit **direkt auf einen geschützten Branch** (voreingestellt
  `main`/`master`).

Jede dieser Warnungen bietet ein *Ignorieren & nicht mehr tracken* mit einem
Klick an. Siehe [Sicherheit & Geheimnisse](security.md).

**Siehe auch:** [Committen](committing.md) · [Diffs](diffs.md) · [Einarbeiten](absorb.md)
