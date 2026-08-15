---
title: Blame e historial de archivo
category: Leer cambios
order: 22
summary: Quién escribió esta línea, cuándo, y qué aspecto tenía antes.
keywords: blame historial archivo linea autoria annotate reblame follow seguir
---

# Blame e historial de archivo

Abre cualquier archivo y cambia el modo de vista: **Vista previa · Archivo ·
Diff · Blame · Historial**.

![Blame, con el commit de cada línea en el margen](../../screenshots/blame.webp)

## Blame

Cada línea lleva su commit, su autoría y su fecha, con un color por commit para
que los bloques de historial compartido salten a la vista.

- **Seguir la línea hasta el diff**: salta de una línea de blame directamente al
  cambio que la produjo.
- **Rehacer el blame antes de este commit**: clic derecho en una línea para
  hacer blame del archivo tal y como estaba *antes* de ese commit — la forma de
  recorrer hacia atrás el historial de una línea sin salir de la vista.

## Historial

Todos los commits que tocaron este archivo, del más reciente al más antiguo. Al
seleccionar uno se ve la versión del archivo en ese commit, así puedes ir
pasando páginas de cómo fue creciendo.

![Todos los commits que tocaron un archivo, el más reciente primero](../../screenshots/file-history.webp)

Para el repositorio entero en lugar de un solo archivo, usa la
[máquina del tiempo](time-machine.md).

## Pasa el ratón y te lo explica

Con la IA activada, mantener <kbd>⇧</kbd> (configurable, o ninguna tecla) y
apuntar a un identificador te da una explicación de una línea sobre él, más las
líneas en las que se apoyó — pulsa una para saltar allí. Sólo lee una ventana
numerada alrededor del token, así que cuando algo está definido en otro sitio lo
dice en vez de inventárselo. Mira [Funciones de IA](ai.md).

**Ver también:** [El grafo de commits](graph.md) · [Diffs](diffs.md)
