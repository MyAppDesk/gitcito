---
title: Diff semantico
category: Leggere le modifiche
order: 21
summary: Cos'è cambiato, simbolo per simbolo — rinomine, cambi di firma, spostamenti.
keywords: diff semantico ast tree-sitter rinomina firma spostato simboli cosa è cambiato
---

# Diff semantico

Una pura rinomina in un diff a righe appare come un intero file eliminato e un
intero file aggiunto. Il che è tecnicamente vero e completamente inutile.

Sopra ogni diff di file, Gitcito mostra una striscia **Cos'è cambiato**: entrambe
le versioni del file vengono analizzate con **tree-sitter** — alberi sintattici
veri, non espressioni regolari — e le loro dichiarazioni vengono accoppiate.

![La striscia cos'è-cambiato: rinomine e cambi di firma, simbolo per simbolo](../../screenshots/semantic-diff.webp)

| Verdetto | Esempio |
|---|---|
| **Rinominato** | `startServer` → `bootServer` |
| **Firma** | `open(path)` → `open(path, mode)` |
| **Aggiunto** / **Rimosso** | una nuova funzione; una eliminata |
| **Spostato** | stesso codice, 40 righe più in basso |
| **Cambiato** | stesso nome e stessa firma, corpo diverso |

Rinomine e cambi di firma vengono ordinati per primi — sono ciò che chi rivede il
codice non deve perdersi. Clicca una riga per saltare a quel simbolo nel diff.

## Cosa riesce ad analizzare

TypeScript, TSX, JavaScript, Python, Go, Rust, Java, C, C++, C#, Ruby, PHP,
Swift, Kotlin, Scala, Lua, Bash e Zig.

Un file il cui linguaggio non ha una grammatica si tiene semplicemente il suo
normale diff a righe — la striscia non compare affatto. Lo stesso vale per i file
oltre i 400 KB.

## Limiti dichiarati

- Una rinomina il cui corpo è anche cambiato viene riportata come rinomina **e**
  lo dice.
- Due funzioni di una riga che per caso si somigliano *non* vengono accoppiate:
  sotto una certa soglia di dimensione la corrispondenza dev'essere quasi esatta,
  così ottieni un pulito rimosso + aggiunto invece di una rinomina inventata.
- I simboli che scivolano di qualche riga solo perché qualcosa sopra di loro è
  cresciuto non vengono segnalati come "spostati" — quello seppellirebbe gli
  spostamenti veri.

**Vedi anche:** [Visualizzatore di diff](diffs.md) · [Cos'è cambiato da](range-diff.md)
