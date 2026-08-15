---
title: Teclado y atajos
category: Empieza aquí
order: 2
summary: Las teclas que vale la pena aprender, y cómo reasignarlas.
keywords: atajos teclado teclas shortcuts keyboard chuleta cheatsheet reasignar rebind hotkeys paleta palette
---

# Teclado y atajos

Pulsa <kbd>?</kbd> en cualquier sitio para ver la chuleta.

![La chuleta de atajos](../../screenshots/cheatsheet.webp)

## Los que vale la pena aprender

| Teclas | Qué hace |
|---|---|
| <kbd>⌘K</kbd> | [Paleta de comandos](search.md) — ramas, commits, archivos, acciones |
| <kbd>⌘⇧F</kbd> | [Búsqueda en el código](search.md) por todo el árbol de trabajo |
| <kbd>⌘⇧V</kbd> | [Caja fuerte](vault.md) |
| <kbd>⌘O</kbd> / <kbd>Ctrl+O</kbd> | Abrir un repositorio |
| <kbd>⌘,</kbd> / <kbd>Ctrl+,</kbd> | Abrir los ajustes |
| <kbd>⌘F</kbd> | Buscar dentro del archivo o el diff que estás leyendo |
| <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> | Abrir el selector de repositorio o grupo para una pestaña nueva |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | Cerrar la pestaña activa — o la ventana, cuando ya no queda ninguna |
| <kbd>⌘1</kbd>–<kbd>⌘9</kbd> / <kbd>Ctrl+1</kbd>–<kbd>Ctrl+9</kbd> | Ir a una pestaña por su posición |
| <kbd>⌘⇧T</kbd> | Reabrir la última pestaña cerrada |
| <kbd>?</kbd> | Esta chuleta |

## Moverte sin el ratón

| Dónde | Teclas |
|---|---|
| Grafo de commits | <kbd>↑</kbd> <kbd>↓</kbd> o <kbd>j</kbd> <kbd>k</kbd> |
| Listas de archivos (commit, WIP, stash) | las mismas |
| [Máquina del tiempo](time-machine.md) | <kbd>←</kbd> <kbd>→</kbd>, <kbd>⇧</kbd> para saltar de diez en diez, <kbd>Home</kbd>/<kbd>End</kbd> |
| [Centro de control](mission-control.md) | <kbd>↑</kbd><kbd>↓</kbd>, <kbd>Enter</kbd> para abrir, <kbd>f</kbd>/<kbd>p</kbd> para fetch/pull, <kbd>/</kbd> para filtrar |
| Caja del mensaje de commit | <kbd>↑</kbd> <kbd>↓</kbd> recupera tus mensajes recientes |

## Reasignar

**Ajustes → Atajos**. Los atajos de navegación principales (paleta, búsqueda en
el código, caja fuerte, abrir repositorio, ajustes) se pueden reasignar, con
detección de conflictos y un botón de reinicio por atajo.

Los atajos fijos de arriba no se pueden reasignar, y además se rechazan como
_destino_: la app responde a <kbd>⌘T</kbd>, <kbd>⌘W</kbd>,
<kbd>⌘1</kbd>–<kbd>⌘9</kbd>, <kbd>⌘⇧T</kbd>, <kbd>⌘S</kbd>, <kbd>⌘Z</kbd>,
<kbd>⌘⇧Z</kbd> y <kbd>⌘F</kbd> antes de consultar tus asignaciones, así que un
atajo asignado a cualquiera de ellos parecería configurado y no se dispararía
nunca. Si eliges uno de esos, el editor te lo dice en lugar de aceptarlo.

![Atajos reasignables en los ajustes](../../screenshots/settings-shortcuts.webp)

**Ver también:** [Paleta de comandos y búsqueda](search.md)
