---
title: Macchina del tempo
category: Repository e cronologia
order: 13
summary: Trascina un cursore e guarda il repository stesso cambiare, commit dopo commit.
keywords: macchina del tempo time machine scorri storia cursore passato albero sfoglia riavvolgi vecchia versione
---

# Macchina del tempo

Leggere un commit vecchio di solito significa farne il checkout, il che significa
mettere in stash quello che stavi facendo. Questa cosa no.

Trascina il cursore e **l'albero dei file si ridisegna a ogni commit**: le
cartelle compaiono, i file si spostano fra loro, i file eliminati tornano.
Scegli un file e lo leggi com'era a quel commit.

Tutto viene letto dal database degli oggetti (`git ls-tree`, `git show`).
**Nessun checkout, HEAD non si muove mai, il tuo lavoro non committato resta
intatto** — puoi scorrere un anno di storia in mezzo a una modifica.

![L'albero com'era a un commit precedente, con un file aperto accanto](../../screenshots/time-machine.webp)

![Lo scorrimento del cursore: l'albero si ricostruisce commit dopo commit](../../screenshots/clip-time-machine.webp)

## Comandi

| Tasto | Azione |
|---|---|
| <kbd>←</kbd> <kbd>→</kbd> | Un commit |
| <kbd>⇧</kbd> + <kbd>←</kbd> <kbd>→</kbd> | Dieci commit |
| <kbd>Home</kbd> / <kbd>End</kbd> | Il più vecchio / il più recente |

Le frecce ai due lati del cursore fanno lo stesso. I file toccati dal commit
corrente sono evidenziati nell'albero, con un conteggio nell'intestazione.

## La selezione sopravvive al tempo

Scegli un file e scorri indietro oltre il commit che lo ha creato: il pannello
dice che qui non esiste, e **mantiene la tua selezione**. Scorri in avanti e il
file torna con il suo vecchio contenuto. È tutto qui il punto — stai muovendo il
repository, non il tuo cursore.

**Apri questa versione** consegna il file alla normale vista file a quel commit.

**Vedi anche:** [Timelapse](timelapse.md) · [Blame e cronologia](blame.md)
