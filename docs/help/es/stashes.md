---
title: Stashes
category: Sincronizar y muchos repos
order: 52
summary: Stashes parciales, aplicar por archivo, y stash → rama.
keywords: stash stashes parcial keep-index apply pop drop aplicar descartar untracked sin seguimiento rama branch
---

# Stashes

En Gitcito hacer stash no es todo o nada.

| Acción | Qué hace |
|---|---|
| **Stash** | Todo, incluidos los archivos sin seguimiento si quieres, con un mensaje |
| **Stash parcial** | Marca solo los archivos que quieras; opcionalmente `--keep-index` |
| **Apply / Pop** | El stash entero, o **solo algunos de sus archivos** |
| **Stash → rama** | `git stash branch` — la salida de emergencia cuando un stash no aplica limpio |

Al seleccionar un stash se ven sus archivos y sus diffs, igual que en un commit.

La lista de archivos se selecciona en grupo con los mismos gestos que en
[preparación](staging.md) — clic con <kbd>⌘</kbd>/<kbd>Ctrl</kbd>, clic con
<kbd>⇧</kbd>, <kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> — y el clic derecho (o el
botón *Aplicar n archivos*) restaura solo la selección.

![Un stash parcial: marca solo los archivos que deben entrar](../../screenshots/stash-partial.webp)

## Cuando un stash no aplica

Si aplicar un stash fuese a machacar archivos sin seguimiento, git se planta.
Gitcito te ofrece sobrescribirlos y volver a intentarlo, en vez de dejarte a ti
adivinar el conjuro.

Si el árbol se ha movido demasiado, **stash → rama** recrea la rama desde la que
se tomó el stash, lo aplica allí limpiamente y descarta el stash.

## No confundir con los snapshots

Los [snapshots WIP](recovery.md) son automáticos y quedan ocultos; los stashes
son deliberados y aparecen en una lista. Los snapshots nunca tocan tu lista de
stashes.

**Ver también:** [Recuperación](recovery.md) · [Preparación](staging.md)
