---
title: Lingue e scrittura da destra a sinistra
category: Personalizzazione
order: 102
summary: Scegli la lingua dell'interfaccia per bandiera ed endonimo, con un layout speculare per arabo ed ebraico.
keywords: lingua lingue language locale i18n internazionalizzazione traduzione rtl right-to-left destra a sinistra arabo ebraico specchio direzione bandiera endonimo inglese spagnolo tedesco francese portoghese italiano olandese polacco turco russo ucraino cinese giapponese coreano
---

# Lingue e scrittura da destra a sinistra

L'interfaccia di Gitcito è tradotta. La lingua è
un'impostazione di Gitcito, non del sistema operativo — chi sviluppa su un macOS
in inglese ma preferisce leggere in giapponese la imposta qui, e chi sviluppa su
un sistema in ebraico ma preferisce l'app in inglese non viene scavalcato.

**Impostazioni → Generali → Lingua.**

![Il selettore della lingua](../../screenshots/languages.webp)

## Cosa c'è nella confezione

| | | | |
|---|---|---|---|
| English | Español | Deutsch | Français |
| Português (Brasil) | Italiano | Nederlands | Polski |
| Türkçe | Русский | Українська | 简体中文 |
| 日本語 | 한국어 | العربية | עברית |

Ogni riga del selettore è scritta nella propria lingua. Chi cerca il coreano sta
scorrendo alla ricerca di 한국어, non della parola "coreano" in una lingua da cui
sta cercando di andarsene.

### Sulle bandiere

Una bandiera nomina un paese; una locale nomina una lingua. Le due cose non
coincidono davvero — l'arabo è lingua ufficiale in più di venti stati, e il
portoghese sta su due continenti. Le icone seguono la stessa convenzione che usa
il selettore di locale di qualsiasi sistema operativo: la regione principale
della locale. Servono a farsi *riconoscere a colpo d'occhio*, non ad affermare
qualcosa su chi possiede una lingua.

Sono disegnate come grafica vettoriale invece che come emoji, e non per caso.
Windows non include alcuna emoji di bandiera — `🇩🇪` lì viene renderizzata come
un riquadro con dentro le lettere "DE".

## Da destra a sinistra

Arabo ed ebraico rispecchiano l'intera interfaccia: la barra laterale si sposta a
destra, pannelli e barre degli strumenti si invertono, le icone che puntano da
qualche parte puntano dall'altra.

Il passaggio è immediato e non richiede alcun riavvio.

![Gitcito in arabo, con il layout rispecchiato](../../screenshots/rtl.webp)

### Cosa deliberatamente non viene rispecchiato

Certi contenuti restano da sinistra a destra qualunque lingua tu legga.
Rispecchiarli sarebbe attivamente sbagliato, quindi restano come sono:

| Resta LTR | Perché |
|-----------|-----|
| Il grafo dei commit | Le posizioni delle corsie sono calcolate in pixel; un contenitore rispecchiato non sarebbe d'accordo con le linee disegnate |
| Diff e contenuti dei file | Il codice è LTR, e un diff rispecchiato è illeggibile |
| Blame e output dei conflitti | Stesso motivo — il testo è sorgente, non prosa |
| Il terminale integrato | Renderizza una griglia sua; l'output di git è LTR |
| Percorsi, SHA, ref e comandi | `refs/heads/main` si legge in una sola direzione |

Ognuno di questi è isolato, così un tratto di arabo *dentro* uno di essi — il
nome di un branch, un messaggio di commit, un nome di file — non può riordinare
il testo attorno a sé.

### I limiti

Su dove si ferma questa cosa è onesta:

- **Messaggi di commit, nomi dei branch e contenuti dei file non vengono mai
  ridirezionati da Gitcito.** Sono mostrati come li ha scritti il loro autore. Un
  messaggio di commit in ebraico dentro un elenco isolato in LTR viene mostrato
  in ebraico, ma la riga attorno non si ribalta per assecondarlo.
- **Le superfici di terze parti mantengono la propria direzione** — il terminale
  è xterm, e le anteprime Markdown renderizzano il documento com'è scritto.
- **I nomi di file a direzione mista sono difficili.** Un percorso con una
  cartella in arabo dentro un albero in inglese viene isolato invece che
  riordinato, il che è corretto ma può comunque sorprendere la prima volta.

## Anche questo manuale è tradotto

Non solo i pulsanti. Ogni pagina che stai leggendo esiste in tutte le lingue che
mostra l'elenco qui sopra — le spiegazioni, le tabelle su cosa fa ciascuna
opzione, le sezioni che dicono cosa una funzione si rifiuta di fare. Cambiare la lingua dell'interfaccia
cambia il manuale insieme a lei, tanto nell'app quanto sul sito.

A una traduzione è concesso di essere incompleta. Se una pagina non è ancora
tradotta ti arriva quella inglese invece di una pagina mancante, e la barra
laterale mantiene la stessa forma in ogni lingua, così una schermata o
un'istruzione continuano a coincidere con quello che vedi.

Sul sito ogni pagina ha un selettore di lingua che ti lascia sulla pagina che
stavi leggendo, perché cambiare lingua non è la stessa cosa che ricominciare da
capo.

**Cosa è tradotto da una macchina, e quanto costa.** Inglese e spagnolo sono
scritti a mano. Il resto lo ha tradotto un modello a partire da un glossario, e
poi lo ha controllato uno script: ogni pagina, ogni link, ogni percorso di
immagine, ogni blocco di codice byte per byte contro l'inglese. Questo
intercetta la struttura rotta. Non intercetta una frase corretta ma legnosa. Se
una pagina si legge male nella tua lingua, quello è un bug che vale la pena
segnalare.

## Aggiungere una lingua

I dizionari sono un file per locale sotto `src/renderer/src/i18n/`, e il file
inglese è il riferimento su cui tutti gli altri vengono verificati dal sistema di
tipi — una chiave mancante è un errore di compilazione, non un silenzioso ritorno
all'inglese. La suite di test controlla anche che ogni `{placeholder}` che una
stringa interpola sopravviva alla traduzione, così una frase non può perdere per
strada il proprio sha di commit nel passaggio a un'altra lingua.

Il manuale funziona allo stesso modo: `docs/help/` contiene le pagine in inglese
e `docs/help/<locale>/` contiene ogni traduzione, un file per pagina con lo
stesso nome. `npm run lint:docs` controlla che ogni pagina tradotta abbia un
originale inglese, che il suo front matter sia completo e che i suoi link e le
sue immagini si risolvano da una directory più in basso.

I contributi sono benvenuti — una pagina alla volta va benissimo, e correggere
una traduzione goffa è utile quanto aggiungerne una che manca.

**Vedi anche:** [Temi e aspetto](themes.md) · [Profili](profiles.md)
