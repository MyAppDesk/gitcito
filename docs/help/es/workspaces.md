---
title: Espacios de trabajo, pestañas y grupos
category: Empieza aquí
order: 3
summary: Muchos repositorios sin ahogarte: pestañas, grupos, carpetas y espacios de trabajo.
keywords: espacio de trabajo workspace pestañas tabs grupos groups carpetas folders varios repositorios organizar cambiar layout
---

# Espacios de trabajo, pestañas y grupos

Tres niveles, del más suelto al más apretado.

## Pestañas

Un repositorio, una pestaña. Usa <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> para abrir
el selector de pestaña nueva y <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> para cerrar la
activa. También puedes arrastrar para reordenar, cerrar con el botón central, o
pulsar <kbd>⌘⇧T</kbd> para reabrir la última que cerraste. Haz clic derecho en
una pestaña de repositorio (o en una ficha dentro de un [grupo](#grupos)) para
el [menú contextual del repositorio](repo-menu.md) — alias, worktrees, GitHub,
terminal, mostrar, editor y quitar. Cierra la última
pestaña y <kbd>⌘W</kbd> cierra la ventana. Un punto en la pestaña significa
trabajo sin commitear; otro distinto significa conflictos.

Si aparece un aviso al cerrar, <kbd>Escape</kbd> siempre cancela.
<kbd>Enter</kbd> confirma solo cuando la pestaña está limpia — cuando hay
cambios sin commitear o conflictos, el aviso te obliga deliberadamente a ir al
botón, para que una tecla suelta después de <kbd>⌘W</kbd> no cierre trabajo que
todavía tenías en la mano.

## Grupos

Agrupa repositorios relacionados en una **pestaña de grupo** con nombre y
color. Dentro de un grupo tienes una segunda fila con una ficha por
repositorio, y el grupo entero puede hacer **Fetch de todos** o **Pull de
todos** de una vez.

![Una pestaña de grupo con varios repositorios](../../screenshots/repo-groups.webp)

Los grupos admiten **carpetas, anidadas hasta donde quieras**: clic derecho en
el grupo → *Nueva carpeta…*, y luego arrastra repositorios sobre la ficha de la
carpeta. Cada carpeta coge un color, se pliega en una ficha con su cuenta,
agrega los puntos de estado de todo lo que contiene, y puede hacer fetch o pull
de todo su subárbol.

![Carpetas en la tira de pestañas del grupo, cada una una ficha con su cuenta — Internal anidada dentro de Services](../../screenshots/nested-folders.webp)

> Las carpetas solo organizan. Borrar una sube sus repositorios al nivel
> superior — nunca cierra un repositorio.

## Páginas que pertenecen a un repositorio

Algunas páginas no son algo aparte: la [wiki](repo-wiki.md) de un repositorio,
sus [métricas](insights.md), las [dev tools](devtools.md) que anunció una
sesión de lanzamiento. No ocupan una pestaña — aparecen como iconitos en el
propio repositorio.

- **Clic en un icono** para ver esa página. **Clic otra vez — o clic en el
  nombre del repositorio** — para volver al repositorio. Mientras hay una
  página abierta, el nombre coge cursor de mano y una pastilla al pasar por
  encima: es el camino de vuelta.
- **Hover sobre un icono** para la ✕ que cierra solo esa página.
- Dentro de un **grupo**, los iconos van en el chip del repositorio al que
  pertenecen, y solo mientras ese repositorio es el seleccionado. Elegir otro
  repo del grupo muestra *ese* repositorio, no la herramienta del vecino.
- Reabrir la misma página enciende el icono que ya tiene, en vez de añadir otro.

Un repositorio que no está abierto en ningún sitio no tiene icono que llevar,
así que una página suya se abre en pestaña propia — abrir algo siempre abre algo.

## Espacios de trabajo

Un espacio de trabajo es **una tira de pestañas entera, guardada**. Cambiar de
espacio intercambia todas las pestañas a la vez: `Trabajo` y `Personal` dejan de
pisarse.

El nombre del espacio está arriba a la izquierda, junto a la marca de Gitcito.
Haz clic para cambiar, crear, renombrar, reordenar o borrar. Al lado está el
indicador que abre el [Centro de control](mission-control.md) del espacio en el
que estás.

**Ver también:** [Centro de control](mission-control.md) · [La línea de comandos](cli.md)
