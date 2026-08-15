---
title: Tastatur & Shortcuts
category: Erste Schritte
order: 2
summary: Die Tasten, die sich zu lernen lohnen — und wie du sie neu belegst.
keywords: shortcuts tastenkürzel tastatur tasten spickzettel cheatsheet neu belegen rebind hotkeys palette befehlspalette
---

# Tastatur & Shortcuts

Drücke überall <kbd>?</kbd> für den Spickzettel.

![Der Spickzettel mit allen Tastenkürzeln](../../screenshots/cheatsheet.webp)

## Die, die sich zu lernen lohnen

| Tasten | Tut |
|---|---|
| <kbd>⌘K</kbd> | [Befehlspalette](search.md) — Branches, Commits, Dateien, Aktionen |
| <kbd>⌘⇧F</kbd> | [Codesuche](search.md) im Arbeitsverzeichnis |
| <kbd>⌘⇧V</kbd> | [Tresor](vault.md) |
| <kbd>⌘O</kbd> / <kbd>Ctrl+O</kbd> | Ein Repository öffnen |
| <kbd>⌘,</kbd> / <kbd>Ctrl+,</kbd> | Einstellungen öffnen |
| <kbd>⌘F</kbd> | In der Datei oder im Diff suchen, die du gerade liest |
| <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> | Repository- oder Gruppenauswahl für einen neuen Tab öffnen |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | Aktiven Tab schließen — oder das Fenster, sobald kein Tab mehr übrig ist |
| <kbd>⌘1</kbd>–<kbd>⌘9</kbd> / <kbd>Ctrl+1</kbd>–<kbd>Ctrl+9</kbd> | Zu einem Tab nach seiner Position springen |
| <kbd>⌘⇧T</kbd> | Zuletzt geschlossenen Tab wieder öffnen |
| <kbd>?</kbd> | Dieser Spickzettel |

## Navigieren ohne Maus

| Wo | Tasten |
|---|---|
| Commit-Graph | <kbd>↑</kbd> <kbd>↓</kbd> oder <kbd>j</kbd> <kbd>k</kbd> |
| Dateilisten (Commit, WIP, Stash) | dieselben |
| [Zeitmaschine](time-machine.md) | <kbd>←</kbd> <kbd>→</kbd>, <kbd>⇧</kbd> für zehn Schritte, <kbd>Home</kbd>/<kbd>End</kbd> |
| [Missionskontrolle](mission-control.md) | <kbd>↑</kbd><kbd>↓</kbd>, <kbd>Enter</kbd> zum Öffnen, <kbd>f</kbd>/<kbd>p</kbd> für Fetch/Pull, <kbd>/</kbd> zum Filtern |
| Commit-Nachrichtenfeld | <kbd>↑</kbd> <kbd>↓</kbd> holt deine letzten Nachrichten zurück |

## Neu belegen

**Einstellungen → Shortcuts**. Die zentralen Navigations-Shortcuts (Palette,
Codesuche, Tresor, Repository öffnen, Einstellungen) lassen sich neu belegen,
mit Konflikterkennung und einem Zurücksetzen pro Shortcut.

Die festen Shortcuts oben lassen sich nicht neu belegen — und sie werden auch
als _Ziel_ abgelehnt: Die App beantwortet <kbd>⌘T</kbd>, <kbd>⌘W</kbd>,
<kbd>⌘1</kbd>–<kbd>⌘9</kbd>, <kbd>⌘⇧T</kbd>, <kbd>⌘S</kbd>, <kbd>⌘Z</kbd>,
<kbd>⌘⇧Z</kbd> und <kbd>⌘F</kbd>, bevor sie überhaupt deine Belegungen
konsultiert. Ein Shortcut, den du auf eine dieser Tasten legst, sähe also
gesetzt aus und würde nie auslösen. Wählst du eine davon, sagt dir der Editor
das, statt sie stillschweigend anzunehmen.

![Neu belegbare Shortcuts in den Einstellungen](../../screenshots/settings-shortcuts.webp)

**Siehe auch:** [Befehlspalette & Suche](search.md)
