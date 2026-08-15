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
