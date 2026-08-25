---
title: Attività
category: Strumenti dell'area di lavoro
order: 97
summary: Un elenco privato per repository, visibile dalla barra laterale e dalla barra di stato.
keywords: todo attività compiti elenco checklist casella nota note promemoria priorità
---

# Attività

Metà delle note che si scrivono programmando sta su una riga e vive un
pomeriggio: *rinominare quella variabile prima della PR*, *il percorso della
fixture è sbagliato*, *chiedere del limite di retry*. Un issue tracker è troppo
pesante, un file di appunti finisce per errore in un commit, e un post-it
sparisce nel momento in cui cambi repository.

Le attività sono quell'elenco, attaccato al repository in cui ti trovi.

![L'elenco delle attività con una aperta, con le sue note e la sua priorità](../../screenshots/todos.webp)

## Dove vivono

In nessun punto del tuo repository. Un'attività è salvata con le impostazioni di
Gitcito, indicizzata per percorso del repository: da qui tre conseguenze che vale
la pena conoscere.

- **Non viene committato nulla.** In `git status` non compare alcun file, quindi
  un'attività non può finire in un commit o in un diff.
- **Non la vede nessun altro.** È una nota per te, non un backlog condiviso. Se
  un compito è della squadra, il suo posto è una issue.
- **Segue la cartella, non il branch.** Apri lo stesso clone in due schede e
  vedi un solo elenco. Clona di nuovo il progetto altrove sul disco e ottieni un
  secondo elenco, separato.

Il branch su cui eri quando l'hai scritta viene registrato come *contesto* e
mostrato nel dettaglio. È un promemoria di dov'eri, non un filtro: le attività
non spariscono quando fai checkout di qualcos'altro.

## Scriverne una

Apri l'elenco — il pulsante ↗ nell'intestazione della sezione **Attività**, il
contrassegno nella barra di stato oppure **Attività** nella palette dei comandi —,
scrivi la riga e premi <kbd>Invio</kbd>. La sezione nella barra laterale resta un
elenco da leggere e spuntare; si scrive in un posto solo.

L'ordine è già deciso: prima le aperte — priorità alta sopra la normale, la
normale sopra la bassa — e, a parità di priorità, la più vecchia per prima,
perché ciò che è stato ignorato più a lungo è ciò che merita di essere visto. Le
completate scendono in fondo, con l'ultima spuntata in cima, così annullare un
clic sbagliato è immediato.

## Vederle senza cercarle

![La sezione della barra laterale e il contrassegno nella barra di stato, in un'unica finestra](../../screenshots/todos-markers.webp)

| Segno | Dove | Che cosa significa |
|---|---|---|
| Contrassegno <kbd>☑ 3</kbd> | Barra di stato, a sinistra del branch | Quante sono aperte; giallo se una ha priorità alta |
| Contatore | L'intestazione della sezione nella barra laterale | Lo stesso numero, accanto all'elenco |

Entrambi spariscono a zero. Uno «0 attività» permanente è arredamento, e
l'arredamento è esattamente ciò che si smette di vedere.

## Il dettaglio

Fai clic su un'attività — nella barra laterale, sul contrassegno nella barra di
stato o da **Attività** nella palette dei comandi — per aprire l'elenco completo
con il pannello di dettaglio.

| Campo | A cosa serve |
|---|---|
| **Titolo** | La riga. Si modifica sul posto; non c'è un pulsante di salvataggio. |
| **Note** | Tutto quello che il titolo non conteneva: perché conta, quali file, che cosa significa «fatto». |
| **Priorità** | Bassa, normale o alta. Governa l'ordine e il colore del contrassegno. |
| **Creata / Completata** | Quando l'hai scritta e quando l'hai spuntata. |
| **Annotata su** | Il branch che era in checkout in quel momento. |

La stessa vista porta il filtro, l'interruttore **Mostra completate** e **Elimina
completate**, che cancella per sempre le spuntate e chiede prima di farlo.

## Ciò che deliberatamente non fa

- **Niente scadenze, niente promemoria, niente notifiche.** Un elenco di attività
  che assilla è un calendario; questo aspetta che tu lo guardi.
- **Niente sincronizzazione né condivisione.** Non lascia la tua macchina e non
  fa parte dell'esportazione di un'area di lavoro.
- **Nessun collegamento a issue o commit.** Se una nota merita tanta struttura,
  ha superato questo elenco: apri una [issue](hosting.md).
- **L'eliminazione è definitiva.** Non c'è una voce di annullamento per
  un'attività rimossa, perché git non l'aveva mai registrata.

**Vedi anche:** [Impostazioni per repository](repo-settings.md) ·
[Mission control](mission-control.md)
