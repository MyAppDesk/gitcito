---
title: Bundle e archivi
category: Sincronizzazione e più repo
order: 58
summary: Un repository come file unico da cui git può clonare, o un albero come zip che nessuno ha bisogno di git per aprire.
keywords: bundle git bundle archivio archive zip tarball tar gz export air gap offline usb email trasferimento export-ignore gitattributes clone da file range
---

# Bundle e archivi

Due modi per mettere un repository in un unico file. Sembrano intercambiabili e
non lo sono, e sbagliare la scelta è tutto il motivo per cui esiste questa
pagina.

| | Un **bundle** | Un **archivio** |
|---|---|---|
| Contiene | La storia: commit, branch, tag | I file a un singolo commit |
| Si apre con | `git clone` / `git fetch` — *è* un remote | Qualsiasi programma di decompressione |
| Dopo | Puoi recuperare ancora, fondere, continuare a lavorare | Niente. È un'istantanea |
| Serve per | Portare il lavoro su una macchina senza rete | "Mandami il sorgente alla v2.1" |

`⌘K` → **Crea un bundle del repository** oppure **Esporta un archivio**.

![Il bundle di un repository in un file unico, con l'opzione intervallo pronta](../../screenshots/export.webp)

## Bundle

Un bundle è la risposta di git a un vuoto che nessuna rete attraversa: una
macchina isolata, una chiavetta USB, un allegato di posta, un portatile su un
aereo. Chi lo riceve esegue `git clone work.bundle myrepo` e ottiene un
repository vero, con la tua storia e i tuoi branch, che recupera da quel file
come se fosse un server.

Tre ambiti:

| Ambito | Cosa viaggia | Dimensione |
|-------|--------------|------|
| **Tutto** | Ogni branch e tag, storia completa | L'intero repository |
| **Un branch o un tag** | Quel ref e tutto ciò che raggiunge | Di solito quasi tutto |
| **Un intervallo di commit** | Solo ciò che sta fra i due estremi | Piccola |

**Un bundle di intervallo è una patch di storia, non un repository.** Registra
l'estremo lontano come *prerequisito*: git si rifiuta di aprirlo in un repository
che non ha già quel commit, perché non ci sarebbe niente a cui attaccare i nuovi
commit. È il comportamento giusto, e la prima volta è una sorpresa. Usa un
intervallo quando l'altra parte ha già il tuo lavoro fino a un certo punto — il
tag che ha ricevuto per ultimo, il commit da cui siete partiti entrambi.

### Riceverne uno

**Importa un bundle…** legge il file, elenca cosa contiene e dice subito se
questo repository può usarlo: se mancano dei prerequisiti, ti dice quanti sono
invece di fallire più avanti con le parole di git.

I ref importati finiscono sotto **`bundle/…`**, nello spazio dei nomi di
tracciamento remoto. Nulla di locale si muove: nessun branch viene mandato avanti
in fast-forward, nessun lavoro viene sovrascritto. Poi fai merge, rebase o
checkout di `bundle/main` alle tue condizioni, esattamente come faresti con un
branch di qualunque altro remote.

Per far nascere invece un *nuovo* repository da un bundle, clona dal file in un
terminale: `git clone work.bundle myrepo`. Gitcito importa dentro un repository
già aperto; non clona da un file.

## Archivi

`git archive` scrive l'albero a un singolo commit come zip o tarball. Niente
`.git`, niente storia, nessun modo di recuperare da lì — che è esattamente il
punto quando il destinatario deve ricevere del codice sorgente, non un
repository.

| Opzione | Cosa fa |
|--------|-------------|
| Riferimento | Branch, tag o commit da esportare. Un tag è la risposta abituale |
| Formato | `zip`, `tar.gz` o `tar` |
| Racchiudi in una directory | Aggiunge una cartella di primo livello, così scompattare non sparpaglia file ovunque |
| Solo questo percorso | Esporta una sottodirectory invece dell'intero albero |

### export-ignore è il motivo per usarlo

Un repository può marcare dei percorsi in `.gitattributes`:

```
.github/     export-ignore
test/        export-ignore
*.psd        export-ignore
```

Quei percorsi vengono **lasciati fuori da ogni archivio** pur restando nel
repository. È così che un progetto spedisce un tarball di release senza la sua
configurazione CI, le sue fixture e i suoi 200 MB di file di design, con la
regola che vive nel repository invece che nello script di rilascio di qualcuno.

## Limiti da conoscere

- **Un bundle è una copia completa** a meno che tu non usi un intervallo. Fare il
  bundle di un repository da 2 GB scrive un file da 2 GB, e ci mette quanto un
  clone.
- **I bundle vuoti sono rifiutati** da git, non da Gitcito: un intervallo senza
  nulla fra i suoi estremi produce un errore invece che un file inutile.
- **L'importazione non fa merge.** I ref arrivano sotto `bundle/…` e restano lì
  finché non ci fai qualcosa.
- **Un archivio non ha storia**, quindi non può essere ritrasformato in un
  repository. Se il destinatario dovrà fare commit, mandagli un bundle.
- **`export-ignore` riguarda solo gli archivi.** Non nasconde nulla a un clone, a
  un bundle o alla storia — per quello vedi
  [rimuovere un file dalla storia](history-purge.md).

Vedi anche: [Sincronizzare](syncing.md) · [Condivisione sicura](secure-share.md) ·
[Rimuovere un file dalla storia](history-purge.md)
