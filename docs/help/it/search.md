---
title: Tavolozza dei comandi e ricerca
category: Repository e cronologia
order: 11
summary: Salta ovunque, e fai grep sull'albero o sulla storia.
keywords: tavolozza comandi command palette ricerca search grep ricerca nel codice pickaxe trova fuzzy salta
---

# Tavolozza dei comandi e ricerca

## La tavolozza — <kbd>⌘K</kbd>

Salto fuzzy a un **branch** (ne fa il checkout), a un **commit** (ci fa scorrere
il grafo), a un **file dell'albero di lavoro**, o a un'**azione** — fetch, pull,
push, stash, terminale, reflog, impostazioni, e ogni funzionalità di questo
manuale.

Impara: quello che hai usato di recente viene per primo, e quello che usi spesso
sopravanza quello che non usi.

![La tavolozza dei comandi](../../screenshots/command-palette.webp)

## Ricerca nel codice — <kbd>⌘⇧F</kbd>

Due domande diverse, una sola finestra:

| Modalità | Domanda a cui risponde |
|---|---|
| **Contenuti** | "Dov'è questa stringa in questo momento?" — `git grep` su file tracciati *e* non tracciati, con maiuscole/minuscole, parola intera e regex. |
| **Piccone sulla storia** | "Quando è comparsa o scomparsa questa stringa?" — `git log -S` / `-G`. |

I risultati tornano con la sintassi evidenziata e la corrispondenza marcata,
raggruppati per file ed espandibili fino alle righe esatte. Cliccane uno per
aprire il file a quella riga, oppure il commit che l'ha introdotta.

![I risultati della ricerca nel codice](../../screenshots/code-search.webp)

## Filtrare il grafo

La casella di ricerca sopra il grafo filtra i commit per messaggio, autore, SHA o
stato di deploy. Per "solo i commit che hanno toccato questo file", usa il filtro
per percorso — vedi [il grafo dei commit](graph.md).

**Vedi anche:** [Il grafo dei commit](graph.md) · [Tastiera e scorciatoie](keyboard.md)
