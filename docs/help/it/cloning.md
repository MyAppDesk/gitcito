---
title: Clonare
category: Per iniziare
order: 2
summary: Clona da un URL o direttamente dal tuo host — e restringi ciò che scarichi quando il repository è enorme.
keywords: clone clona shallow depth profondità partial filter blob none single branch sottomoduli submodules recursive ls-remote unshallow monorepo
---

# Clonare

**Nuovo repository → Clona**, oppure `⌘K` → *Clona*. Incolla un URL, o accedi a
GitHub, GitLab, Bitbucket o Azure DevOps e scegli fra i tuoi repository — il
token del [profilo](profiles.md) selezionato viene usato per il clone e poi
scartato, mai scritto dentro `.git/config`.

Scegli una cartella genitore e un nome; la riga sotto i campi mostra esattamente
dove finirà il repository. Una cartella già esistente viene rifiutata, non
fusa con il clone.

## Avanzate — restringere il clone

Tutto ciò che sta sotto **Avanzate** è disattivo di default: lascialo stare e
ottieni un clone normale e completo. Si guadagna il suo posto sui repository dove
"completo" significa venti minuti e parecchi gigabyte.

![La finestra di clone con le opzioni avanzate aperte: partial, shallow, single-branch, sottomoduli e il selettore di branch](../../screenshots/clone-advanced.webp)

| Opzione | Cosa fa git | Cosa costa |
|--------|---------------|---------------|
| **Clone parziale** | `--filter=blob:none` | Storia completa, senza contenuti dei file. I blob arrivano su richiesta, quindi aprire un file vecchio richiede la rete. |
| **Clone shallow** | `--depth=N` | Esistono solo gli N commit più recenti. Blame, log, bisect e range-diff si fermano al taglio. |
| **Un solo branch** | `--single-branch` | Gli altri branch restano sul remote finché non li recuperi. |
| **Clona i sottomoduli** | `--recurse-submodules` | Anche ogni sottomodulo viene fatto uscire — più tempo adesso, nessuna directory mancante dopo. |
| **Branch da cui partire** | `--branch <name>` | Parte da quel branch invece che da quello predefinito del remote. |

**Partial prima di shallow.** Un clone parziale conserva ogni commit — la storia
resta ricercabile e vengono recuperati pigramente solo i contenuti dei file. Un
clone shallow invece la storia la butta via davvero: `git log` finisce al taglio
e il blame non riesce a guardare oltre. Se stai clonando un monorepo per
lavorarci, di solito quello che vuoi è il parziale.

Lo shallow è reversibile: `git fetch --unshallow` nel [terminale](terminal.md)
riempie di nuovo la storia.

### Scegliere il branch

Scrivi il nome di un branch, oppure premi **Elenca i branch** per chiedere al
remote cos'ha (`git ls-remote --heads`) e sceglierlo da un menu a tendina. È un
solo giro di rete, fatto solo quando premi il pulsante: mentre digiti non viene
interrogato nulla.

Se l'elenco fallisce — un URL privato senza token, un refuso, niente rete — il
campo resta una normale casella di testo e sarà il clone stesso a riportare
l'errore vero.

### Due note sui flag

- **`--depth` implica `--single-branch`.** Con un clone shallow, lasciare *Un
  solo branch* non spuntato è ciò che richiede indietro gli altri branch
  (`--no-single-branch`), ed è per questo che il suggerimento sotto cambia.
- **Clonare una cartella locale** normalmente ignora del tutto `--depth`, perché
  git crea hardlink allo store degli oggetti invece di scaricare. Gitcito clona
  attraverso un URL `file://` quando chiedi una copia shallow di un repository
  locale, così la profondità che hai chiesto è la profondità che ottieni.

## Avanzamento

La barra riporta ciò che riporta git: conteggio, compressione, ricezione,
risoluzione, checkout. Una fase che non è in grado di dichiarare un totale mostra
una barra indeterminata invece di una percentuale finta.

Il nuovo repository si apre in una scheda, ancorato al profilo con cui hai
clonato.
