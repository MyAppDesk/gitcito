---
title: Risolvere i conflitti
category: Lavorare con le modifiche
order: 32
summary: Un risolutore a tre pannelli che ti dice quale lato è quale.
keywords: conflitto conflict risolutore resolver merge ours theirs risolvi marcatori tre vie rerere reuse recorded resolution ricorda replay
---

# Risolvere i conflitti

Quando un merge, un rebase, un cherry-pick o un revert si ferma, un banner ti
dice **cosa** si è fermato e **fra cosa e cosa** — "merge di `feature/x` dentro
`main`", non solo "conflitto".

![Il risolutore di conflitti](../../screenshots/conflict-resolver.webp)

## Perché questo va in conflitto

**Perché questo va in conflitto**, nell'intestazione, elenca lato per lato i
commit che hanno toccato questo file da quando i branch si sono separati — è
`git log --merge`, che git offre da sempre e che nessuno trova.

![I commit di ciascun lato che hanno toccato il file in conflitto](../../screenshots/conflict-why.webp)

I marcatori dicono cosa si scontra. Questo dice chi l'ha cambiato e perché, che
di solito è ciò che decide davvero la risoluzione. Se lì non c'è niente,
significa che nessuno dei due lati ha committato una modifica esattamente a
questo percorso: lo scontro è nato da una rinomina o da uno spostamento.

## I tre pannelli

| Pannello | Cos'è |
|---|---|
| Sinistra | **Nostro** — il lato su cui eri, etichettato con il suo commit |
| Destra | **Loro** — il lato in arrivo, etichettato con il suo commit |
| Centro | L'**output**: modificabile, con i numeri di riga, ed è ciò che finisce davvero in stage |

Tutti e tre i pannelli sono ridimensionabili, e l'intestazione dell'output
porta due interruttori di vista:

| Interruttore | Cosa fa |
|---|---|
| **A capo** | Manda a capo le righe lunghe dentro i pannelli A e B invece di scorrerle. Il pannello dell'output mantiene una riga per riga — i suoi marcatori laterali dipendono da questo — quindi scorre sempre |
| **Collegato** | Fa scorrere A, B e l'output insieme, in verticale e in orizzontale. I loro conteggi di righe differiscono, quindi la posizione verticale viene allineata in proporzione |

A capo parte disattivato, Collegato parte attivato, ed entrambi ricordano il
proprio stato.

## Muoversi

Aprendo un file atterri sul suo **primo conflitto**, non in cima al file. Le
frecce ⌃ / ⌄ nell'intestazione dell'output — o <kbd>Alt+↑</kbd> /
<kbd>Alt+↓</kbd> — passano in rassegna gli altri, facendo scorrere tutti e tre
i pannelli fino a ciascuno.

## Scegliere

Per **riga**, per **blocco**, o **tutto un lato** in una volta — e puoi prendere
entrambi i lati di un blocco quando la risposta è "teniamoli tutti e due". Un
navigatore conflitto per conflitto ti accompagna in ciò che resta, così non puoi
lasciarti dietro un marcatore per distrazione.

## Assistenza AI

Con l'AI attiva, **Risolvi con l'AI** propone un merge nel pannello di output.
Non applica mai niente da solo: lo leggi, lo modifichi e lo metti in stage. Vedi
[Funzioni AI](ai.md).

## File di progetto Xcode

`project.pbxproj` va in conflitto più di qualsiasi altro file di un repository
iOS, e quasi mai perché qualcuno fosse in disaccordo. È un unico dizionario
piatto di oggetti con chiavi esadecimali di 24 cifre, quindi aggiungere un file
scrive quattro voci: un `PBXBuildFile`, un `PBXFileReference`, una riga nei
`children` del gruppo che lo contiene e una nella fase di build del target. Due
persone che aggiungono un file a testa scrivono otto voci che finiscono sulle
stesse poche righe. Git vede una collisione; non c'è nulla da risolvere.

Quando il file in conflitto è un `project.pbxproj`, il risolutore legge tutte e
tre le versioni come progetti anziché come testo e propone di **unire per
struttura**: accoppiare gli oggetti per identificatore, prendere ogni aggiunta
da entrambe le parti, unire gli array `children` e `files` e fermarsi su ciò che
è davvero divergente. La fascia sopra i pannelli dice cosa ha aggiunto ciascuna
parte e cosa — se qualcosa — resta a te.

Come la proposta dell'IA, atterra nel pannello di output e non mette nulla in
stage. La leggi prima di salvare.

![La fascia di unione strutturale sopra i pannelli di conflitto, su un file di progetto Xcode](../../screenshots/conflict-pbxproj.webp)

### Cosa si rifiuta di fare

**Non indovina mai un'impostazione che avete spostato entrambi.** Se tu metti
`MARKETING_VERSION` a `1.1` e loro a `2.0`, quella è una decisione, ed è nominata
nella fascia — l'impostazione, il tuo valore, il loro — invece di essere risolta
alle tue spalle. Un oggetto che non ha potuto dirimere conserva *la tua*
versione esatta, così un'unione applicata a metà non raggiunge mai il disco.

**Rifiuta l'intero file se una delle tre versioni non si analizza.** Un
`project.pbxproj` che Xcode non riesce ad aprire costa più di un'unione manuale,
quindi tutto ciò che non può leggere con certezza resta un normale conflitto
testuale, e lo dice.

**Non rileva due identificatori coniati per oggetti diversi.** È raro, perché
Xcode li sceglie a caso, ma quando succede prendere una delle due parti
scarterebbe in silenzio il file di qualcuno, quindi viene segnalato invece che
unito.

### Non `merge=union`

Il rimedio che circola per questo è `*.pbxproj merge=union` in
[`.gitattributes`](attributes.md). Evitalo. L'unione funziona finché gli unici
cambiamenti sono aggiunte indipendenti, e nel momento in cui due persone
modificano la stessa impostazione di build emette entrambe le righe e produce un
file che Xcode si rifiuta di aprire — proprio quando è meno probabile che tu stia
leggendo il diff con attenzione. L'unione strutturale dà la stessa comodità senza
quel guasto.

## Lockfile

`Podfile.lock`, `Package.resolved`, `yarn.lock` e i loro cugini registrano un
grafo di dipendenze che il resolver di qualcuno ha già risolto. Metà di una
soluzione cucita a metà di un'altra è un grafo che non ha risolto nessuno: può
non installarsi, e se si installa, installa qualcosa che nessuno dei due rami ha
provato.

Così, quando il file in conflitto è un lockfile, la fascia nomina lo strumento
che lo governa, offre lì stesso **Tieni i nostri** e **Tieni i loro**, e ti dà
il comando che lo rigenera dopo. Scegliere una parte qui non è un compromesso —
è tutto il metodo, e la rigenerazione è ciò che lo rende corretto.

![La fascia del lockfile sopra i pannelli di conflitto](../../screenshots/conflict-lockfile.webp)

I tre pannelli restano disponibili, perché ogni tanto vuoi davvero leggere cosa
è cambiato: un checksum che riconosci, una versione che ti aspettavi.
Modificarli a mano è proprio ciò da cui questo cerca di dissuaderti.

## Evitarli in partenza

Il [radar dei conflitti](conflict-radar.md) ti dice quali branch andranno in
conflitto prima che tu ne fonda uno.

## Lasciare che git ricordi (rerere)

Fai il rebase di un branch di lunga vita e incontri ogni volta lo stesso
conflitto. `rerere` — *reuse recorded resolution* — è la risposta di git:
memorizza come hai sistemato un conflitto e ripropone quella risposta la volta
successiva che ne compare uno identico.

**Impostazioni → Generali → Ricorda le risoluzioni dei conflitti.** Scrive
`rerere.enabled` nella tua configurazione git globale, così anche la riga di
comando si comporta allo stesso modo.

Quando git ha risposto al posto tuo, il risolutore lo dice invece di mostrare una
schermata vuota con scritto "nessun marcatore di conflitto", e offre **Dimentica
questa risoluzione** — che cancella il ricordo *e* riporta indietro il conflitto,
così puoi sistemarlo diversamente.

Due cose che conviene sapere:

- **Una risoluzione riproposta non viene messa in stage** a meno che tu non
  attivi *Metti automaticamente in stage una risoluzione riproposta*. Lascialo
  spento: il senso della pausa è che una risposta memorizzata può essere
  sbagliata per questo particolare merge, e mettere in stage senza guardare è
  esattamente il modo in cui arriva a un commit.

  È per questo che un file riproposto **resta fra i File in conflitto**: git ha
  scritto il contenuto, ma l'indice lo tiene ancora come non fuso, e solo lo
  staging chiude la questione. A muoverlo è **Metti in stage così com'è** nel
  risolutore, oppure **Segna tutto come risolto** nell'elenco.
- **rerere non capisce ogni conflitto.** I conflitti add/add e delete/modify non
  producono alcuna preimmagine, quindi tornano sempre grezzi. Il conteggio nelle
  impostazioni dice quanti ne conserva davvero, e **Dimentica tutto** lo svuota.

**Vedi anche:** [Radar dei conflitti](conflict-radar.md) · [Merge e rebase](merging.md)
