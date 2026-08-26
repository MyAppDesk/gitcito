---
title: Segnalibri
category: Strumenti dello spazio di lavoro
order: 94
summary: Punti del codice che ricordi e che sopravvivono alle modifiche del file.
keywords: segnalibro segnalibri marcare riga nota punto codice navigazione barra laterale spostato perso frammento
---

# Segnalibri

Un punto in cui vuoi tornare: la riga dove abita il bug, la funzione che stai
rinominando a metà, la cosa da cancellare quando il refactor arriva. Clic destro
su una riga nel visualizzatore e **Aggiungi un segnalibro a questa riga**: compare
nella barra laterale, e un clic ti riporta lì.

![Segnalibri nella barra laterale](../../screenshots/bookmarks.webp)

Una riga con segnalibro porta un segno nel margine, e passando sopra una riga
qualsiasi ne compare uno tenue su cui cliccare — il menu contestuale serve
quando sai già che la funzione c’è.

I segnalibri sono privati di questa macchina e di questo repository. Nel repo non
viene scritto niente: non si committano, non si pushano, nessun altro li vede —
esattamente come i [todo](todos.md).

## La riga si sposta. È tutto qui il problema.

`cart.ts:42` marcisce nell’istante in cui qualcuno inserisce una riga sopra, e un
segnalibro che apre in silenzio la riga sbagliata è peggio di nessun segnalibro.
Perciò il **testo** della riga viene salvato accanto al numero, e all’apertura si
rilocalizza:

1. la riga ricordata, se porta ancora quel testo;
2. altrimenti la riga più vicina con lo stesso testo — la più vicina, così una
   riga ripetuta in tutto il file finisce sulla copia più prossima a dov’era;
3. altrimenti la riga più vicina che combacia ignorando gli spazi, il che
   sopravvive a una reindentazione;
4. altrimenti dice che **la riga non c’è più** e apre dov’era, invece di tirare a
   indovinare.

Quando si sposta, il segnalibro si cura: il nuovo numero viene salvato e la volta
dopo si parte da lì. Una **nota** si aggiunge dal menu contestuale — senza,
l’etichetta è il testo stesso della riga.

## I limiti

- **Un segnalibro punta all’albero di lavoro**, non a un commit. Segue le tue
  modifiche; non torna indietro nella storia.
- **Un file riscritto perde i suoi segnalibri.** Se né il testo esatto né la sua
  forma senza spazi si trovano entro qualche centinaio di righe, non resta niente
  di onesto da indicare.
- **Rinominare un file rompe i suoi segnalibri.** Il percorso è la chiave; git
  riconosce un rename in un diff, ma un segnalibro non fa parte di un diff.
- **Una riga vuota non ha testo da ritrovare**: il suo segnalibro dipende solo dal
  numero.

**Vedi anche:** [Todo](todos.md) · [Problemi](problems.md)
