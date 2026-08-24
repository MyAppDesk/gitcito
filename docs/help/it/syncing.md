---
title: Fetch, pull e push
category: Sincronizzazione e più repo
order: 50
summary: Restare al passo, con protezioni sulle operazioni che mordono.
keywords: fetch pull push force auto-fetch prune remote upstream branch protetto più remote fork mirror push tag all
---

# Fetch, pull e push

## Pull

Tre modalità, scelte dal menu a tendina: **predefinita**, **solo fast-forward**
oppure **rebase**. Le modifiche locali vengono messe automaticamente in stash e
ripristinate attorno al pull, così un albero sporco non ti blocca.

### Un branch che non traccia nulla

`git pull` è un fetch seguito da un merge, e il merge deve sapere *in cosa*
unire — l'upstream del branch. Un branch creato in locale, o preso senza
tracking, non ne ha. Il fetch riesce comunque, scorre un lungo elenco di ref
`origin/*` aggiornate, e poi git si ferma con *"There is no tracking information
for the current branch"*. Non è stato fatto pull di niente e niente si è rotto:
la seconda metà semplicemente non aveva un bersaglio.

Gitcito legge quell'errore e offre la riparazione come pulsante, scegliendo quale
in base al fatto che il remoto porti già il branch:

| | |
|---|---|
| **È sul remoto** | **Collega e fai pull** — imposta l'upstream su `<remoto>/<branch>` ed esegue il pull che avevi chiesto. **Annullabile con ⌘Z**, che toglie di nuovo il tracking. |
| **Non c'è ancora** | **Fai push del branch** — un push normale, che imposta l'upstream strada facendo. |

Il remoto proposto è `origin` se c'è, altrimenti il primo dell'elenco. In quale
caso ti trovi si legge dalle ref di tracking, non dalla rete: la risposta
rispecchia il fetch appena eseguito.

## Push

I force push usano sempre `--force-with-lease` — la variante sicura, che rifiuta
se il remote si è mosso da quando hai guardato l'ultima volta. Fare un push
forzato su un **branch protetto** chiede conferma (l'elenco sta
nell'ingranaggio delle impostazioni del repository).

![La conferma che un branch protetto pretende prima di un force push](../../screenshots/force-push-guard.webp)

### Più di un remote

Il pulsante **Push** punta all'upstream del branch. La freccia accanto, quando un
repository ha più di un remote, offre anche:

| | |
|---|---|
| **Push su un remote** | Scegli un singolo remote — un fork, un mirror, una destinazione di deploy |
| **Push su tutti gli N remote** | Un push per remote, in ordine |
| **Push di tutti i tag su** | `git push <remote> --tags`, ogni tag locale in un colpo solo |

Le stesse due azioni stanno anche sulla riga di ciascun remote nella barra
laterale, che di solito è dove ti trovi quando ti viene la domanda.

**Un rifiuto non annulla il resto.** Pubblicare su un fork e sul suo upstream è
esattamente il caso in cui un lato rifiuta e l'altro dovrebbe comunque passare,
quindi ogni remote riferisce separatamente: i successi vengono nominati in un
unico toast, e ogni fallimento ne ottiene uno proprio con la motivazione di git.

Solo il **primo** remote dell'elenco imposta l'upstream del branch. Un branch ha
un solo upstream, e l'ultimo remote su cui hai fatto push non è automaticamente
quello che vuoi far tracciare.

Entrambe le strade eseguono gli stessi controlli di un push normale — la conferma
per il branch protetto e la [protezione sui segreti](security.md). Pubblicare su
due remote è il doppio dell'esposizione, non metà della prudenza.

## Branch su cui non sei

`git pull` muove solo HEAD, ed è per questo che quasi tutti i client ti fanno
fare il checkout di un branch prima di poterlo aggiornare. Gitcito no: clic
destro su un branch locale — nella sidebar o sul badge nel [grafo](graph.md) — e
trovi **Pulla \<branch\>** e **Pusha \<branch\>**, che agiscono su *quel* branch.

| | |
|---|---|
| **Pulla `<branch>`** | Porta in fast-forward la ref locale al suo upstream, senza checkout. Il working tree non viene toccato. **Annullabile con ⌘Z**: l'undo rimette il branch dov'era. |
| **Pusha `<branch>`** | Un push normale di quel branch, con le stesse protezioni per branch protetti e [segreti](security.md) del pulsante in barra. |

Il pull è disattivato per un branch che non traccia nulla: non c'è da dove
tirare. Sul branch su cui *sei*, entrambi ricadono sul pull normale, che
aggiorna anche il working tree.

**Il limite da conoscere:** un branch che è **divergito** dal suo upstream viene
rifiutato, con un messaggio che lo dice. Riconciliare una divergenza è un merge o
un rebase, e servono entrambi un working tree — quel caso costa ancora un
checkout. Il force push di un branch su cui non sei viene offerto quando il
remoto rifiuta; la strada "pull e riprova" no, per lo stesso motivo.

## Fetch

**Fetch di tutto con prune** su ogni remote, più un **auto-fetch** in background
a un intervallo che imposti tu (Impostazioni → Generali) e un badge "recuperato X
fa" nella barra degli strumenti.

Un fetch che trova **storia riscritta** lo dice: un toast nomina il branch, e la
sua riga guadagna un marcatore che apre
[cos'è cambiato da](range-diff.md) esattamente al commit che puntava prima.

## Molti repository insieme

- Una scheda di gruppo può fare **Fetch su tutti / Pull su tutti** per l'intero
  sottoalbero.
- [Mission control](mission-control.md) lo fa su tutta l'area di lavoro, e può
  fare pull *solo* sui repository che sono davvero indietro.

## Remote

Aggiungi, modifica, rimuovi e recupera i singoli remote dalla barra laterale. Le
righe dei branch portano badge di presenza per remote, così vedi a colpo d'occhio
quali remote hanno una copia di un branch.

**Vedi anche:** [Mission control](mission-control.md) · [Hosting e pull request](hosting.md)
