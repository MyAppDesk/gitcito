---
title: Branches, Remotes & die Seitenleiste
category: Branches & Eingriffe
order: 40
summary: Alles, was die linke Seitenleiste kann, und angeheftete Branches.
keywords: branch branches erstellen auschecken checkout umbenennen löschen remote angeheftet pinned seitenleiste sidebar presence
---

# Branches, Remotes & die Seitenleiste

Eine einzige umsortierbare, durchsuchbare Seitenleiste beherbergt **Branches,
Remotes, Tags, Stashes, Worktrees und Submodule**. Jeder Abschnitt lässt sich
ausblenden oder umsortieren (Einstellungen → Layout), und das Filterfeld gilt
für alle.

![Die Seitenleiste, mit angehefteten Branches ganz oben](../../screenshots/pinned-branches.webp)

## Branches

Erstellen, auschecken, umbenennen und löschen — lokal wie remote. Branch-Zeilen
zeigen:

- **↑voraus / ↓zurück** gegenüber ihrem Upstream,
- **Presence-Badges pro Remote** (welche Remotes diesen Branch haben),
- einen **Risikopunkt** nach einem Scan des [Konflikt-Radars](conflict-radar.md),
- eine **⟳-Markierung**, wenn der Remote
  [die Historie umgeschrieben hat](range-diff.md).

Branches mit `/` im Namen werden automatisch in aufklappbare Ordner gefaltet.

![Branch-Namen mit Schrägstrich, zu einem Baum gefaltet](../../screenshots/branch-grouping.webp)

## Angeheftete Branches

Markiere die Branches, zu denen du immer wieder zurückkehrst, mit einem Stern —
fahre über die Zeile und klicke ★, oder Rechtsklick → *Branch anheften*. Sie
tauchen in einer Gruppe **Angeheftet** oben im Abschnitt "Lokal" auf, pro
Repository gemerkt, und bleiben zugleich an ihrem gewohnten Platz darunter.

## Einen Remote-Branch auschecken

Doppelklicke einen Remote-Branch, um den lokalen Branch anzulegen, der ihn
trackt. Existiert bereits ein lokaler Branch dieses Namens und ist er
**divergiert**, fragt Gitcito, wie abgeglichen werden soll — rebasen, mergen
oder zurücksetzen — und bietet an, den Branch vorher zu sichern.

![Die Abfrage bei divergiertem Branch: rebasen, mergen oder zurücksetzen, mit Backup-Option](../../screenshots/diverged-checkout.webp)

**Siehe auch:** [Mergen & Rebasen](merging.md) · [Worktrees](worktrees.md)
