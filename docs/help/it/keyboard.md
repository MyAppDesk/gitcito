---
title: Tastiera e scorciatoie
category: Per iniziare
order: 2
summary: I tasti che vale la pena imparare, e come riassegnarli.
keywords: scorciatoie shortcuts tastiera keyboard tasti cheatsheet riassegna hotkey palette
---

# Tastiera e scorciatoie

Premi <kbd>?</kbd> in qualsiasi punto per il promemoria.

![Il promemoria delle scorciatoie](../../screenshots/cheatsheet.webp)

## Quelle che vale la pena imparare

| Tasti | Cosa fanno |
|---|---|
| <kbd>⌘K</kbd> | [Tavolozza dei comandi](search.md) — branch, commit, file, azioni |
| <kbd>⌘⇧F</kbd> | [Ricerca nel codice](search.md) su tutto l'albero di lavoro |
| <kbd>⌘⇧V</kbd> | [Cassaforte](vault.md) |
| <kbd>⌘O</kbd> / <kbd>Ctrl+O</kbd> | Apri un repository |
| <kbd>⌘,</kbd> / <kbd>Ctrl+,</kbd> | Apri le impostazioni |
| <kbd>⌘F</kbd> | Cerca dentro il file o il diff che stai leggendo |
| <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> | Apri il selettore di repository o gruppi per una nuova scheda |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | Chiudi la scheda attiva — o la finestra, quando non ne resta nessuna |
| <kbd>⌘1</kbd>–<kbd>⌘9</kbd> / <kbd>Ctrl+1</kbd>–<kbd>Ctrl+9</kbd> | Passa a una scheda per posizione |
| <kbd>⌘⇧T</kbd> | Riapri l'ultima scheda chiusa |
| <kbd>?</kbd> | Questo promemoria |

## Muoversi senza il mouse

| Dove | Tasti |
|---|---|
| Grafo dei commit | <kbd>↑</kbd> <kbd>↓</kbd> oppure <kbd>j</kbd> <kbd>k</kbd> |
| Elenchi di file (commit, WIP, stash) | Gli stessi |
| [Macchina del tempo](time-machine.md) | <kbd>←</kbd> <kbd>→</kbd>, <kbd>⇧</kbd> per dieci, <kbd>Home</kbd>/<kbd>End</kbd> |
| [Mission control](mission-control.md) | <kbd>↑</kbd><kbd>↓</kbd>, <kbd>Enter</kbd> per aprire, <kbd>f</kbd>/<kbd>p</kbd> per fetch/pull, <kbd>/</kbd> per filtrare |
| Casella del messaggio di commit | <kbd>↑</kbd> <kbd>↓</kbd> richiamano i tuoi messaggi recenti |

## Riassegnare

**Impostazioni → Scorciatoie**. Le scorciatoie di navigazione principali
(tavolozza, ricerca nel codice, cassaforte, apri repository, impostazioni) sono
riassegnabili, con rilevamento dei conflitti e un ripristino per singola
scorciatoia.

Le scorciatoie fisse qui sopra non sono riassegnabili, e sono rifiutate anche
come _destinazione_: l'app risponde a <kbd>⌘T</kbd>, <kbd>⌘W</kbd>,
<kbd>⌘1</kbd>–<kbd>⌘9</kbd>, <kbd>⌘⇧T</kbd>, <kbd>⌘S</kbd>, <kbd>⌘Z</kbd>,
<kbd>⌘⇧Z</kbd> e <kbd>⌘F</kbd> prima di consultare le tue assegnazioni, quindi
una scorciatoia assegnata a una di queste sembrerebbe impostata e non scatterebbe
mai. Se ne scegli una, l'editor te lo dice invece di accettarla.

![Le scorciatoie riassegnabili nelle impostazioni](../../screenshots/settings-shortcuts.webp)

**Vedi anche:** [Tavolozza dei comandi e ricerca](search.md)
