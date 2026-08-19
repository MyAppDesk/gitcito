---
title: Staging
category: Lavorare con le modifiche
order: 30
summary: Metti in stage interi file, singoli hunk o singole righe.
keywords: staging stage unstage scarta discard hunk righe indice parziale
---

# Staging

Il pannello dei commit ha tre elenchi: **In conflitto**, **Non in stage** e **In
stage**. Ciascuno si richiude, e ciascuno ricorda se l'hai lasciato aperto.

![Un diff non in stage, con accanto i controlli per hunk e per file](../../screenshots/line-staging.webp)

## Tre livelli di precisione

| Livello | Come |
|---|---|
| **File** | Clicca la ✚ sulla riga, oppure seleziona più righe e mettile in stage tutte |
| **Hunk** | Apri il diff e usa il pulsante nell'intestazione dell'hunk |
| **Riga** | Seleziona delle righe dentro il diff e metti in stage esattamente quelle |

Lo staging per righe è ciò che rende praticabile tenere un `console.log` di
debug fuori da un commit senza doverlo prima cancellare.

## Scartare

Lo scarto funziona agli stessi livelli, e chiede sempre. I file non tracciati
vengono eliminati; quelli tracciati tornano al loro stato in stage (o
committato).

## Tastiera

<kbd>↑</kbd> <kbd>↓</kbd> (oppure <kbd>j</kbd> <kbd>k</kbd>) scorrono gli elenchi
di file, con <kbd>⇧</kbd> per un intervallo e <kbd>⌘</kbd>/<kbd>Ctrl</kbd> per
aggiungere o togliere singoli file.

<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> estende la selezione dall'ultima riga
cliccata. Un clic destro sulla selezione mette in stage, toglie dallo stage,
stasha o scarta tutto in una volta.

## Prima di committare

Gitcito controlla alcune cose e chiede una volta, mai in silenzio:

- un file che sembra un **segreto** (`.env`, `*.pem`, `id_rsa`…),
- un blob **molto grande** (soglia in Impostazioni → Sicurezza),
- il commit **diretto su un branch protetto** (`main`/`master` di default).

Ognuno di questi offre un *Ignora e togli dal tracciamento* in un clic. Vedi
[Sicurezza e segreti](security.md).

**Vedi anche:** [Fare commit](committing.md) · [Diff](diffs.md) · [Absorb](absorb.md)
