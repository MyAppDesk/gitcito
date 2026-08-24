---
title: Worktrees y submódulos
category: Sincronizar y muchos repos
order: 54
summary: Varias copias de trabajo de un mismo repositorio; y repositorios dentro de repositorios.
keywords: worktree worktrees arbol de trabajo submodulo submodulos submodule submodules enlazado checkout init sync sincronizar
---

# Worktrees y submódulos

## Worktrees

Un worktree es una segunda copia de trabajo del mismo repositorio, en su propia
carpeta — así puedes mirar `main` mientras `feature/x` se queda exactamente como
la dejaste, sin hacer stash.

- Crea y elimina worktrees desde la barra lateral. **Doble clic** en uno lo abre
  como pestaña propia; el clic derecho ofrece *Abrir worktree*, *Mostrar en
  carpeta* y la eliminación.
- Clic derecho en cualquier rama local → **Abrir en un worktree** para levantar
  uno en una carpeta hermana y abrirlo como pestaña.
- Una rama solo puede vivir en un worktree a la vez, así que hacer checkout de
  una rama que ya tiene otro worktree no puede funcionar: git se niega con
  *already used by worktree at …*. Gitcito te lleva allí en su lugar: el menú de
  la rama dice *Ir a `x` en su worktree*, y el doble clic en la fila abre la
  pestaña de ese worktree en vez de fallar.

![Las secciones de worktrees y submódulos de la barra lateral, ambas con contenido](../../screenshots/worktrees.webp)

## Submódulos

Añade, actualiza (init y checkout), sincroniza URLs y elimina submódulos, con el
estado en vivo de cada uno:

| Estado | Significa |
|---|---|
| **Sincronizado** | Está en el commit que registra el repositorio padre |
| **Modificado** | Está en otro sitio, o tiene cambios sin guardar |
| **Sin inicializar** | Está registrado, pero nunca se ha hecho checkout |

![Submódulos con su estado, uno por fila](../../screenshots/submodule-states.webp)

**Ver también:** [LFS y sparse-checkout](lfs-sparse.md) · [Fetch, pull y push](syncing.md)
