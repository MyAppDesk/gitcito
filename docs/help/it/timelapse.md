---
title: Timelapse
category: Repository e cronologia
order: 14
summary: Riproduci l'intera vita del repository come un'animazione, ed esportala.
keywords: timelapse video animazione storia riproduzione gource esporta webm filmato anno in sintesi
---

# Timelapse

Guarda il repository crescere.

Ogni file è un punto, collocato in base alla sua cartella di primo livello: nasce
quando viene aggiunto, pulsa quando un commit lo tocca, si gonfia man mano che
viene modificato ancora e ancora, sbiadisce quando viene eliminato. Data, autore,
soggetto e i conteggi correnti di commit, file e autori stanno in cima, con una
barra di avanzamento lungo il fondo.

![Il timelapse a metà riproduzione](../../screenshots/timelapse.webp)

![L'intera vita di un repository, riprodotta](../../screenshots/clip-timelapse.webp)

## Comandi

- **Play / pausa**, velocità da **4× a 32×**, e riavvio.
- Il cursore cerca **riproducendo dall'inizio**, così tornare indietro atterra
  esattamente sul mondo giusto invece che su una sua approssimazione.

## Esportare il video

**Esporta video** registra il canvas dall'inizio alla fine e ti chiede dove
salvare un `.webm`.

La registrazione avviene nella pagina stessa (`MediaRecorder`) — non c'è nessun
encoder da installare, nessun ffmpeg, e non viene caricato niente da nessuna
parte. Niente viene scritto su disco finché non scegli un percorso.

> Un repository con una forma vera fa un film migliore di uno ordinato. Rinomine,
> eliminazioni e una cartella che di colpo esplode sono ciò che lo rende degno di
> essere guardato.

**Vedi anche:** [Macchina del tempo](time-machine.md) · [Insight](insights.md)
