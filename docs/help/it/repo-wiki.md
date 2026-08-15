---
title: Wiki del repository (AI)
category: AI
order: 81
summary: Una guida generata a una base di codice in cui ogni affermazione cita un file.
keywords: wiki documentazione generata base di codice panoramica dipendenze architettura esporta docs
---

# Wiki del repository

Puntala a un repository e scrive una breve wiki che spiega la base di codice.

## La scheda del repo

- **Ripartizione dei linguaggi** per byte.
- **Lo stack** — i framework mostrati come badge (Next, Angular, Electron,
  Tailwind, Django…).
- **Dipendenze** lette direttamente dai tuoi manifest (`package.json`,
  `Cargo.toml`, `go.mod`, `pyproject.toml`, `pubspec.yaml`, `Gemfile`…) e
  raggruppate per ruolo architetturale. L'impalcatura — stub di tipi, loader,
  plugin di lint — viene filtrata via per prima, e possono comparire solo i
  pacchetti che il progetto dichiara davvero.
- **Un grafo delle dipendenze fra moduli**, ricavato dal sorgente (JS/TS, Python,
  Go, Rust, Dart, Ruby, C/C++, PHP) e risolto contro i file del repository
  stesso, così l'import di un pacchetto non diventa mai un arco fasullo.

## Le pagine scritte

Gitcito pianifica una manciata di pagine a partire dai file tracciati dal
repository — prima documentazione e manifest, poi ciò che cambia di più — e
scrive ogni pagina a partire dai file che copre.

**Ogni affermazione cita il file da cui proviene**, e un'affermazione che nessun
file sostiene viene rifiutata invece che pubblicata. Le pagine sono scritte in
parallelo e memorizzate in un colpo solo, così un tentativo fallito non sostituisce
mai una wiki buona. Ti dice quando la wiki è stata scritta a un commit più
vecchio.

## Esportazione

**Esporta in docs/** scrive tutto quanto dentro `docs/wiki/` come Markdown
collegato — così può essere committato, rivisto in una PR e letto sul tuo host.

I file che sembrano contenere segreti non vengono mai inviati.

**Vedi anche:** [Funzioni AI](ai.md)
