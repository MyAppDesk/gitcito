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
| **Gitmoji + Convenzionale** | `✨ feat(api): add rate limiting` — selettore di emoji *e* menu del tipo |
| **Ticket** | `ABC-123: add rate limiting` — precompilato dal nome del branch |
| **Semplice** · **Auto** | Quello che scrivi tu; con Auto è l'AI a decidere la forma |
| **Cavernicolo** · **Haiku** | Esattamente quello che sembrano |

![Il compositore precompilato da un template di commit](../../screenshots/commit-template.webp)

### Gitmoji

[Gitmoji](https://gitmoji.dev) mette un emoji davanti all'oggetto, così la
cronologia si legge a colpo d'occhio: 🐛 correzioni, ✨ funzionalità, 🔥
rimozioni. Con entrambi gli stili gitmoji, il pulsante dell'emoji sta accanto al
campo dell'oggetto. Apre **tutti i 75 gitmoji ufficiali**, cercabili per emoji,
per `:codice:` (quello che digita chi usa gitmoji-cli) o per significato nella
tua lingua.

**Gitmoji + Convenzionale** tiene tipo ed emoji allineati. Scegli un tipo e il
suo emoji lo segue; cambia il tipo e cambia anche l'emoji, a meno che tu non
l'abbia scelto a mano (🚑️ su un `fix`, per esempio): quello non viene mai
sovrascritto.

| Tipo | Emoji | Tipo | Emoji |
|---|---|---|---|
| `feat` | ✨ | `test` | ✅ |
| `fix` | 🐛 | `build` | 📦️ |
| `docs` | 📝 | `ci` | 👷 |
| `style` | 🎨 | `chore` | 🔧 |
| `refactor` | ♻️ | `revert` | ⏪️ |
| `perf` | ⚡️ | | |

L'IA scrive nella stessa forma. Se un modello dimentica l'emoji o risponde con
uno `:shortcode:`, l'oggetto viene corretto prima di arrivare nel campo.

I commit scritti da altri strumenti come `:sparkles: add login` vengono
**mostrati** come `✨ add login` nel grafo, nei dettagli del commit e nelle viste
della cronologia.

Limiti:

- Il selettore scrive sempre l'emoji **unicode**, mai uno `:shortcode:`.
- Gli shortcode sono convertiti solo in visualizzazione. Il commit non viene
  riscritto, e la ricerca nella cronologia trova il testo così come è stato
  committato.
- Contano solo i gitmoji: un oggetto che inizia con un altro emoji resta com'è.
- Un repository il cui hook `commit-msg` esegue commitlint con il preset
  Conventional standard rifiuta un emoji iniziale. È la regola dell'hook, non di
  Gitcito: configura commitlint per gitmoji o usa lì il Conventional puro.

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
