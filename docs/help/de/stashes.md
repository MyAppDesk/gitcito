---
title: Stashes
category: Sync & viele Repos
order: 52
summary: Teilweise Stashes, dateiweises Anwenden und Stash → Branch.
keywords: stash stashes stashen teilweise partial keep-index anwenden apply pop poppen verwerfen drop ungetrackt untracked branch
---

# Stashes

Stashen ist in Gitcito kein Alles-oder-nichts.

| Aktion | Was sie tut |
|---|---|
| **Stashen** | Alles, auf Wunsch samt ungetrackter Dateien, mit einer Nachricht |
| **Teilweiser Stash** | Hak nur die Dateien an, die du willst; optional `--keep-index` |
| **Anwenden / Poppen** | Den ganzen Stash — oder **nur einen Teil seiner Dateien** |
| **Stash → Branch** | `git stash branch` — der Notausgang, wenn ein Stash sich nicht sauber anwenden lässt |

Wählst du einen Stash aus, siehst du seine Dateien und Diffs, genau wie bei
einem Commit.

Die Dateiliste lässt sich mit denselben Gesten mehrfach auswählen wie beim
[Staging](staging.md) — <kbd>⌘</kbd>/<kbd>Strg</kbd>-Klick, <kbd>⇧</kbd>-Klick,
<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> — und ein Rechtsklick (oder der Knopf *n
Dateien anwenden*) stellt nur die Auswahl wieder her.

![Ein teilweiser Stash: hake nur die Dateien an, die hinein sollen](../../screenshots/stash-partial.webp)

## Wenn ein Stash sich nicht anwenden lässt

Würde das Anwenden eines Stashes ungetrackte Dateien überbügeln, hält git an.
Gitcito bietet an, sie zu überschreiben und es erneut zu versuchen, statt dich
mit dem Herausfinden der richtigen Beschwörungsformel allein zu lassen.

Ist das Arbeitsverzeichnis zu weit weggewandert, erzeugt **Stash → Branch** den
Branch neu, aus dem der Stash entstanden ist, wendet ihn dort sauber an und
verwirft den Stash.

## Nicht mit Snapshots zu verwechseln

[WIP-Snapshots](recovery.md) sind automatisch und versteckt; Stashes sind
absichtlich und werden aufgelistet. Snapshots rühren deine Stash-Liste nie an.

**Siehe auch:** [Wiederherstellung](recovery.md) · [Staging](staging.md)
