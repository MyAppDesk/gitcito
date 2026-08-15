---
title: LFS, sparse-checkout & patches
category: Synchroniseren & meerdere repo's
order: 55
summary: Grote bestanden, gedeeltelijke checkouts, en wijzigingen verplaatsen als bestanden.
keywords: lfs large file storage sparse checkout cone partial clone patch am apply patches
---

# LFS, sparse-checkout & patches

## Git LFS

![De LFS-beheerder](../../screenshots/lfs.webp)

Detecteert of `git-lfs` geïnstalleerd is, of deze repository het gebruikt, en
welke patronen getrackt worden. De bestandslijst laat zien wat er **gedownload**
is en wat nog een **pointer** is, en van daaruit kun je pullen of prunen.

## Sparse-checkout

![Sparse-checkout in cone-modus](../../screenshots/sparse-checkout.webp)

Cone-modus: vink de mappen op het hoogste niveau aan waar je echt in werkt, en de
rest verlaat je werkboom terwijl hij in de geschiedenis blijft. Handig in een
monorepo waar je maar twee packages beheert.

Een **partial clone** (`--filter=blob:none`) wordt bij het klonen aangeboden,
zodat je geen blobs downloadt die je nooit zult openen.

## Patches

- **Exporteer** een commit (of een meervoudige selectie) als een `.patch`.
- **Pas er een toe** op de werkboom (`git apply`) of als een commit (`git am`).

Beide via het Tools-menu.

**Zie ook:** [Worktrees & submodules](worktrees.md)
