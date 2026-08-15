---
title: Cos'è cambiato da
category: Leggere le modifiche
order: 23
summary: Qualcuno ha fatto un force push sul branch che avevi rivisto. Guarda cosa è cambiato davvero.
keywords: range-diff force push rebase riscritto revisione interdiff reflog aggiornamento forzato
---

# Cos'è cambiato da

Avevi rivisto un branch. Qualcuno gli ha fatto il rebase e un force push. Adesso
un diff normale non vale niente: dopo un rebase ogni commit è un commit nuovo,
quindi sembra tutto nuovo.

`git range-diff` accoppia le due versioni commit per commit, e Gitcito legge le
vecchie posizioni direttamente dal **reflog** — quindi non serviva registrare
niente in anticipo perché tutto questo funzionasse.

![Commit riscritti, nuovi e scartati dopo un force push](../../screenshots/range-diff.webp)

| Verdetto | Significato |
|---|---|
| **Riscritto** | Stesso commit, cambiato. Espandilo per l'interdiff — la modifica al messaggio e il controllo in più, non l'intero file. |
| **Nuovo** | Aggiunto da quando avevi guardato. |
| **Scartato** | Sparito da quando avevi guardato. |
| **Invariato** | Ha superato la riscrittura senza un graffio. |

## Come arrivarci

- **Un fetch che trova storia riscritta te lo dice.** Un toast nomina il branch,
  e la sua riga sotto Remote guadagna un **⟳** che puoi cliccare per aprire il
  confronto esattamente al commit che puntava prima.
- Clic destro su un branch qualsiasi → *Cos'è cambiato da…*
- <kbd>⌘K</kbd> → *Cos'è cambiato da*

## Posizioni precedenti

Le pillole sotto i campi dei ref sono il reflog del branch: aggiornamenti
forzati, rebase, reset, ciascuno con il momento in cui è avvenuto. Scegline una e
il confronto viene rieseguito contro quella. È tutta qui la funzionalità — la
storia di dove è stato un branch è già sul tuo disco.

**Vedi anche:** [Radar dei conflitti](conflict-radar.md) · [Recupero e reflog](recovery.md)
