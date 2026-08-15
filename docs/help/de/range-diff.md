---
title: Was sich geändert hat seit
category: Änderungen lesen
order: 23
summary: Jemand hat den Branch force-gepusht, den du reviewt hast. Sieh nach, was sich wirklich geändert hat.
keywords: range-diff force push rebase umgeschrieben review interdiff reflog erzwungenes update vergleich
---

# Was sich geändert hat seit

Du hast einen Branch reviewt. Jemand hat ihn rebased und force-gepusht. Ein
normaler Diff ist jetzt wertlos: Nach einem Rebase ist jeder Commit ein neuer
Commit, also sieht alles neu aus.

`git range-diff` stellt die beiden Versionen Commit für Commit gegenüber, und
Gitcito liest die alten Positionen direkt aus dem **Reflog** — es musste also
vorher nichts aufgezeichnet werden, damit das funktioniert.

![Umgeschriebene, neue und entfallene Commits nach einem Force-Push](../../screenshots/range-diff.webp)

| Urteil | Bedeutung |
|---|---|
| **Umgeschrieben** | Derselbe Commit, verändert. Klapp ihn auf für den Interdiff — die Änderung an der Nachricht und die zusätzliche Prüfung, nicht die ganze Datei. |
| **Neu** | Seit deinem letzten Blick dazugekommen. |
| **Entfallen** | Seit deinem letzten Blick verschwunden. |
| **Unverändert** | Hat das Umschreiben unangetastet überstanden. |

## Wie du hinkommst

- **Ein Fetch, der umgeschriebene Historie findet, sagt es dir.** Ein Toast
  nennt den Branch, und seine Zeile unter Remotes bekommt ein **⟳**, das du
  anklicken kannst, um den Vergleich genau bei dem Commit zu öffnen, auf den der
  Branch früher zeigte.
- Rechtsklick auf einen beliebigen Branch → *Was sich geändert hat seit…*
- <kbd>⌘K</kbd> → *Was sich geändert hat seit*

## Frühere Positionen

Die Chips unter den Ref-Feldern sind das Reflog des Branches: erzwungene
Updates, Rebases, Resets, jeweils mit dem Zeitpunkt. Wähl eines aus, und der
Vergleich läuft erneut dagegen. Das ist das ganze Feature — die Historie
darüber, wo ein Branch schon überall war, liegt längst auf deiner Platte.

**Siehe auch:** [Konflikt-Radar](conflict-radar.md) · [Wiederherstellung & Reflog](recovery.md)
