---
title: Modifica qualsiasi commit
category: Branch e chirurgia
order: 46
summary: Riscrivi i file o il messaggio di un commit storico sul posto — con la cascata in anteprima prima.
keywords: modifica commit edit riscrivi rewrite storia history amend passato reword correggi refuso typo cascata cascade replay rebase sul posto chirurgia
---

# Modifica qualsiasi commit

Il refuso sta in un commit di tre settimane fa. La soluzione classica è un rebase
interattivo: fermarsi al commit, modificare, continuare, pregare. La soluzione di
Gitcito è: clic destro sul commit, **Modifica questo commit**, cambia il testo,
fatto. Il pulsante a forma di penna nel pannello dei dettagli del commit apre
lo stesso editor.

![Modifica di un commit storico](../../screenshots/commit-edit.webp)

## Cosa fa

Scegli un commit qualsiasi su un percorso lineare fino a `HEAD`. La modale mostra
i suoi file e il messaggio; modifica l'uno o l'altro. Da lì succedono due cose:

1. **Anteprima della cascata** riapplica ogni commit sopra quello modificato
   *in memoria* (una catena di cherry-pick via `merge-tree` — nessun checkout,
   nessun working tree, nessun ref). Ogni discendente appare verde o rosso, così
   sai **prima che qualcosa si muova** se la modifica si propaga pulita o collide
   con un cambiamento successivo.
2. **Riscrivi la storia** lo fa per davvero: la stessa catena viene costruita con
   i comandi di plumbing, poi il branch si sposta con `reset --keep` — le tue
   modifiche non committate vengono portate con te, oppure il reset si interrompe
   e non è successo nulla. Prima viene preso uno
   [snapshot di guardia](recovery.md), e l'annulla ripristina la vecchia catena.

Autore e date di ogni commit riapplicato sono preservati; cambiano solo gli
hash — è questo che significa riscrivere la storia.

## Quando la cascata va in conflitto

Un commit successivo ha toccato le stesse righe che stai modificando. L'anteprima
marca quel commit in rosso con i file in conflitto e la riscrittura si rifiuta di
partire — niente resta applicato a metà, mai. O modifichi in un altro modo, o
affronti il conflitto di petto con un [rebase interattivo](rebase.md).

## Limiti

- **Solo storia lineare.** Un merge tra il commit e `HEAD` disabilita la
  modifica — riapplicare i merge è un problema diverso e più difficile.
- I file binari e i file oltre 2 MB vengono mostrati ma non sono modificabili.
- Un commit già presente su un remote può essere modificato, ma il prossimo push
  dovrà essere un **force push** — la modale ti avvisa prima che tu ti ci
  impegni.
- I file eliminati nel commit non si possono modificare (non c'è contenuto da
  modificare).

**Vedi anche:** [Rebase interattivo](rebase.md) · [Recupero e il reflog](recovery.md) · [Absorb](absorb.md)
