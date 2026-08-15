---
title: LFS, Sparse-Checkout & Patches
category: Sync & viele Repos
order: 55
summary: Große Dateien, Teil-Checkouts und Änderungen als Dateien verschieben.
keywords: lfs large file storage große dateien sparse checkout cone teilweise partial clone patch am apply anwenden
---

# LFS, Sparse-Checkout & Patches

## Git LFS

![Die LFS-Verwaltung](../../screenshots/lfs.webp)

Erkennt, ob `git-lfs` installiert ist, ob dieses Repository es benutzt und
welche Muster getrackt werden. Die Dateiliste zeigt, was **heruntergeladen**
ist und was noch ein **Pointer** ist — und von dort aus kannst du ziehen oder
aufräumen.

## Sparse-Checkout

![Sparse-Checkout im Cone-Modus](../../screenshots/sparse-checkout.webp)

Cone-Modus: Hake die obersten Ordner an, in denen du tatsächlich arbeitest —
der Rest verlässt dein Arbeitsverzeichnis und bleibt trotzdem in der Historie.
Nützlich in einem Monorepo, in dem dir nur zwei Pakete gehören.

Ein **Partial Clone** (`--filter=blob:none`) wird beim Klonen angeboten, damit
du keine Blobs herunterlädst, die du nie öffnen wirst.

## Patches

- Einen Commit (oder eine Mehrfachauswahl) als `.patch` **exportieren**.
- Einen Patch auf das Arbeitsverzeichnis **anwenden** (`git apply`) oder als
  Commit (`git am`).

Beides im Menü Werkzeuge.

**Siehe auch:** [Worktrees & Submodule](worktrees.md)
