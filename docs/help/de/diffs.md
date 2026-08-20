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
| **Umbruch** (nur geteilte Ansicht) | Bricht lange Zeilen in ihrer Spalte um, statt sie zu scrollen |
| **Verknüpft** (geteilt, ohne Umbruch) | Scrollt beide Hälften gemeinsam, vertikal und seitlich — aus scrollt jede Spalte für sich |
| <kbd>⌘F</kbd> | Suchen innerhalb des Diffs, mit Sprüngen zum nächsten/vorherigen Treffer |

Der Umbruch ist standardmäßig aus: Eine Zeile bleibt eine Zeile, damit beide
Seiten Zeile für Zeile vergleichbar bleiben, und jede Hälfte scrollt mit eigener
Leiste zur Seite. Schalte ihn ein, wenn du eine lange Zeile lieber liest als
verfolgst — dafür steht eine über drei Zeilen umgebrochene Zeile ihrem
Gegenstück nicht mehr gegenüber. Jeder Schalter merkt sich seinen Zustand über
Dateien und Sitzungen hinweg.

Ohne Umbruch scrollen beide Hälften standardmäßig **verknüpft** — vertikal, was
die Zeilen einander gegenüber hält, und seitlich, damit Spalte 90 links über
Spalte 90 rechts steht. Löse die Verknüpfung, wenn die Seiten
auseinandergelaufen sind — ein eingerückter Block gegen einen nicht
eingerückten, eine Umbenennung, die jede Zeile verschoben hat — oder wenn du
zwei weit auseinanderliegende Stellen derselben Datei vergleichen willst, und
stelle jede Hälfte dort ab, wo ihr Inhalt liegt.

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

## Sehr große Dateien

Vorschauen und die Dateiansicht laden eine Datei vollständig in den Speicher,
daher lehnen beide Dateien oberhalb einer Größengrenze ab (32 MB für
Vorschauen, 16 MB für Text) und zeigen stattdessen, wie groß die Datei ist.
**Trotzdem laden** hebt die Grenze für genau diese Datei auf — nichts ist
unerreichbar, große Ladevorgänge sind nur opt-in. Dateien und Diffs mit mehr
als ein paar tausend Zeilen werden weiterhin vollständig gerendert, aber aus
dem Sichtbereich gescrollte Zeilen werden nicht mehr layoutet und gezeichnet —
ein riesiger Lockfile-Diff kostet damit nicht mehr den Speicher eines ganzen
Laptops.

![Eine Datei über der Größengrenze, mit Trotzdem laden](../../screenshots/file-too-large.webp)

## Der Dateien-Tab

Der Tab **Dateien** in der linken Seitenleiste durchsucht das Arbeitsverzeichnis
selbst, mit Status-Badges an Ordnern (hinzugefügt / geändert / gelöscht), die
zusammenfassen, was darin steckt.

![Der Dateien-Tab mit einer Vorschau](../../screenshots/file-tree.webp)

![Ordner-Badges, die aufsummieren, was sich in jedem Ordner geändert hat](../../screenshots/tree-badges.webp)

**Siehe auch:** [Semantischer Diff](semantic-diff.md) · [Staging](staging.md)
