---
title: Recupero e il reflog
category: Recupero e protezione
order: 60
summary: La rete di sicurezza: reflog, snapshot del lavoro in corso e bisect.
keywords: reflog recupero recovery annulla undo commit perduti snapshot wip bisect bisect run automatico script codice di uscita ripristina hard reset
---

# Recupero e il reflog

Git raramente perde qualcosa. La parte difficile è ritrovarlo.

## Reflog

Ogni movimento di `HEAD` — e di ciascun branch — con la causa che l'ha prodotto:
checkout, reset, rebase, amend, un fetch forzato. Da qualunque voce passata puoi
farne il **checkout**, **crearci un branch** o **fare un hard reset** su di essa.

![Il visualizzatore del reflog](../../screenshots/reflog.webp)

Questo è il pulsante "ho appena resettato il branch sbagliato".

## Snapshot del lavoro in corso

Il lavoro non committato è l'unica cosa che il reflog non può salvare, quindi
Gitcito ne fa uno snapshot: le tue modifiche tracciate più l'indice in stage,
catturati come un commit `git stash create` fissato sotto `refs/gitcito/wip`.

![Gli snapshot del lavoro in corso](../../screenshots/snapshots.webp)

- **Non tocca mai il tuo albero di lavoro** e **non compare mai nel tuo elenco
  degli stash** — è un ref nascosto, non uno stash.
- Prendine uno a mano, oppure lascialo girare ogni **5 / 15 / 30 minuti**.
- Ripristina o elimina qualsiasi snapshot dall'elenco.

## Bisect guidato

Segna i commit come buoni e cattivi, guarda l'intervallo restringersi, atterra
sul primo commit cattivo. Gitcito tiene il conto di quanti passi mancano, così
sai se sei a due domande dalla risposta o a dieci.

![Il bisect guidato](../../screenshots/bisect.webp)

### Lascia decidere a un comando

Una volta seminato l'intervallo, **Lascia decidere a un comando** affida l'intera
ricerca a `git bisect run`. Git fa il checkout di ogni candidato, esegue il tuo
comando e legge il suo codice di uscita:

| Codice di uscita | Significa |
|-----------|-------|
| `0` | Buono — il bug non è qui |
| `125` | Questo non si può provare; saltalo |
| qualsiasi altro | Cattivo |

Una suite di test parla già quella lingua, ed è per questo che `npm test` è di
solito tutta la risposta. Gitcito propone gli script di questo progetto come
riempimenti in un clic, mostra l'output in tempo reale mentre gira e atterra sul
primo commit cattivo senza che tu risponda a una sola domanda.

![La casella del comando, pronta ad affidare la ricerca a una suite di test](../../screenshots/bisect-run.webp)

**A cosa fare attenzione.** Il comando viene eseguito su *ogni* commit che git
prova, quindi un comando che fa deploy, pubblica o scrive fuori dal repository lo
farà parecchie volte. Limitalo a qualcosa che si limita a leggere e riferire.
**Stop** interrompe l'esecuzione e lascia aperta la sessione, così puoi
proseguire segnando a mano; **Interrompi** chiude del tutto il bisect.

Un comando che fallisce per un motivo non correlato — una dipendenza mancante in
quel punto della storia, per esempio — segna come cattivo un commit buono e manda
la ricerca nel posto sbagliato. Uscire con `125` da uno script wrapper è la via
d'uscita che git offre.

## Annulla / ripeti

Quasi tutte le operazioni infilano una voce in una pila di annullamento, quindi
<kbd>⌘Z</kbd> inverte l'ultima dove git lo consente.

**Vedi anche:** [Cos'è cambiato da](range-diff.md) · [Stash](stashes.md)
