---
title: Radar dei conflitti
category: Branch e chirurgia
order: 44
summary: Scopri quali branch andranno in conflitto prima di fonderne uno solo.
keywords: radar conflitti conflict merge anteprima scontro rischio branch merge-tree
---

# Radar dei conflitti

Scoprire che un branch va in conflitto facendone il merge è un modo costoso di
porre una domanda. Il radar ti risponde prima.

Gitcito fonde ogni branch in una base a tua scelta **dentro il database degli
oggetti** (`git merge-tree --write-tree`). Nessun checkout, nessuna modifica
all'indice, nessuna modifica all'albero di lavoro, niente da ripulire dopo. Il
tuo lavoro non committato può restare esattamente dov'è mentre la scansione gira.

![Il radar, un verdetto per branch](../../screenshots/conflict-radar.webp)

![La scansione branch per branch, poi l'apertura dei file contesi](../../screenshots/clip-conflict-radar.webp)

## Come si usa

Aprilo dal menu strumenti, con <kbd>⌘K</kbd> → *Radar dei conflitti*, oppure con
un clic destro su un branch per confrontare tutto contro **quel** branch.

Fa la scansione appena si apre, usando come base il branch corrente.

| Verdetto | Significato |
|---|---|
| **Andrà in conflitto** | Fonderlo richiede lavoro a mano. I percorsi esatti sono elencati. |
| **Merge pulito** | Si applicherebbe senza opporre resistenza. |
| **Già dentro** | La base lo contiene già — niente da fondere. |
| **Fallito** | Git ha rifiutato: storie non correlate, ref mancante. Il motivo è indicato. |

I branch sono ordinati dal peggiore, e il peggiore fra i peggiori — quello che
tocca più file — finisce in cima.

## File contesi

Sotto, **File contesi** ordina i percorsi in base a quanti branch li stanno
riscrivendo. Due branch che si contendono un file sono una conversazione da fare
subito; cinque sono un problema di progettazione.

## Dopo una scansione

Le righe dei branch nella barra laterale portano un punto colorato: rosso andrà
in conflitto, verde è pulito, ambra è un branch che git ha rifiutato. I branch
già contenuti nella base non prendono alcun punto — una fila di puntini grigi su
tutto ciò che è già fuso è solo rumore.

> La scansione non cambia niente. `git status` resta pulito e HEAD non si muove.

**Vedi anche:** [Cos'è cambiato da](range-diff.md) · [Merge e rebase](merging.md)
