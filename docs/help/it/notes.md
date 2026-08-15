---
title: Note sui commit
category: Leggere la cronologia
order: 26
summary: Allega del testo a un commit già pubblicato — senza modificare il commit.
keywords: note notes git notes annota commento commit refs/notes review ticket amend riscrittura push notes fetch notes
---

# Note sui commit

Un messaggio di commit si scrive una volta e poi si congela: cambiarlo riscrive
il commit, gli dà un nuovo hash e rompe la situazione di chiunque abbia già
quello vecchio. Il che va benissimo un'ora dopo aver committato ed è impossibile
una settimana dopo.

`git notes` è la via d'uscita. Una nota viene conservata **accanto** al commit,
sotto `refs/notes/commits`, e allegarne una lascia il commit identico byte per
byte. Quindi funziona su storia già pubblicata — che è esattamente il momento in
cui più ti serve aggiungere qualcosa.

Uso tipico: la revisione che l'ha approvato, il ticket che ha chiuso, perché è
stato annullato, in quale release è uscito.

## Scriverne una

Seleziona un commit. Sotto il messaggio c'è una sezione **Nota**: *Aggiungi una
nota*, scrivi, **Salva la nota**. Il testo su più righe va benissimo.

![La scrittura di una nota sotto il messaggio di un commit già pubblicato, poi il salvataggio](../../screenshots/clip-commit-note.webp)

Salvare una nota è una normale azione di Gitcito — produce un toast, e
**Annulla** rimette il testo precedente, compreso il ripristino di una nota che
avevi rimosso.

Svuotare il testo e salvare rimuove la nota; una nota vuota non esiste.

## Trovarne una

Le note sono invisibili in un log normale, ed è il motivo principale per cui la
gente non le scopre mai. Gitcito segna un commit che ne porta una con una piccola
icona di nota nella colonna del messaggio del grafo, così l'annotazione è
trovabile anche senza sapere che c'è.

Da riga di comando, `git log --notes` le stampa sotto ciascun messaggio.

## Condividerle

**Questa è la parte che sorprende tutti: un normale `git push` non pubblica le
note, e un normale `git fetch` non le recupera.** Vivono fuori da `refs/heads` e
`refs/tags`, quindi i refspec predefiniti le saltano del tutto. Le note scritte
sul tuo portatile restano sul tuo portatile finché qualcuno non le sposta
esplicitamente.

Strumenti → **Nota** → *Pubblica le note* / *Recupera le note*, per remote.
Eseguono:

```sh
git push <remote> refs/notes/*
git fetch <remote> +refs/notes/*:refs/notes/*
```

Alcuni host richiedono anche che le note siano abilitate o permesse dalla loro
parte; un rifiuto lì è una politica dell'host, non un limite di Gitcito.

## Limiti

- **Un solo ref di note.** Gitcito legge e scrive il `refs/notes/commits`
  predefinito. Gli spazi dei nomi personalizzati (`git notes --ref=review`) non
  sono esposti — un repository che li usa non vedrà quelle note qui.
- **Nessun merge di note divergenti.** Se due persone annotano lo stesso commit e
  fanno entrambe push, git rifiuta il secondo push. Risolverlo significa
  `git notes merge` nel [terminale](terminal.md).
- **Le note non sono coperte dal backup di una purga** né dagli
  [snapshot](recovery.md). Sono ref ordinari e sopravvivono alle operazioni
  normali, ma un repository riclonato da zero parte senza di esse.

Vedi anche: [Fare commit](committing.md) · [Il grafo dei commit](graph.md)
