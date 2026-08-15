---
title: LFS, sparse-checkout e patch
category: Sincronizzazione e più repo
order: 55
summary: File grandi, checkout parziali e modifiche spostate sotto forma di file.
keywords: lfs large file storage sparse checkout cone clone parziale partial patch am apply
---

# LFS, sparse-checkout e patch

## Git LFS

![Il gestore LFS](../../screenshots/lfs.webp)

Rileva se `git-lfs` è installato, se questo repository lo usa e quali pattern
sono tracciati. L'elenco dei file mostra cosa è **scaricato** e cosa è ancora un
**puntatore**, e da lì puoi scaricare o fare pulizia.

## Sparse-checkout

![Sparse-checkout in modalità cone](../../screenshots/sparse-checkout.webp)

Modalità cone: spunta le cartelle di primo livello in cui lavori davvero, e il
resto lascia il tuo albero di lavoro pur restando nella storia. Utile su un
monorepo di cui possiedi solo due pacchetti.

Un **clone parziale** (`--filter=blob:none`) viene proposto in fase di clone,
così non scarichi blob che non aprirai mai.

## Patch

- **Esporta** un commit (o una selezione multipla) come `.patch`.
- **Applica** una patch all'albero di lavoro (`git apply`) o come commit
  (`git am`).

Entrambe le cose dal menu Strumenti.

**Vedi anche:** [Worktree e sottomoduli](worktrees.md)
