---
title: Mergen & Rebasen
category: Branches & Eingriffe
order: 41
summary: Mergen, rebasen, Refs vergleichen und eine Ref auf eine andere ziehen — in der Seitenleiste oder im Graphen.
keywords: merge mergen rebase rebasen fast-forward vergleichen compare refs ziehen drag drop branch graph ref badge tag remote revert reset cherry-pick
---

# Mergen & Rebasen

## Aus der Seitenleiste

Rechtsklick auf einen Branch für **In aktuellen mergen** oder **Rebase auf** —
oder **Mergen mit Optionen…**, wenn der schlichte Merge derjenige ist, der immer
wieder schiefgeht; siehe [Merge-Optionen](merge-options.md).

## Eine Ref auf eine andere ziehen

Die schnellste Geste der App: Nimm einen Branch auf und lass ihn auf einem
anderen fallen. Gitcito öffnet ein kleines Menü mit dem, was dieser Drop
bedeuten könnte, und tut nichts, bis du dich entscheidest.

![Einen Branch auf einen anderen ziehen öffnet das Menü mit dem, was der Drop bedeuten könnte](../../screenshots/clip-branch-drop.webp)

Es funktioniert an **beiden** Orten, an denen Refs gezeigt werden — den
Branch-, Remote- und Tag-Zeilen der Seitenleiste und den farbigen
**Ref-Badges im Graphen** selbst. Zieh zwischen ihnen in jeder Kombination; das
Drop-Ziel leuchtet auf, während du darüber schwebst.

| Drop | Bedeutet |
|------|-------|
| **Merge {source} → {target}** | Checkt das Ziel aus und merged die Quelle hinein |
| **Rebase {source} auf {target}** | Spielt die Commits der Quelle oben auf dem Ziel neu ab |
| **Vergleichen** | Öffnet den [Vergleich](#beliebige-zwei-refs-vergleichen) — ändert nichts |

**Das Menü bietet nur an, was Git kann.** Mergen committet auf das Ziel, also
muss das Ziel ein lokaler Branch sein — in einen Tag oder eine
Remote-Tracking-Ref kannst du nicht mergen. Rebasen schreibt die Quelle um,
also muss die Quelle ein lokaler Branch sein. Lass einen Tag auf einem
Remote-Branch fallen, und alles, was du bekommst, ist *Vergleichen* — weil das
tatsächlich alles ist, was es gibt.

Rebase fragt vorher nach: Es gibt jedem neu abgespielten Commit einen neuen
Hash, was einen Force-Push bedeutet, wenn der Branch schon veröffentlicht ist.
Merge fragt nicht — es fügt nur hinzu. So oder so bringt dich ein
**Rückgängig** wieder zurück.

## Merge

Fast-forward, wenn möglich, oder erzwungener Merge-Commit, wenn du die
Topologie festgehalten haben willst. Gibt es Konflikte, landest du
[im Resolver](conflicts.md).

## Beliebige zwei Refs vergleichen

Wähle eine Basis und eine Vergleichs-Ref — Branch, Tag oder rohe SHA, mit einem
Tauschknopf — und du bekommst Ahead/Behind-Zähler, die Commits, die nur auf
einer Seite existieren, das vollständige kombinierte Diff und eine
Ein-Klick-Übergabe zum **PR öffnen**.

![Zwei Branches vergleichen: was jeder Seite eigen ist, und das kombinierte Diff](../../screenshots/branch-compare.webp)

Erreichbar aus der Seitenleiste (Vergleich mit dem aktuellen Branch), dem Menü
Werkzeuge oder über <kbd>⌘K</kbd>.

## Cherry-Pick, Revert, Reset

Alle drei aus dem Kontextmenü des Graphen. Reset bietet **soft / mixed / hard**
und schreibt dir aus, was jede Variante mit deinem Arbeitsverzeichnis anstellt,
bevor du wählst.

Wähle vorher mehrere Commits aus, und Cherry-Pick wendet die gesamte Auswahl
an, der Reihe nach.

## Bevor du irgendetwas merged

Das [Konfliktradar](conflict-radar.md) prüft jeden Branch gegen eine Basis und
sagt dir, welche sich streiten werden — ohne irgendetwas auszuchecken.

**Siehe auch:** [Interaktives Rebase](rebase.md) · [Gestapelte Branches](stacks.md) · [Konfliktradar](conflict-radar.md)
