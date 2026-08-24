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
