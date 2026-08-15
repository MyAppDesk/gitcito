---
title: LFS, sparse-checkout y parches
category: Sincronizar y muchos repos
order: 55
summary: Archivos grandes, checkouts parciales y mover cambios como archivos.
keywords: lfs large file storage archivos grandes sparse checkout parcial cone partial clone parche patch am apply
---

# LFS, sparse-checkout y parches

## Git LFS

![El gestor de LFS](../../screenshots/lfs.webp)

Detecta si `git-lfs` está instalado, si este repositorio lo usa y qué patrones
tiene bajo seguimiento. La lista de archivos muestra qué está **descargado**
frente a lo que sigue siendo un **puntero**, y desde ahí puedes hacer pull o
purgar.

## Sparse-checkout

![Sparse-checkout en modo cone](../../screenshots/sparse-checkout.webp)

Modo cone: marca las carpetas de primer nivel en las que trabajas de verdad, y el
resto sale de tu árbol de trabajo sin salir del historial. Útil en un monorepo
donde solo eres dueño de dos paquetes.

Al clonar se ofrece un **clon parcial** (`--filter=blob:none`), para que no
descargues blobs que nunca vas a abrir.

## Parches

- **Exporta** un commit (o una selección múltiple) como un `.patch`.
- **Aplica** uno al árbol de trabajo (`git apply`) o como commit (`git am`).

Ambas cosas desde el menú Herramientas.

**Ver también:** [Worktrees y submódulos](worktrees.md)
