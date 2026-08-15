---
title: Worktrees & Submodule
category: Sync & viele Repos
order: 54
summary: Mehrere Checkouts eines Repositorys; und Repositorys in Repositorys.
keywords: worktree worktrees submodul submodule submodules verknüpfter checkout init sync
---

# Worktrees & Submodule

## Worktrees

Ein Worktree ist ein zweiter Checkout desselben Repositorys, in seinem eigenen
Ordner — du kannst dir also `main` ansehen, während `feature/x` genau so bleibt,
wie du es verlassen hast, ganz ohne Stashen.

- Worktrees aus der Seitenleiste anlegen und entfernen, und einen **in seinem
  eigenen Fenster** öffnen.
- Rechtsklick auf einen lokalen Branch → **In einem Worktree öffnen**, um einen im
  Nachbarordner hochzuziehen und ihn als Tab zu öffnen.

![Die Worktree- und Submodul-Abschnitte der Seitenleiste, beide gefüllt](../../screenshots/worktrees.webp)

## Submodule

Submodule hinzufügen, aktualisieren (init & checkout), URLs synchronisieren und
entfernen — mit Live-Status für jedes einzelne:

| Status | Bedeutet |
|---|---|
| **Synchron** | Ausgecheckt auf dem Commit, den das übergeordnete Repository festhält |
| **Verändert** | Woanders ausgecheckt, oder schmutzig |
| **Nicht initialisiert** | Eingetragen, aber nie ausgecheckt |

![Submodule mit ihrem jeweiligen Status, eine Zeile pro Stück](../../screenshots/submodule-states.webp)

**Siehe auch:** [LFS & Sparse-Checkout](lfs-sparse.md) · [Fetchen, Pullen & Pushen](syncing.md)
