---
title: La riga di comando
category: Strumenti dello spazio di lavoro
order: 93
summary: `gitcito .` apre un repository — e `gitcito doctor` risponde senza aprire nulla.
keywords: cli riga di comando terminale shim path installare aprire cartella istanza singola doctor status repos commit-check config editor completions wait core.editor blame show search verbi codice di uscita ci hook
---

# La riga di comando

Da un terminale si fanno due tipi di domanda, e `gitcito` risponde a entrambe.

La prima è *«fammi vedere questo»* — sei in un clone, qualcosa va guardato e
l’app è il posto giusto per guardarlo. Queste invocazioni aprono una finestra, il
più vicino possibile a ciò che hai chiesto.

La seconda è *«dimmelo adesso»* — un hook, un job di CI, o tu, in mezzo a una
pipe, che vuoi una risposta e un codice di uscita invece di una finestra. Queste
non avviano mai l’app: scrivono su stdout e si tolgono di mezzo.

```sh
gitcito .                        # apre questa cartella
gitcito blame src/api.ts -l 84   # …sul blame di quella riga
gitcito doctor                   # nessuna finestra: controlla il repo, esce con 1 se fallisce
```

## Installarla

Palette dei comandi (<kbd>⌘K</kbd>) → **Installa il comando 'gitcito' nel PATH**.
Su macOS crea un collegamento simbolico a un piccolo shim in `/usr/local/bin` o
`/opt/homebrew/bin`, e chiede i privilegi di amministratore solo se nessuna delle
due è scrivibile da te. Su Linux va in `~/.local/bin`, che non richiede alcun
privilegio. Lo stesso comando lo disinstalla. Windows non è ancora supportato.

Poi, se vuoi:

```sh
gitcito completions zsh >> ~/.zshrc     # oppure bash, oppure fish
```

## Aprire le cose

| Comando | Apre |
|---------|------|
| `gitcito [percorso]` | Il repository (predefinito: la cartella corrente) |
| `gitcito open <nome>` | Un repository dal **nome della sua scheda** — `gitcito open api` |
| `gitcito diff` | Le modifiche di lavoro |
| `gitcito graph` | Il grafo dei commit |
| `gitcito show <ref>` | Un commit — `HEAD~2`, un tag, un hash breve |
| `gitcito blame <file>` | Il blame di un file; con `-l 84` atterri su una riga |
| `gitcito search <query>` | La ricerca nel codice, con la query già scritta |
| `gitcito stack`, `stash`, `reflog`, `conflicts`, `todos`, `chat`, `settings` | Quel pannello |
| `gitcito ci`, `clean`, `bisect`, `absorb`, `snapshots`, `insights`, `terminal` | …e così via |

`gitcito help verbs` stampa l’elenco completo. Tre opzioni valgono per tutti:
`-n <nome>` imposta il nome visualizzato della scheda, `-g <gruppo>` la mette in
una scheda di gruppo (creandola se serve), e `-l <n>` sceglie una riga.

Gitcito è a **istanza singola**: lanciare `gitcito` con l’app aperta consegna la
richiesta a quella finestra invece di avviare una seconda copia. Un percorso già
aperto — come scheda o dentro un gruppo — viene **messo a fuoco**, non
duplicato. Una cartella che non è ancora un repository si apre lo stesso,
offrendo il flusso «inizializza qui un repository».

## Rispondere nel terminale

Questi stampano ed escono. Non si apre alcuna finestra, e l’app non deve nemmeno
essere in esecuzione.

### `gitcito status`

Ramo, tracciamento, avanti/indietro, albero di lavoro, stash e — se il repository
la porta con sé — la [checklist di push da `.gitcito.json`](repo-config.md).
Esce con 1 quando l’albero di lavoro ha conflitti, quindi
`gitcito status || echo bloccato` funziona.

### `gitcito doctor [--fix]`

Esegue gli stessi controlli del pannello di [configurazione del
repository](repo-config.md): versione di Node, sottomoduli, LFS,
`core.hooksPath`, file richiesti. **Esce con 1 se un controllo fallisce**, ed è
questo il punto: le regole che un repository dichiara valgono poco se le vede
solo chi ha l’interfaccia aperta:

```yaml
- run: gitcito doctor          # in CI, prima di qualsiasi cosa costosa
```

`--fix` applica le riparazioni che il dottore sa fare (inizializzare i
sottomoduli, `lfs pull`, impostare `core.hooksPath`, copiare un file dal suo
esempio) e ricontrolla. Non esegue mai un comando fornito dalla configurazione:
l’insieme delle riparazioni è chiuso.

Gli avvisi non fanno fallire l’esecuzione. Un avviso significa che il dottore non
è riuscito a determinare qualcosa, non che qualcosa sia sbagliato, e far fallire
le build su questo renderebbe il file troppo costoso da adottare.

### `gitcito commit-check [file]`

Controlla un messaggio di commit. Senza argomenti legge `.git/COMMIT_EDITMSG`;
`-m "…"` controlla una stringa. Sa cosa ha dichiarato il repository: uno scope
sconosciuto è un **errore** quando `.gitcito.json` elenca gli scope, e solo un
consiglio di stile quando non lo fa. Collegalo a un hook:

```sh
# .husky/commit-msg
gitcito commit-check "$1"
```

### `gitcito config init | show | check`

`init` legge il repository e propone un `.gitcito.json` a partire da ciò che c’è
già — `.nvmrc`, `.gitmodules`, un `.env.example` senza `.env`, gli scope di
commit che la storia sta usando. `--dry-run` stampa invece di scrivere. `show`
stampa il file attuale; `check` lo valida ed elenca ogni campo che verrebbe
scartato.

### `gitcito repos [filtro]`

Ogni repository che Gitcito conosce — prima le schede aperte, poi i recenti — con
il suo gruppo. `--paths` stampa percorsi nudi, uno per riga, per gli script:

```sh
cd "$(gitcito repos --paths api | head -1)"
```

## Gitcito come editor di git

```sh
gitcito editor install
```

imposta `core.editor` e `sequence.editor` su `gitcito --wait`. Da lì in avanti
`git commit` (senza `-m`), `git commit --amend`, `git tag -a` e `git rebase -i`
aprono il loro file in Gitcito invece che in vim, con un contatore di caratteri e
gli stessi suggerimenti sul messaggio che mostra il compositore.

![L’editor che Gitcito apre quando git ne chiede uno](../../screenshots/cli-edit.webp)

La parola che conta è **attende**: git è bloccato su quella finestra. Quindi

- **Salva e continua** riscrive il file e git prosegue.
- **Annulla** scrive un file vuoto, che git legge come *interrompi*.
- Chiudere la finestra in qualsiasi altro modo — Esc, lo sfondo, uscire da
  Gitcito — vale come Annulla. Un terminale in attesa per sempre sarebbe molto
  peggio di un messaggio da riscrivere.

Aggiungi `--local` per limitarlo a un repository, e annullalo con
`gitcito editor uninstall`.

## Cosa non farà

- **Nessun verbo da terminale modifica il repository.** `doctor --fix` è l’unica
  eccezione, e le sue riparazioni sono un elenco fisso, non qualcosa che un file
  di configurazione possa estendere.
- **`repos` è in sola lettura.** L’app in esecuzione possiede il suo file di
  impostazioni; la CLI lo legge e non lo scrive mai.
- **Un verbo che l’app installata non conosce viene ignorato**, non rifiutato:
  uno shim più recente su un’app più vecchia apre comunque il repository.
- **Windows non ha ancora uno shim.** I verbi sono tutti implementati; manca solo
  il percorso di installazione.

**Vedi anche:** [Spazi di lavoro, schede e gruppi](workspaces.md) ·
[Configurazione del repository](repo-config.md) · [Fare commit](committing.md)
