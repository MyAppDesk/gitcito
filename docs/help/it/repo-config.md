---
title: Regole del repository (.gitcito.json)
category: Strumenti dell'area di lavoro
order: 98
summary: Le regole della casa che viaggiano con il repository — branch protetti, scope dei commit, cosa serve a un clone e una lista prima del push.
keywords: gitcito.json configurazione del repository regole doctor requisiti branch protetti scope trailers ticket link al tracker checklist onboarding hooksPath node sottomoduli lfs env example
---

# Regole del repository (`.gitcito.json`)

Ogni progetto porta con sé regole che dal codice non si deducono. *Non fare mai
push diretto su `release/*`.* *Gli scope dei commit sono `api`, `web` e `infra`,
e nient'altro.* *Servono Node 20, i sottomoduli inizializzati e un `.env` copiato
da `.env.example` prima che qualcosa parta.* Quelle regole vivono in un README
che nessuno rilegge, in un fallimento di CI, o nella testa di chi è qui da più
tempo.

`.gitcito.json` è il posto in cui il repository le scrive, così lo strumento può
agire di conseguenza. Sta nella radice del repository, viene versionato come
qualsiasi altro file e quindi viaggia con il clone: chi apre il progetto riceve
le stesse regole, e chi arriva nuovo le ha il primo giorno invece che al primo
push rifiutato.

Il file è del tutto opzionale. Un repository che non ce l'ha si comporta
esattamente come prima.

Non serve scriverlo a mano: alla [chat del repository](repo-chat.md) viene dato
lo schema di questo file, così *aggiungi i link ai ticket per JIRA-1234* o
*proteggi i branch di release* torna come un'azione su file revisionabile.

![La scheda Config del repository, con le righe del doctor e le sezioni delle regole](../../screenshots/repo-config.webp)

## Dove si modifica

L'ingranaggio accanto agli strumenti della barra → **Config**. Quell'editor
scrive il file nel tuo albero di lavoro; non viene salvato da nessun'altra parte,
quindi **fai il commit** per condividere le regole con il team.

Se il repository non ne ha uno, **Leggi il repository** ne propone uno a partire
da ciò che c'è già: un `.nvmrc` o `engines.node`, un `.gitmodules`, `filter=lfs`
in `.gitattributes`, un `.env.example` senza `.env` accanto, i branch che già
proteggi in locale e gli scope usati dagli ultimi 500 oggetti di commit. Nulla
viene scritto finché non salvi. Da terminale, `gitcito config init` fa lo stesso
(vedi [la riga di comando](cli.md)).

## Cosa può dire il file

```json
{
  "version": 1,
  "protect": ["main", "release/*"],
  "links": {
    "tickets": [
      { "match": "\\b[A-Z][A-Z0-9]+-\\d+\\b", "url": "https://tracker.example.com/browse/$0", "label": "Jira" }
    ]
  },
  "commit": {
    "scopes": ["api", "web", "infra"],
    "ticketFromBranch": true,
    "trailers": ["Refs: {ticket}"]
  },
  "requires": {
    "node": ">=20",
    "hooksPath": ".husky",
    "submodules": true,
    "lfs": true,
    "files": [{ "path": ".env", "from": ".env.example", "why": "URL base dell'API e un token di sviluppo" }]
  },
  "checklist": {
    "push": ["Eseguire la suite di integrazione su staging"]
  }
}
```

| Campo | Cosa fa |
|---|---|
| `version` | Deve essere `1`. Un file di uno schema più recente viene ignorato per intero, invece che indovinato. |
| `protect` | Nomi di branch, con `*` che copre qualunque testo. Si **somma** ai branch che proteggi in locale — vedi [branch protetti](repo-settings.md). |
| `links.tickets` | Un'espressione regolare e un modello di URL. `$0` è l'intera corrispondenza, `$1`…`$9` i suoi gruppi. Le corrispondenze in oggetto e corpo dei commit diventano link. |
| `commit.scopes` | Gli scope che il compositore propone, al posto di un campo libero. Dichiararli trasforma anche uno scope sconosciuto da consiglio di stile a errore in `gitcito commit-check`. |
| `commit.ticketFromBranch` | Compila la chiave del ticket dal nome del branch (`feature/ABC-123-cosa` → `ABC-123`) — ma solo in un compositore vuoto, mai sopra ciò che stai scrivendo. |
| `commit.trailers` | Righe aggiunte al corpo del commit. `{ticket}` e `{branch}` vengono compilati; una riga il cui segnaposto non ha nulla da compilare viene scartata invece che scritta a metà. |
| `requires.*` | Ciò che serve a un clone funzionante. Ogni voce diventa una riga del doctor, qui sotto. |
| `checklist.push` | Testo libero mostrato una volta per sessione, prima del primo push. |

## Il doctor

`requires` è la parte che risponde a *«l'ho clonato e non parte»*. Gitcito la
controlla all'apertura del repository e mostra un chip con lo stetoscopio nella
barra di stato quando qualcosa non va. Cliccandolo si apre la scheda Config sulle
righe del doctor; **Ricontrolla** le riesegue.

| Controllo | Passa quando | Si ripara con |
|---|---|---|
| `node` | Il `node` nel tuo PATH soddisfa la specifica | — |
| `submodules` | Nessun sottomodulo è senza checkout | `git submodule update --init --recursive` |
| `lfs` | git-lfs è installato e i file tracciati sono contenuto vero, non testo di puntatore | `git lfs pull` |
| `hooksPath` | `core.hooksPath` corrisponde al percorso dichiarato | impostare `core.hooksPath` |
| `files` | Il file esiste | copiarlo da `from`, se esiste |

Due limiti voluti. Un **avviso** non significa mai «rotto»: significa che il
doctor non ha potuto stabilire qualcosa (una specifica di Node illeggibile passa
invece di inventare un fallimento su cui non puoi agire), e gli avvisi non fanno
fallire `gitcito doctor` in CI. E una riparazione non è mai qualcosa fornito dal
file: l'insieme qui sopra è tutto l'insieme, chiuso a tempo di compilazione. La
configurazione gli passa un valore — un percorso da copiare, un valore per
`core.hooksPath` — e mai un comando.

Copiare un file non sovrascrive mai: che il file manchi è esattamente il motivo
per cui quella riga esiste.

## I commit

Con `commit.scopes` dichiarati, il pulsante dello scope nel compositore propone
quella lista invece di un campo libero — la differenza tra `feat(renderer)` e
`feat(rendererr)`. `ticketFromBranch` e `trailers` compilano le parti meccaniche
di un messaggio, e `links.tickets` riporta le chiavi a link ovunque venga
mostrato un commit.

Le stesse regole valgono fuori dalla finestra: `gitcito commit-check` legge
questo file, così un hook `commit-msg` e la CI pretendono esattamente ciò che il
compositore suggerisce. Vedi [la riga di comando](cli.md) e
[fare commit](committing.md).

## La lista prima del push

`checklist.push` compare come conferma prima del primo push della sessione, una
riga per voce. È il posto per ciò che è davvero una valutazione umana — *qualcuno
ha avvisato il supporto?* — perché Gitcito **non le verifica mai per te**. Sono
promemoria, non barriere: leggi e fai push, oppure annulla. Mostrata una volta
per repository per sessione, perché una finestra a ogni push è una finestra che
nessuno legge.

## Perché non può farti male

Il file arriva con il repository, cioè da chi ha scritto il repository. Viene
trattato come contenuto non fidato, come un messaggio di commit:

- **Niente al suo interno viene eseguito.** Non esiste un campo che contenga un
  comando, e le riparazioni del doctor sono una lista fissa.
- **Può solo aggiungere restrizioni.** `protect` è unione con la tua lista locale
  — un repository può proteggere più di quanto hai scelto, mai convincerti a non
  proteggere qualcosa. Nessun campo disattiva una salvaguardia.
- **I percorsi non possono uscire dal repository.** Percorsi assoluti, `..`, `~`,
  lettere di unità e qualunque cosa tocchi `.git` vengono rifiutati, e
  ricontrollati nel punto in cui una stringa diventa un percorso vero.
- **I link devono essere `http(s)`.** Nient'altro viene passato all'apertore di
  URL del sistema.
- **Tutto ha un tetto** — lunghezza delle liste, delle stringhe, dei pattern — così
  un repository ostile non può incollare un muro di testo in una finestra né
  mille chip in un pannello.

Un campo sbagliato viene scartato, non è fatale. Il resto del file continua a
valere, e ciò che è stato scartato è elencato sotto **Ignorato da Gitcito** nella
scheda Config, con il motivo. L'unica eccezione è JSON non valido o una `version`
sconosciuta, dove non c'è nulla da salvare.

## Cosa deliberatamente non fa

- **Niente comandi, niente script, niente hook.** A questo servono gli
  [hook](hooks.md), e sono una decisione che prendi per ogni clone.
- **Nessuna regola per branch o per persona.** Un file, un insieme di regole.
- **Non sostituisce la CI.** La lista è testo; il doctor controlla l'ambiente,
  non il tuo lavoro.
- **Non può indebolire nulla.** Ogni salvaguardia di Gitcito resta tua.

**Vedi anche:** [Impostazioni per repository](repo-settings.md) ·
[La riga di comando](cli.md) · [Fare commit](committing.md) ·
[Hook e .gitignore](hooks.md)
