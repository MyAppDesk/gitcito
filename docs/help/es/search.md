---
title: Paleta de comandos y búsqueda
category: Repositorio e historial
order: 11
summary: Salta a cualquier sitio, y haz grep sobre el árbol o el historial.
keywords: paleta comandos command palette busqueda search grep buscar codigo pickaxe difusa fuzzy saltar jump
---

# Paleta de comandos y búsqueda

## La paleta — <kbd>⌘K</kbd>

Salto difuso a una **rama** (la deja activa), un **commit** (desplaza el grafo
hasta él), un **archivo del árbol de trabajo**, o una **acción** — fetch, pull,
push, stash, terminal, reflog, ajustes, y todas las funciones de este manual.

Aprende: lo que usaste hace poco sale primero, y lo que usas a menudo gana a lo
que no.

![La paleta de comandos](../../screenshots/command-palette.webp)

## Búsqueda en el código — <kbd>⌘⇧F</kbd>

Dos preguntas distintas, un solo diálogo:

| Modo | Pregunta que responde |
|---|---|
| **Contenidos** | «¿Dónde está esta cadena ahora mismo?» — `git grep` sobre archivos con seguimiento *y* sin él, con mayúsculas / palabra completa / regex. |
| **Pickaxe del historial** | «¿Cuándo apareció o desapareció esta cadena?» — `git log -S` / `-G`. |

Los resultados vuelven con resaltado de sintaxis y la coincidencia marcada,
agrupados por archivo y desplegables hasta las líneas exactas. Pulsa uno para
abrir el archivo en esa línea, o el commit que lo introdujo.

![Resultados de la búsqueda en el código](../../screenshots/code-search.webp)

## Filtrar el grafo

La caja de búsqueda sobre el grafo filtra commits por mensaje, autoría, SHA o
estado de despliegue. Para «solo los commits que tocaron este archivo», usa el
filtro por ruta — mira [el grafo de commits](graph.md).

**Ver también:** [El grafo de commits](graph.md) · [Teclado y atajos](keyboard.md)
