---
title: Absorb
category: Lavorare con le modifiche
order: 33
summary: Rimanda ogni correzione in stage dentro il commit che ha introdotto quella riga.
keywords: absorb assorbi fixup autosquash amend stage hunk blame correzioni review
---

# Absorb

Hai sistemato tre commenti di review su tre file diversi. La cosa onesta sarebbe
fare tre commit `fixup!` puntati ai genitori giusti. La cosa che si fa davvero è
un unico commit intitolato "review fixes".

Absorb fa la cosa onesta al posto tuo.

![Absorb instrada ogni hunk in stage verso il commit che lo ha introdotto](../../screenshots/absorb.webp)

## Come funziona

1. Metti in stage le correzioni.
2. Strumenti → **Assorbi le modifiche in stage…** (oppure <kbd>⌘K</kbd>).
3. Gitcito esegue il blame sulle righe toccate da ciascun hunk in stage, trova
   quale dei **tuoi commit non ancora pubblicati** le ha introdotte e ti mostra
   il piano prima di fare qualsiasi cosa.

Il piano elenca ogni commit di destinazione con gli hunk diretti verso di lui,
più un gruppo **Non appartiene ancora a nulla**: un file appena creato non ha
storia in cui essere assorbito, quindi resta in stage e lo committi normalmente.

| Pulsante | Cosa succede |
|---|---|
| **Crea i fixup** | Un commit `fixup!` per ogni destinazione. Nessun rebase. |
| **Crea i fixup ed esegui il rebase** | Lo stesso, poi un rebase con autosquash li incorpora. |

## Le regole che rispetta

- **Solo i commit non pubblicati sono candidati.** Quello che è già stato
  pubblicato non spetta a noi riscriverlo. Se hai già pubblicato tutto, absorb
  te lo dice e non fa niente.
- **L'albero di lavoro non viene mai toccato.** Solo l'indice e i commit che
  absorb crea da sé.
- **Un errore non lascia sporcizia.** Se un passaggio fallisce, HEAD e l'indice
  tornano esattamente com'erano.
- Si rifiuta di partire durante un merge o un rebase: quell'indice appartiene a
  git.

**Vedi anche:** [Rebase interattivo](rebase.md) · [Staging](staging.md)
