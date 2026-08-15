---
title: Befehlspalette & Suche
category: Repository & Historie
order: 11
summary: Überall hinspringen und den Baum oder die Historie durchsuchen.
keywords: befehlspalette palette suche suchen command palette search grep code search pickaxe finden fuzzy springen
---

# Befehlspalette & Suche

## Die Palette — <kbd>⌘K</kbd>

Springe per Fuzzy-Suche zu einem **Branch** (checkt ihn aus), einem **Commit**
(scrollt den Graph dorthin), einer **Datei im Arbeitsverzeichnis** oder einer
**Aktion** — Fetch, Pull, Push, Stash, Terminal, Reflog, Einstellungen und jede
Funktion aus diesem Handbuch.

Sie lernt mit: Was du zuletzt benutzt hast, kommt zuerst, und was du oft
benutzt, steht über dem, was du selten benutzt.

![Die Befehlspalette](../../screenshots/command-palette.webp)

## Code durchsuchen — <kbd>⌘⇧F</kbd>

Zwei verschiedene Fragen, ein Dialog:

| Modus | Frage, die er beantwortet |
|---|---|
| **Inhalte** | „Wo steht dieser Text gerade?" — `git grep` über getrackte *und* ungetrackte Dateien, mit Groß-/Kleinschreibung, ganzem Wort und Regex. |
| **Historie (Pickaxe)** | „Wann ist dieser Text aufgetaucht oder verschwunden?" — `git log -S` / `-G`. |

Treffer kommen mit Syntax-Hervorhebung zurück, die Fundstelle markiert, nach
Datei gruppiert und bis auf die genauen Zeilen aufklappbar. Klick einen an, um
die Datei an dieser Zeile zu öffnen — oder den Commit, der sie eingeführt hat.

![Ergebnisse der Code-Suche](../../screenshots/code-search.webp)

## Den Graph filtern

Das Suchfeld über dem Graph filtert Commits nach Nachricht, Autor, SHA oder
Deployment-Status. Für „nur Commits, die diese Datei angefasst haben" nimmst du
den Pfadfilter — siehe [Der Commit-Graph](graph.md).

**Siehe auch:** [Der Commit-Graph](graph.md) · [Tastatur & Shortcuts](keyboard.md)
