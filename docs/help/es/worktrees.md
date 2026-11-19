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

### Cuidar de los worktrees

Un worktree creado el mes pasado se olvida fácilmente, y las preguntas llegan al limpiar: ¿hay trabajo en él? ¿Sigue existiendo esa carpeta? Cada fila las responde antes de que tengas que preguntar.

| En la fila | Significa |
|---|---|
| **●3** | Tres archivos con cambios sin confirmar en ese worktree |
| **↑2 ↓1** | Su rama va dos commits por delante y uno por detrás de su upstream |
| 🔒 | Bloqueado: pasa el ratón por encima para ver el motivo indicado al bloquearlo |
| **ausente**, nombre tachado | La carpeta ya no existe; git solo conserva su registro |

Los números se leen al abrir la sección, cuando cambia el commit de ese worktree y cuando la ventana recupera el foco; no en cada actualización, porque cada uno es un `git status` dentro de otra carpeta.

Clic derecho en una fila para:

| Acción | Qué hace |
|---|---|
| **Bloquear worktree** | Impide que git (y cualquier otro cliente) lo pode, mueva o elimine. Indica un motivo —*en el disco externo*— y aparece en el candado. Para worktrees en soportes que no siempre están conectados. |
| **Desbloquear worktree** | Lo contrario. Deshacer vuelve a bloquearlo con el mismo motivo. |
| **Mover worktree…** | Mueve la carpeta y actualiza los vínculos de git en ambos sentidos. No se ofrece si está bloqueado o abierto en una pestaña: las pestañas y su diseño se recuerdan por ruta, así que la pestaña quedaría apuntando a nada. Ciérrala antes. Deshacer lo devuelve a su sitio. |
| **Eliminar worktree** | Primero pregunta a git qué se perdería. Uno limpio recibe la confirmación normal, y deshacer lo recrea en la misma rama y la misma carpeta. Uno con cambios sin confirmar recibe otra confirmación, *Descartar y eliminar*, que indica cuántos archivos, y no tiene deshacer. |
| **Reconectar carpeta movida…** | Solo en una fila *ausente*: indica adónde fue la carpeta (la moviste con el explorador de archivos) y git la vuelve a vincular con `git worktree repair`. |
| **Olvidar worktrees ausentes** | También es el botón de goma en la cabecera de la sección, visible cuando alguna fila está ausente. Ejecuta `git worktree prune`. |

Lo que **no** hacen:

- **Eliminar un worktree borra también sus archivos ignorados**: `.env`, `node_modules`, resultados de compilación. Git no los cuenta como cambios, así que incluso la confirmación "limpia" lo advierte, y deshacer no los recupera.
- **Olvidar solo borra el registro de git.** No hay archivos que borrar —la carpeta ya no está— y se omiten los worktrees bloqueados, porque uno bloqueado en un disco desconectado es idéntico a uno borrado.
- Un bloqueo es un acuerdo entre clientes de git, no una protección de archivos: no impide que nada fuera de git borre la carpeta.
- El worktree principal —el propio repositorio— no se puede bloquear, mover ni eliminar.
- Eliminar un worktree nunca borra su rama. Bórrala desde la lista de ramas si ya terminaste.

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
