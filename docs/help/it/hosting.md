---
title: Hosting e pull request
category: Sincronizzazione e più repo
order: 56
summary: Crea PR ovunque; su GitHub e GitLab puoi anche recensirle e fonderle.
keywords: pull request PR merge request GitHub GitLab Bitbucket Azure DevOps review revisione approva merge issue
---

# Hosting e pull request

## Creare

Crea una pull request (o merge request) senza uscire dall'app: menu a tendina per
i branch, titolo e corpo precompilati dai commit del branch, un interruttore per
la bozza e — su GitHub — revisori, etichette e assegnatari applicati alla
creazione.

![La creazione di una pull request](../../screenshots/create-pr.webp)

Funziona su **GitHub, GitLab, Bitbucket e Azure DevOps**. Le PR/MR aperte di
tutti e quattro sono elencate nella barra laterale.

Puoi partire dal confronto fra branch, dal grafo, dal `+` nel pannello delle PR,
oppure da una issue (che compila `Closes #N`).

## Le pile nell’elenco

Le pull request appoggiate una sull’altra si richiudono in una sola riga con
un’icona di pila, il ramo su cui atterra la catena e quante sono. Espandila per
vedere la catena in ordine di lettura — dalla foglia giù fino alla base — con una
freccetta sotto ognuna che dice in cosa confluisce: la direzione è a schermo,
non da dedurre da quattro rami base.

Due cose formano quel gruppo: il numero di pila di GitHub, quando le PR
appartengono a una [pila nativa](stacks.md), altrimenti le ref stesse: una pull
request la cui base è la testa di un’altra si appoggia su di essa. La seconda
regola è ciò che lo fa funzionare anche su GitLab, Bitbucket e Azure DevOps.

![Una pila nell’elenco delle pull request](../../screenshots/pr-stack-list.webp)

Ogni riga porta lo stato dei **check** della sua testa — passa sopra per i
conteggi — e, su GitHub, anche i livelli già chiusi o uniti, che un elenco di PR
aperte nasconderebbe. Un livello sopra uno **chiuso** viene segnato come
bloccato: i suoi check possono essere verdi, ma il ramo a cui punta non atterrerà
mai. Le azioni della riga compaiono al passaggio del mouse, così il titolo tiene
la larghezza.

Leggere i check costa una richiesta per pull request, e solo quando l’elenco
viene aggiornato.

## Revisione — GitHub e GitLab

| | |
|---|---|
| **Conversazione** | Commenti e stato della revisione |
| **Controlli** | Le check-run della CI (GitHub) o i job di pipeline (GitLab) con esito/attesa e i link ai log |
| **File visti** | Una spunta ✓ per file, con l'avanzamento |
| **Thread inline** | Commenti di riga raggruppati per `file:line`, e le risposte |
| **Azioni** | Commenta, approva, richiedi modifiche, e merge / squash |

Se qualcuno fa un force push a metà revisione,
[cos'è cambiato da](range-diff.md) ti mostra esattamente cosa si è spostato.

Le differenze di GitLab, dette chiaramente: GitLab non ha una singola chiamata
"invia revisione", quindi **approva** usa il suo endpoint di approvazione e
**richiedi modifiche** rimuove la tua approvazione e pubblica il tuo commento.
Il **rebase-merge** non è offerto — GitLab decide tra merge-commit e
fast-forward in base alle impostazioni del progetto, quindi il menu di merge
mostra solo merge e squash. I thread inline mostrano file e riga, ma non l'hunk
di diff circostante, che l'API di GitLab non restituisce. Revisione e merge
funzionano per i progetti su **gitlab.com**; le istanze self-hosted non sono
ancora supportate. Bitbucket e Azure DevOps si aprono ancora nel browser per la
revisione.

## Issue, milestone, release — GitHub

Sfoglia le issue e apri una scheda completa per una di esse: corpo, commenti,
etichette, assegnatari, milestone, campi dei Projects v2, chiusura e riapertura,
e **crea un branch per questa issue** (con la denominazione affidata all'AI). Le
milestone mostrano l'avanzamento e le proprie issue. Le release sono sfogliabili
con una pagina di changelog.

## Notifiche — GitHub

Tutta la tua posta in arrivo — richieste di revisione, menzioni, attività della
CI — su ogni repository, con i filtri non letti/tutte e la marcatura come letto.
La campanella nella barra degli strumenti porta un badge dei non letti, e
notifiche desktop opzionali scattano quando ti viene chiesta una revisione o la
CI finisce.

## Token

Token per profilo per più account o organizzazioni, conservati nel portachiavi
del tuo sistema operativo. Gitcito può anche prendere in prestito quello che il
tuo **credential helper di git** già custodisce, quindi un'organizzazione per cui
ti sei già autenticato spesso non richiede alcuna configurazione. Vedi
[Sicurezza e segreti](security.md).

Ogni profilo **collega il proprio account**. In Impostazioni → Integrazioni,
**Accedi con git** cerca un accesso già presente sulla macchina — il credential
helper di git, poi l'account attivo di **GitHub CLI**, poi la finestra di
accesso dell'helper — e collega quell'account al profilo. Nulla è condiviso
implicitamente: un nuovo profilo parte disconnesso, e un account che un altro
profilo ha già collegato viene rifiutato. Per collegare un secondo account
GitHub, aggiungilo a gh (`gh auth login`), rendilo attivo (`gh auth switch`) e
accedi dall'altro profilo — oppure incolla il token di quell'account. Git non
chiede mai nome utente e password in un terminale.

La pagina indica se la connessione è il token del profilo, il suo collegamento
all'helper di git o a GitHub CLI, e **Disconnetti** la annulla solo per questo
profilo: un token viene cancellato (resta valido sul servizio finché non lo
revochi lì), un collegamento viene rimosso (l'accesso resta in gh o nell'helper).

L'API del servizio — pull request, issue, CI — e fetch, pull e push di git via
https usano il token o l'account collegato del profilo. La credenziale arriva a
git solo per quel comando, limitata all'host del remoto, e non viene mai scritta
in `.git/config`. Un profilo senza nessuno dei due lascia git al suo credential
helper. Azure DevOps, GitLab e Bitbucket si collegano tramite il credential
helper di git — Git Credential Manager conserva più account per servizio — o
usano un token per profilo. Un collegamento indica un account per servizio,
quindi organizzazioni che richiedono account diversi vogliono un profilo
ciascuna.

**Vedi anche:** [Branch impilate](stacks.md) · [Funzioni AI](ai.md)
