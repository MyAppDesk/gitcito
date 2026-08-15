---
title: Attributi dei file
category: Strumenti dell'area di lavoro
order: 96
summary: .gitattributes con un'interfaccia — fine riga, binari, changelog uniti in union, export-ignore e diff leggibili per Word e PDF.
keywords: gitattributes attributi attributes diff driver textconv merge union binario export-ignore eol crlf lf text auto filter clean smudge lfs linguist check-attr
---

# Attributi dei file

`.gitattributes` è il file di git con il rapporto valore/diffusione più
squilibrato: quasi nessuno lo scrive. È il modo in cui un repository **insegna a
git com'è fatto il suo contenuto**: quali file sono binari, quali devono
concatenarsi invece di andare in conflitto, quali non devono mai finire in un
archivio, quali fine riga tocca a tutti.

La parte che conta: viene committato. Una regola che aggiungi risolve il problema
per chiunque cloni, su ogni sistema operativo, per sempre — al contrario di
un'impostazione nella tua configurazione personale, che lo risolve per te e
lascia i colleghi a scoprirlo nel modo peggiore.

`⌘K` → **Attributi dei file**.

![Le regole che un repository già porta con sé, i preset, il verificatore di percorsi e i diff driver](../../screenshots/attributes.webp)

## Cosa fanno le regole

| Attributo | Risolve |
|-----------|-------|
| `text=auto eol=lf` | Fine riga che cambiano a seconda di chi ha fatto il checkout |
| `binary` | Git che tenta di fare il diff o il merge a tre vie di un PSD, un DOCX, un asset compilato |
| `merge=union` | Un changelog a cui tutti aggiungono in fondo, e su cui tutti vanno in conflitto |
| `-merge` | File in cui un merge a tre vie produce assurdità — lockfile, codice generato |
| `export-ignore` | Configurazioni CI e fixture spedite dentro un tarball di release |
| `diff=<driver>` | Diff illeggibili per formati che *sarebbero* leggibili, dato un convertitore |
| `filter=lfs` | File grandi conservati tramite [LFS](lfs-sparse.md) |
| `linguist-vendored` | Codice di terze parti conteggiato come tuo nelle statistiche dei linguaggi |

`binary` è l'abbreviazione di `-diff -merge -text`, cioè tre risposte a "smettila
di fare congetture su questo file" in una parola sola.

## Modifica

I preset compilano un pattern e i suoi attributi; modifica il pattern prima di
aggiungerlo — `CHANGELOG.md` è un suggerimento, non una regola sul tuo progetto.

**Le modifiche sono chirurgiche.** Aggiungere una regola per un pattern che ne ha
già una riscrive quella riga dove si trova, invece di accodare una seconda regola
che vince solo perché viene dopo. I commenti nel file sopravvivono intatti,
perché il "perché" accanto a una regola di solito vale più della regola stessa.

Ogni salvataggio è una normale azione di Gitcito: produce un toast, e **Annulla**
riporta il file esattamente com'era.

**Un repository può avere più file di attributi.** Uno alla radice, uno in
qualsiasi sottodirectory, e un `.git/info/attributes` privato che non viene mai
committato e vale solo sulla tua macchina — il posto giusto per una regola che
riguarda te, non il progetto. Gitcito li elenca tutti e dice quale è quale.

## Cosa si applica a un percorso?

Le regole arrivano da più file, vince la più specifica, e leggerle per dedurre la
risposta è tirare a indovinare. **Cosa si applica a un percorso?** esegue
`git check-attr` e mostra cosa conclude git stesso — l'unica risposta che conta.

## Diff driver: rendere leggibile un documento Word

Un `.docx` è uno zip. Un `.pdf` è un grafo di oggetti compressi. Git ne fa il
diff per quello che sono — rumore — e così la storia di un documento diventa
illeggibile anche se il documento non lo è.

Un **diff driver** risolve la cosa con `textconv`: un comando che trasforma il
file in testo *solo ai fini del diff*. Il file nel tuo albero di lavoro resta
intatto; git confronta semplicemente il testo convertito.

Due metà, e servono entrambe:

1. `diff.<name>.textconv` nella configurazione git — il comando di conversione.
2. `*.docx diff=<name>` in `.gitattributes` — a quali file si applica.

I pulsanti qui fanno entrambe le cose insieme. Gitcito **non include nessuno di
questi convertitori** e non finge il contrario: controlla il tuo PATH e offre
solo ciò che è davvero installato, disattivando il resto con l'indicazione del
binario che servirebbe.

| Driver | Richiede | Ti dà |
|--------|-------|-----------|
| `word` | `pandoc` | Diff in prosa dei `.docx` |
| `pdf` | `pdftotext` (poppler) | Diff testuali dei `.pdf` |
| `excel` | `xlsx2csv` | Diff riga per riga dei fogli di calcolo |
| `exif` | `exiftool` | Cosa è cambiato in un'immagine, quando i pixel sono opachi |
| `json` | `jq` | Diff JSON stabili, con chiavi ordinate |

La metà del convertitore vive nella **tua** configurazione, non nel repository:
git non esegue comandi che un clone gli mette in mano, ed è una proprietà di
sicurezza che vale la pena conservare. Quindi un collega che clona riceve la
regola `diff=word` e, finché non installa pandoc, il vecchio diff illeggibile.
Scrivilo nel tuo README.

## Limiti da conoscere

- **I filtri clean/smudge non sono offerti qui.** Le regole `filter=<name>` si
  possono scrivere a mano, ma Gitcito non configura i comandi: un filtro gira a
  ogni checkout di ogni file corrispondente, e uno sbagliato corrompe in silenzio
  il tuo albero di lavoro.
- **`text=auto` cambia cosa viene committato**, normalizzando i fine riga in
  ingresso. Su un repository esistente, aggiungilo e poi esegui
  `git add --renormalize .` deliberatamente, in un commit tutto suo.
- **Gli attributi non si applicano retroattivamente.** Marcare oggi un file come
  `binary` non cambia come sono stati memorizzati i suoi diff passati; cambia
  come git lo tratta d'ora in avanti.
- **Le regole valgono solo dove il file è visibile.** Una regola in
  `design/.gitattributes` non dice nulla su `src/`.
- Gitcito riscrive file interi, quindi un file formattato a mano torna con la sua
  formattazione — ma una regola che Gitcito riscrive viene riformattata secondo
  la spaziatura canonica di git, `pattern attr attr`.

Vedi anche: [LFS e sparse checkout](lfs-sparse.md) ·
[Bundle e archivi](export.md) · [Opzioni di merge](merge-options.md) ·
[Hook](hooks.md)
