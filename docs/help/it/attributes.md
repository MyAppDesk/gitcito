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

I pulsanti qui fanno entrambe le cose insieme. Per Word, Excel, JSON e `.strings`, Gitcito
**include il convertitore esso stesso** — lo stesso parsing dei documenti usato
dalle sue anteprime, esposto come un piccolo comando `gitcito-textconv` dentro
l'app — quindi quei quattro funzionano senza installare nulla. Gli altri richiedono
ancora uno strumento vero nel tuo PATH: Gitcito controlla e disattiva ciò che
manca, invece di scrivere un driver che fallisce al primo diff.

| Driver | Richiede | Ti dà |
|--------|-------|-----------|
| `word` | niente — incluso in Gitcito | Diff in prosa dei `.docx` |
| `excel` | niente — incluso in Gitcito | Diff riga per riga (CSV per foglio) dei `.xlsx`/`.xls` |
| `json` | niente — incluso in Gitcito | Diff JSON stabili, con chiavi ordinate |
| `strings` | niente — arriva con Gitcito | Diff per righe di un `.strings` UTF-16, che git chiama binario |
| `pdf` | `pdftotext` (poppler) | Diff testuali dei `.pdf` |
| `exif` | `exiftool` | Cosa è cambiato in un'immagine, quando i pixel sono opachi |

### Quello che morde i progetti iOS

`Localizable.strings` è UTF-16 per quasi tutta la storia di Xcode, e l'UTF-16 è
pieno di byte NUL: git lo chiama binario e non mostra **niente**.

```
diff --git a/Localizable.strings b/Localizable.strings
Binary files a/Localizable.strings and b/Localizable.strings differ
```

Ed è proprio il file dove vedere quale stringa ha spostato qualcuno conta di
più. Il driver `strings` lo decodifica solo per il diff — leggendo il marcatore
d'ordine dei byte invece di darlo per scontato, così un `.strings` moderno in
UTF-8 passa intatto anziché diventare accozzaglia.

Gli String Catalog (`.xcstrings`, da Xcode 15) sono JSON, e il driver `json` li
copre: ordina le chiavi, così una traduzione aggiunta in cima smette di
riscrivere l'intero file nel diff.

I limiti del convertitore incluso, detti chiaramente: `.doc` (il vecchio
formato binario di Word) non è compreso, solo `.docx`; il PDF non è coperto —
Gitcito mostra l'anteprima dei PDF con il visore del browser e non ha un
estrattore di testo da riusare —; e ogni diff di un documento paga un breve
costo di avvio del convertitore.
Con `git config diff.<name>.cachetextconv true` git mette in cache l'output
per blob.

La metà del convertitore vive nella **tua** configurazione, non nel repository:
git non esegue comandi che un clone gli mette in mano, ed è una proprietà di
sicurezza che vale la pena conservare. I driver inclusi, inoltre, puntano al
*tuo* percorso di installazione di Gitcito, quindi un collega che clona riceve
la regola `diff=word` e, finché non collega un proprio convertitore (Gitcito o
altro), il vecchio diff illeggibile. Scrivilo nel tuo README.

## Filtri clean/smudge — con una prova a secco prima

Un **filtro** riscrive il contenuto in entrata e in uscita dal repository:
`clean` gira allo stage (albero di lavoro → repo), `smudge` al checkout (repo →
albero di lavoro). È così che funziona git-lfs, ed è così che i team eliminano
credenziali o rumore generato da ciò che viene committato.

È anche la cosa più pericolosa a cui `.gitattributes` possa puntare: un filtro
gira a **ogni checkout di ogni file corrispondente**, e uno sbagliato corrompe
in silenzio il tuo albero di lavoro. Per questo qui Gitcito si rifiuta di
essere una semplice casella di testo.
Configurare un filtro passa per una **prova a secco** contro file reali del tuo
repository che corrispondono:

1. Il comando `clean` gira su una copia di ogni file corrispondente (fino a
   cinque) — niente nel repository o nella sua configurazione viene toccato.
2. Se è indicato un comando `smudge`, gira sull'output pulito e il risultato
   viene confrontato byte per byte con l'originale — la **verifica di andata e
   ritorno**. Un filtro che non completa il giro significa che un checkout non
   ripristinerà quello che avevi.
3. Solo dopo una prova a secco su esattamente i valori che stai salvando il
   pulsante di salvataggio si attiva. Una prova a secco fallita — errore del
   comando, nessun file corrispondente, o un'andata e ritorno che differisce —
   si può comunque salvare, ma solo attraverso un avviso esplicito che dice
   cosa si può perdere.

Salvare scrive `filter.<name>.clean/smudge` nella tua configurazione git
**locale** e la regola `filter=<name>` nel file di attributi, e lascia una voce
di annullamento che ripristina ciò che la configurazione conteneva prima.
L'interruttore **required** imposta `filter.<name>.required`, con cui git fa
fallire l'operazione invece di lasciar passare i file in silenzio quando il
filtro si rompe.

I limiti, detti chiaramente: la prova a secco campiona fino a cinque file
corrispondenti di al massimo 5 MB ciascuno, con un timeout di 10 secondi per
comando — un filtro che si comporta bene sul campione può comportarsi male su
un file che il campione non ha visto. I comandi vivono nella *tua*
configurazione, quindi un collega che clona riceve la regola `filter=<name>` ma
non i comandi; senza di essi (e senza **required**) i suoi file passano
invariati.

## Limiti da conoscere

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
