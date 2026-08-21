---
title: Fare commit
category: Lavorare con le modifiche
order: 31
summary: Stili di messaggio, template, coautori e il linter.
keywords: commit messaggio composer conventional gitmoji ticket amend template co-author coautore linter annulla undo reset
---

# Fare commit

## Stili di messaggio

Ne scegli uno nelle impostazioni; il compositore si adatta.

| Stile | Ha questo aspetto |
|---|---|
| **Conventional** | `feat(api)!: add rate limiting` — con un menu dei tipi |
| **Gitmoji** | `✨ add rate limiting` — con un selettore di emoji |
| **Ticket** | `ABC-123: add rate limiting` — precompilato dal nome del branch |
| **Semplice** · **Auto** | Quello che scrivi tu; con Auto è l'AI a decidere la forma |
| **Cavernicolo** · **Haiku** | Esattamente quello che sembrano |

![Il compositore precompilato da un template di commit](../../screenshots/commit-template.webp)

## Cose che il compositore fa per te

- <kbd>↑</kbd> <kbd>↓</kbd> richiamano i tuoi **messaggi recenti**.
- Un **selettore di coautori** aggiunge i trailer `Co-authored-by:` prendendoli
  dai contributori del repository stesso.
- `commit.template` / `.gitmessage` **precompilano** il messaggio, con le righe
  di commento eliminate.
- Durante un merge, un cherry-pick o un revert, il messaggio è **precompilato**
  come farebbe git.
- Le bozze **restano** per repository, quindi cambiare scheda non perde mai un
  messaggio.

## Il linter

Un controllo dal vivo, non bloccante: lunghezza del soggetto (con contatore di
caratteri), punto finale, soggetto non imperativo o minuscolo, righe del corpo
troppo larghe. Suggerimenti, mai un cancello — non ti impedirà di committare.

## Amend

L'amend riscrive l'ultimo commit con quello che c'è in stage. Gitcito ti mostra
prima il messaggio esistente, così stai modificando e non riscrivendo da capo.

**Correggi commit…** su una riga del grafo fa la stessa cosa per HEAD: carica il
messaggio completo, mette il compositore in modalità amend e gli dà il focus. Un
HEAD già inviato si può comunque correggere, ma Gitcito avvisa che aggiornare il
remote richiederà un force push.

**Annulla commit…** è il gemello per un HEAD non ancora inviato: reset mixed al
genitore, modifiche dell'albero di lavoro conservate, messaggio riportato nel
compositore. Il commit iniziale ha un percorso dedicato che lascia un branch non
nato invece di distruggere i file.

**Vedi anche:** [Staging](staging.md) · [Absorb](absorb.md) · [Generatore di changelog](changelog.md)
