---
title: Ramas, remotos y la barra lateral
category: Ramas y cirugía
order: 40
summary: Todo lo que hace la barra lateral izquierda, y las ramas fijadas.
keywords: rama ramas branch branches crear checkout renombrar borrar remoto fijada pinned barra lateral sidebar presencia
---

# Ramas, remotos y la barra lateral

Una única barra lateral, reordenable y con búsqueda, contiene **ramas, remotos,
etiquetas, stashes, worktrees y submódulos**. Cada sección se puede esconder o
reordenar (Ajustes → Disposición), y la caja de filtro se aplica a todas.

![La barra lateral, con las ramas fijadas arriba del todo](../../screenshots/pinned-branches.webp)

## Ramas

Crea, haz checkout, renombra y borra — en local y en el remoto. Las filas de
rama muestran:

- **↑por delante / ↓por detrás** respecto a su upstream,
- **insignias de presencia por remoto** (qué remotos tienen esta rama),
- un **punto de riesgo** tras un escaneo del [radar de conflictos](conflict-radar.md),
- un **marcador ⟳** cuando el remoto [reescribió el historial](range-diff.md).

Las ramas con `/` en el nombre se pliegan en carpetas plegables automáticamente.

![Nombres de rama separados por barras plegados en un árbol](../../screenshots/branch-grouping.webp)

## Ramas fijadas

Marca con una estrella las ramas a las que vuelves una y otra vez — pasa el
ratón por la fila y pulsa ★, o clic derecho → *Fijar rama*. Aparecen en un grupo
**Fijadas** arriba de la sección Local, recordado por repositorio, sin dejar de
estar en su sitio habitual más abajo.

## Hacer checkout de una rama remota

Haz doble clic en una rama remota para crear la local que la sigue. Si ya existe
una rama local con ese nombre y ha **divergido**, Gitcito pregunta cómo
reconciliarla — rebase, merge o reset — y ofrece hacer antes una copia de
seguridad de la rama.

![El diálogo de rama divergida: rebase, merge o reset, con opción de copia de seguridad](../../screenshots/diverged-checkout.webp)

**Ver también:** [Fusionar y rebasar](merging.md) · [Worktrees](worktrees.md)
