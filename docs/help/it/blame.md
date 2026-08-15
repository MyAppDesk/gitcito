---
title: Blame e cronologia del file
category: Leggere le modifiche
order: 22
summary: Chi ha scritto questa riga, quando, e com'era prima.
keywords: blame cronologia history file riga autore annotate reblame follow
---

# Blame e cronologia del file

Apri un file qualsiasi e cambia modalità di visualizzazione: **Anteprima · File ·
Diff · Blame · Cronologia**.

![Il blame, con il commit dietro ogni riga nel margine](../../screenshots/blame.webp)

## Blame

Ogni riga porta con sé il proprio commit, autore e data, con un colore per
commit, così i blocchi di storia condivisa saltano all'occhio.

- **Segui la riga dentro il diff**: dalla riga di blame salti dritto alla
  modifica che l'ha prodotta.
- **Rifai il blame prima di questo commit**: clic destro su una riga per
  eseguire il blame del file com'era *prima* di quel commit — è così che si
  risale la storia di una riga senza uscire dalla vista.

## Cronologia

Ogni commit che ha toccato questo file, dal più recente. Selezionandone uno vedi
la versione del file a quel commit, così puoi sfogliare come è cresciuto.

![Ogni commit che ha toccato un file, dal più recente](../../screenshots/file-history.webp)

Per l'intero repository invece che per un singolo file, usa la
[macchina del tempo](time-machine.md).

## Passa il mouse per spiegare

Con l'AI attiva, tenendo premuto <kbd>⇧</kbd> (configurabile, o nessun tasto) e
puntando un identificatore ottieni una spiegazione di una riga, più le righe su
cui si è basata — cliccane una per saltarci. Legge solo una finestra numerata
attorno al token, quindi quando qualcosa è definito altrove lo dice invece di
inventarselo. Vedi [Funzioni AI](ai.md).

**Vedi anche:** [Il grafo dei commit](graph.md) · [Diff](diffs.md)
