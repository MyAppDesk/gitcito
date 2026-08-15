---
title: Replace e graft
category: Repository e cronologia
order: 17
summary: Accorcia la storia di un clone senza riscriverla — git replace, i graft, e come rimettere a posto la storia.
keywords: replace git replace graft refs/replace shallow tronca storia archivio genitori riscrittura filter-branch alternativa clone più piccolo useReplaceRefs no-replace-objects
---

# Replace e graft

`git replace` dice a git: *ovunque stessi per leggere l'oggetto A, leggi invece
B*. Non viene riscritto niente. Nessuno sha cambia. Ogni commit resta esattamente
dov'era — git si limita a guardare da un'altra parte mentre passa.

Sembra una curiosità finché non vuoi un clone più piccolo. A quel punto è
l'alternativa onesta a una riscrittura della storia: **innesta un commit su
nessun genitore** e tutto ciò che lo precede sparisce dal log, dal grafo e da
ogni clone fatto da lì — pur restando memorizzato, pur restando recuperabile, e a
un ref eliminato di distanza dal tornare.

`⌘K` → **Replace e graft**.

![Le sostituzioni esistenti, e sotto il modulo per l'innesto](../../screenshots/replace.webp)

## Innestare

| Dagli | E ottieni |
|---------|-------------|
| Un commit, **nessun genitore** | Quel commit diventa l'inizio della storia |
| Un commit, **uno o più genitori** | Si attacca lì invece che dove sta davvero |

La seconda forma è quella interessante. Tieni la storia completa in un repository
d'archivio, tronca quello di lavoro, e un graft che punta alla punta
dell'archivio riattacca i due — lo stesso trucco che usa GitHub per servire un
clone shallow che si può comunque approfondire.

**Innestare su nessun genitore chiede prima conferma**, perché "la storia non c'è
più" e "la storia è nascosta" dal log sembrano identiche e non sono affatto la
stessa cosa. Gli oggetti sopravvivono finché un `gc` non li elimina; vedi
[manutenzione](maintenance.md).

## Conviverci

**Le sostituzioni sono ref**, sotto `refs/replace/`. Il che ha tre conseguenze da
conoscere:

- Sono **locali finché non le pubblichi**: `git push origin "refs/replace/*"` le
  condivide, e chiunque cloni senza di esse vede la storia intatta.
- **L'annullamento funziona** — eliminare il ref ripristina immediatamente la
  discendenza vera, e Gitcito registra il graft come azione annullabile al pari
  di qualsiasi altra.
- `core.useReplaceRefs=false` fa sì che git le ignori tutte in un colpo solo.
  L'interruttore qui scrive esattamente quello, e la finestra lo dice quando è
  spento, perché un repository che ignora in silenzio le proprie sostituzioni è
  un posto in cui ci si confonde.

Da riga di comando, `git --no-replace-objects log` mostra la storia vera senza
cambiare alcuna impostazione.

## Quando usare questo invece di una riscrittura

| Obiettivo | Strumento |
|------|------|
| Il clone è troppo grande, la storia va bene | **Graft** — niente riscritto, reversibile |
| Un segreto o un blob enorme deve *sparire* | [Rimuovere un file dalla storia](history-purge.md) — una riscrittura vera |
| Vuoi solo scaricare meno, una volta | `git clone --depth` — shallow, nessun ref da gestire |

Un graft non rimuove niente. Se il motivo per cui vuoi fuori i vecchi commit è
che contengono qualcosa che non sarebbe mai dovuto essere committato, questa è la
pagina sbagliata: gli oggetti sono ancora lì, ancora recuperabili per sha, e
ancora in ogni clone esistente.

## Limiti da conoscere

- **Quello che vedi smette di corrispondere a quello che è memorizzato.** È
  questa la funzionalità, ed è questo il pericolo. Chi debugga un clone con
  sostituzioni deve sapere che esistono.
- **Le sostituzioni non viaggiano di default**, quindi il `git log` di un collega
  e il tuo possono legittimamente non essere d'accordo.
- **Una sostituzione può nascondere un commit agli strumenti, non a git.**
  `git cat-file` e l'[esploratore di oggetti](objects.md) aprono comunque
  l'originale per sha.
- **Gitcito non offre `git replace --edit`** (riscrivere a mano il contenuto di
  un oggetto). Quello è lavoro da editor di testo su un oggetto grezzo, ed è un
  colpo nel piede con un'interfaccia attorno.

Vedi anche: [Esploratore di oggetti](objects.md) ·
[Rimuovere un file dalla storia](history-purge.md) ·
[Manutenzione del repository](maintenance.md)
