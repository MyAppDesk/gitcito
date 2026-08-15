---
title: Diffs & Vorschauen
category: Änderungen lesen
order: 20
summary: Geteilte Ansicht, wortgenaue Hervorhebung, Bild-Diffs und Dateivorschauen.
keywords: diff geteilt split side-by-side nebeneinander wortgenau word level whitespace leerzeichen bild image diff vorschau preview markdown docx pdf
---

# Diffs & Vorschauen

## Einen Diff lesen

| Schalter | Was er tut |
|---|---|
| **Unified ↔ geteilt** | Nebeneinander, wenn du vergleichen willst; übereinander, wenn du lesen willst |
| **Wortgenau** | Hebt nur die geänderten Tokens innerhalb einer bearbeiteten Zeile hervor — rot auf der alten, grün auf der neuen |
| **Whitespace ignorieren** | Blendet Neu-Einrückungen aus, damit die eigentliche Änderung sichtbar wird |
| <kbd>⌘F</kbd> | Suchen innerhalb des Diffs, mit Sprüngen zum nächsten/vorherigen Treffer |

![Geteilter Diff mit wortgenauer Hervorhebung](../../screenshots/split-diff.webp)

Über jedem Diff sitzt die [semantische Zusammenfassung](semantic-diff.md) — was
sich geändert hat, Symbol für Symbol statt Zeile für Zeile.

## Bild-Diffs

Geänderte Bilder bekommen einen echten Vergleich: nebeneinander, oder mit einem
Schieberegler, den du zwischen Vorher und Nachher ziehst.

![Bild-Diff](../../screenshots/image-diff.webp)

## Alles in der Vorschau

Der Modus **Vorschau** rendert die Datei, statt ihren Quelltext zu zeigen:
Markdown, Word (`.docx`), Excel (`.xlsx`), PDF, Video, Audio, Bilder — und für
alles andere Code mit Syntaxhervorhebung.

![Markdown-Vorschau](../../screenshots/markdown-preview.webp)

## Der Dateien-Tab

Der Tab **Dateien** in der linken Seitenleiste durchsucht das Arbeitsverzeichnis
selbst, mit Status-Badges an Ordnern (hinzugefügt / geändert / gelöscht), die
zusammenfassen, was darin steckt.

![Der Dateien-Tab mit einer Vorschau](../../screenshots/file-tree.webp)

![Ordner-Badges, die aufsummieren, was sich in jedem Ordner geändert hat](../../screenshots/tree-badges.webp)

**Siehe auch:** [Semantischer Diff](semantic-diff.md) · [Staging](staging.md)
