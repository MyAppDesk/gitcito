---
title: Worktree e sottomoduli
category: Sincronizzazione e più repo
order: 54
summary: Più checkout di uno stesso repository; e repository dentro repository.
keywords: worktree sottomodulo submodule checkout collegato init sync
---

# Worktree e sottomoduli

## Worktree

Un worktree è un secondo checkout dello stesso repository, in una cartella tutta
sua — così puoi guardare `main` mentre `feature/x` resta esattamente come
l'avevi lasciata, senza fare stash.

- Crea e rimuovi worktree dalla barra laterale. Un **doppio clic** ne apre uno
  come scheda a sé; il clic destro offre *Apri worktree*, *Mostra nella cartella*
  e la rimozione.
- Clic destro su un branch locale qualsiasi → **Apri in un worktree** per
  crearne uno al volo in una cartella affiancata e aprirlo come scheda.
- Un branch vive in un solo worktree alla volta, quindi fare checkout di un
  branch che un altro worktree già tiene non può funzionare: git rifiuta con
  *already used by worktree at …*. Gitcito ti ci porta invece: il menu del branch
  dice *Vai a `x` nel suo worktree*, e il doppio clic sulla riga apre la scheda
  di quel worktree anziché fallire.

### Prendersi cura dei worktree

Un worktree creato il mese scorso si dimentica in fretta, e le domande arrivano quando si fa pulizia: c’è lavoro dentro? La cartella esiste ancora? Ogni riga risponde prima che tu debba chiederlo.

| Sulla riga | Significa |
|---|---|
| **●3** | Tre file con modifiche non committate in quel worktree |
| **↑2 ↓1** | Il suo branch è due commit avanti e uno indietro rispetto all’upstream |
| 🔒 | Bloccato — passaci sopra per vedere il motivo indicato al blocco |
| **mancante**, nome barrato | La cartella non c’è più; git ne ha solo la registrazione |

I conteggi vengono letti all’apertura della sezione, quando il commit di quel worktree cambia e quando la finestra torna in primo piano — non a ogni aggiornamento, perché ognuno è un `git status` dentro un’altra cartella.

Clic destro su una riga per:

| Azione | Cosa fa |
|---|---|
| **Blocca worktree** | Impedisce a git (e a qualsiasi altro client) di eliminarlo, spostarlo o rimuoverlo. Indica un motivo — *sul disco esterno* — e comparirà sul lucchetto. Per i worktree su supporti non sempre collegati. |
| **Sblocca worktree** | L’opposto. Annulla lo blocca di nuovo con lo stesso motivo. |
| **Sposta worktree…** | Sposta la cartella e aggiorna i collegamenti di git in entrambe le direzioni. Non disponibile se è bloccato o aperto in una scheda: schede e layout sono ricordati per percorso, e la scheda punterebbe al nulla. Chiudila prima. Annulla lo riporta indietro. |
| **Rimuovi worktree** | Chiede prima a git cosa andrebbe perso. Un worktree pulito riceve la conferma normale, e annulla lo ricrea sullo stesso branch nella stessa cartella. Uno con modifiche non committate riceve un’altra conferma, *Scarta e rimuovi*, che indica quanti file, senza annullamento. |
| **Ricollega la cartella spostata…** | Solo su una riga *mancante*: indica dove è finita la cartella (spostata col file manager) e git la ricollega con `git worktree repair`. |
| **Dimentica i worktree mancanti** | È anche il pulsante gomma nell’intestazione della sezione, visibile quando una riga è mancante. Esegue `git worktree prune`. |

Cosa **non** fanno:

- **Rimuovere un worktree elimina anche i suoi file ignorati** — `.env`, `node_modules`, output di build. Git non li conta come modifiche, perciò anche la conferma "pulita" lo avvisa, e annullare non li riporta.
- **Dimenticare elimina solo la registrazione in git.** Non ci sono file da eliminare — la cartella non c’è più — e i worktree bloccati vengono saltati, perché uno bloccato su un disco scollegato è identico a uno eliminato.
- Un blocco è un accordo tra client git, non una protezione dei file: non impedisce a nulla fuori da git di eliminare la cartella.
- Il worktree principale — il repository stesso — non si può bloccare, spostare né rimuovere.
- Rimuovere un worktree non elimina mai il suo branch. Eliminalo dall’elenco dei branch se hai finito.

![Le sezioni worktree e sottomoduli della barra laterale, entrambe popolate](../../screenshots/worktrees.webp)

## Sottomoduli

Aggiungi, aggiorna (init e checkout), sincronizza gli URL e rimuovi i
sottomoduli, con lo stato dal vivo per ciascuno:

| Stato | Significa |
|---|---|
| **Allineato** | In checkout al commit che il genitore registra |
| **Modificato** | In checkout da qualche altra parte, oppure sporco |
| **Non inizializzato** | Registrato, ma mai messo in checkout |

![I sottomoduli con il loro stato, una riga ciascuno](../../screenshots/submodule-states.webp)

**Vedi anche:** [LFS e sparse-checkout](lfs-sparse.md) · [Fetch, pull e push](syncing.md)
