---
title: Worktrees & submodules
category: Synchroniseren & meerdere repo's
order: 54
summary: Meerdere checkouts van één repository; en repository's binnen repository's.
keywords: worktree worktrees submodule submodules gekoppelde checkout init sync
---

# Worktrees & submodules

## Worktrees

Een worktree is een tweede checkout van dezelfde repository, in een eigen map —
zodat je naar `main` kunt kijken terwijl `feature/x` precies blijft zoals je hem
achterliet, zonder te stashen.

- Maak en verwijder worktrees vanuit de zijbalk, en open er een **in een eigen
  venster**.
- Rechtsklik een willekeurige lokale branch → **Openen in een worktree** om er
  een op te tuigen in een naburige map en hem als tabblad te openen.

![De worktree- en submodulesecties van de zijbalk, beide gevuld](../../screenshots/worktrees.webp)

## Submodules

Voeg submodules toe, werk ze bij (init & checkout), synchroniseer URL's en
verwijder ze, met live status voor elk:

| Status | Betekent |
|---|---|
| **In sync** | Uitgecheckt op de commit die de ouder vastlegt |
| **Gewijzigd** | Ergens anders uitgecheckt, of vuil |
| **Niet geïnitialiseerd** | Vastgelegd, maar nooit uitgecheckt |

![Submodules met hun status, elk op een eigen rij](../../screenshots/submodule-states.webp)

**Zie ook:** [LFS & sparse-checkout](lfs-sparse.md) · [Fetchen, pullen & pushen](syncing.md)
