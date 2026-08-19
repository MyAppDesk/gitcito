---
title: Risolvere i conflitti
category: Lavorare con le modifiche
order: 32
summary: Un risolutore a tre pannelli che ti dice quale lato è quale.
keywords: conflitto conflict risolutore resolver merge ours theirs risolvi marcatori tre vie rerere reuse recorded resolution ricorda replay
---

# Risolvere i conflitti

Quando un merge, un rebase, un cherry-pick o un revert si ferma, un banner ti
dice **cosa** si è fermato e **fra cosa e cosa** — "merge di `feature/x` dentro
`main`", non solo "conflitto".

![Il risolutore di conflitti](../../screenshots/conflict-resolver.webp)

## Perché questo va in conflitto

**Perché questo va in conflitto**, nell'intestazione, elenca lato per lato i
commit che hanno toccato questo file da quando i branch si sono separati — è
`git log --merge`, che git offre da sempre e che nessuno trova.

![I commit di ciascun lato che hanno toccato il file in conflitto](../../screenshots/conflict-why.webp)

I marcatori dicono cosa si scontra. Questo dice chi l'ha cambiato e perché, che
di solito è ciò che decide davvero la risoluzione. Se lì non c'è niente,
significa che nessuno dei due lati ha committato una modifica esattamente a
questo percorso: lo scontro è nato da una rinomina o da uno spostamento.

## I tre pannelli

| Pannello | Cos'è |
|---|---|
| Sinistra | **Nostro** — il lato su cui eri, etichettato con il suo commit |
| Destra | **Loro** — il lato in arrivo, etichettato con il suo commit |
| Centro | L'**output**: modificabile, con i numeri di riga, ed è ciò che finisce davvero in stage |

Tutti e tre i pannelli sono ridimensionabili, e l'intestazione dell'output
porta due interruttori di vista:

| Interruttore | Cosa fa |
|---|---|
| **A capo** | Manda a capo le righe lunghe dentro i pannelli A e B invece di scorrerle. Il pannello dell'output mantiene una riga per riga — i suoi marcatori laterali dipendono da questo — quindi scorre sempre |
| **Collegato** | Fa scorrere A, B e l'output insieme, in verticale e in orizzontale. I loro conteggi di righe differiscono, quindi la posizione verticale viene allineata in proporzione |

A capo parte disattivato, Collegato parte attivato, ed entrambi ricordano il
proprio stato.

## Muoversi

Aprendo un file atterri sul suo **primo conflitto**, non in cima al file. Le
frecce ⌃ / ⌄ nell'intestazione dell'output — o <kbd>Alt+↑</kbd> /
<kbd>Alt+↓</kbd> — passano in rassegna gli altri, facendo scorrere tutti e tre
i pannelli fino a ciascuno.

## Scegliere

Per **riga**, per **blocco**, o **tutto un lato** in una volta — e puoi prendere
entrambi i lati di un blocco quando la risposta è "teniamoli tutti e due". Un
navigatore conflitto per conflitto ti accompagna in ciò che resta, così non puoi
lasciarti dietro un marcatore per distrazione.

## Assistenza AI

Con l'AI attiva, **Risolvi con l'AI** propone un merge nel pannello di output.
Non applica mai niente da solo: lo leggi, lo modifichi e lo metti in stage. Vedi
[Funzioni AI](ai.md).

## Evitarli in partenza

Il [radar dei conflitti](conflict-radar.md) ti dice quali branch andranno in
conflitto prima che tu ne fonda uno.

## Lasciare che git ricordi (rerere)

Fai il rebase di un branch di lunga vita e incontri ogni volta lo stesso
conflitto. `rerere` — *reuse recorded resolution* — è la risposta di git:
memorizza come hai sistemato un conflitto e ripropone quella risposta la volta
successiva che ne compare uno identico.

**Impostazioni → Generali → Ricorda le risoluzioni dei conflitti.** Scrive
`rerere.enabled` nella tua configurazione git globale, così anche la riga di
comando si comporta allo stesso modo.

Quando git ha risposto al posto tuo, il risolutore lo dice invece di mostrare una
schermata vuota con scritto "nessun marcatore di conflitto", e offre **Dimentica
questa risoluzione** — che cancella il ricordo *e* riporta indietro il conflitto,
così puoi sistemarlo diversamente.

Due cose che conviene sapere:

- **Una risoluzione riproposta non viene messa in stage** a meno che tu non
  attivi *Metti automaticamente in stage una risoluzione riproposta*. Lascialo
  spento: il senso della pausa è che una risposta memorizzata può essere
  sbagliata per questo particolare merge, e mettere in stage senza guardare è
  esattamente il modo in cui arriva a un commit.

  È per questo che un file riproposto **resta fra i File in conflitto**: git ha
  scritto il contenuto, ma l'indice lo tiene ancora come non fuso, e solo lo
  staging chiude la questione. A muoverlo è **Metti in stage così com'è** nel
  risolutore, oppure **Segna tutto come risolto** nell'elenco.
- **rerere non capisce ogni conflitto.** I conflitti add/add e delete/modify non
  producono alcuna preimmagine, quindi tornano sempre grezzi. Il conteggio nelle
  impostazioni dice quanti ne conserva davvero, e **Dimentica tutto** lo svuota.

**Vedi anche:** [Radar dei conflitti](conflict-radar.md) · [Merge e rebase](merging.md)
