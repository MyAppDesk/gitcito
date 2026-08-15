---
title: Eliminar archivos sin seguimiento
category: Trabajar con cambios
order: 35
summary: Un simulacro de git clean — cada ruta sin seguimiento, con su tamaño, los ignorados aparte y la Papelera como destino por defecto.
keywords: limpiar clean git clean untracked sin seguimiento eliminar borrar basura salida de compilación ignorados ignored gitignore dry run papelera trash node_modules dist ordenar
---

# Eliminar archivos sin seguimiento

Un árbol de trabajo acumula archivos de los que git nunca hizo copia: una nota
suelta, un `debug-output.txt`, un `dist/` de una compilación que falló, un
`node_modules` de una rama que dejaste el mes pasado. Git tiene un comando para
esto — `git clean` — y es la única operación de git con **nada detrás**. El
contenido nunca estuvo en un commit, así que no hay entrada en el reflog, ni
stash, ni deshacer, ni conjuro de `git` que lo traiga de vuelta.

Por eso es la operación que la gente ejecuta en una terminal y luego lamenta. La
versión de Gitcito enseña la lista entera antes de que pase nada.

`⌘K` → **Eliminar archivos sin seguimiento**.

![Rutas sin seguimiento e ignoradas listadas por separado, cada una con su tamaño, antes de eliminar nada](../../screenshots/clean.webp)

## Qué significa la lista

Cada entrada es una ruta a la que `git clean` podría llegar, con su tamaño en
disco, en dos grupos:

| Grupo | Qué es | Seleccionado por defecto |
|-------|-----------|---------------------|
| **Sin seguimiento** | Nunca se hizo commit, no coincide con `.gitignore` | Sí |
| **Ignorados** | Coincide con `.gitignore` — salida de compilación, cachés, `.env` | **No** |

La separación es justo lo importante. Las rutas ignoradas suelen no valer nada y
de vez en cuando son la única copia de algo que sí importa: un `.env` local, un
volcado de base de datos, un fixture descargado. Nada que coincida con
`.gitignore` se selecciona por ti.

Un **directorio** completamente sin seguimiento es una sola fila, no una fila por
archivo — `tmp/`, `dist/`, `node_modules/` — porque esa es la granularidad con la
que git los elimina, y un listado de 40.000 archivos es un listado que no lee
nadie. Su tamaño es la suma de lo que contiene.

Una carpeta marcada como **repositorio propio** tiene su propio `.git`: un clon
que dejaste caer dentro de este, o una prueba que nunca llegaste a enlazar. Git
se niega a eliminarlos (quiere `-ff`, una opción que Gitcito no ofrece) — la
Papelera sí se los lleva.

## Papelera o borrado

**Mover a la Papelera** está activado por defecto y no pasa por git en absoluto:
las rutas van a la Papelera del sistema, donde puedes devolverlas a su sitio. Es
la única vía que elimina un repositorio anidado, y la única que sobrevive a una
casilla mal marcada.

Desactivarlo es un `git clean -f -d -x` de verdad sobre exactamente las rutas
seleccionadas, y te pide confirmación con el número y el tamaño total delante.
De eso no se recupera nada.

## Límites que conviene conocer

- **Solo archivos sin seguimiento.** Un archivo con seguimiento y modificado no
  está aquí — eso es [Descartar](staging.md), que lo restaura desde el índice o
  desde HEAD.
- **La lista está limitada** a las primeras 400 rutas. Si un repositorio tiene
  más, elimina lo que aparece y pulsa **Reexplorar** para el resto.
- **Los tamaños de directorio son aproximados** en árboles muy grandes: el
  escaneo se detiene a los 20.000 archivos, así que un `node_modules` gigante
  puede parecer más pequeño de lo que es. Nunca parece más grande.
- **El escaneo es una foto fija.** Si una compilación escribe archivos mientras
  el diálogo está abierto, pulsa **Reexplorar** antes de eliminar nada.
- Las rutas se contrastan con la propia lista de archivos eliminables de git
  antes de tocar nada, así que nada con seguimiento puede eliminarse desde este
  diálogo, ni siquiera por nombre.

Ver también: [Preparar y descartar](staging.md) · [Ignorar archivos](hooks.md) ·
[Eliminar un archivo del historial](history-purge.md)
