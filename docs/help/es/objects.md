---
title: Explorador de objetos
category: Repositorio e historial
order: 16
summary: Recorre la capa que hay debajo del grafo — commits, árboles, blobs, tags y las refs que los apuntan. Aquí nada cambia nada.
keywords: objetos objects object explorador explorer blob árbol tree commit tag etiqueta ref plumbing cat-file ls-tree sha1 internals interioridades base de datos database rev-parse HEAD^{tree} loose packed suelto empaquetado
---

# Explorador de objetos

Git tiene fama de complicado. Casi toda esa fama viene de no haber visto nunca
el modelo: **cuatro tipos de objeto, y punteros**. En cuanto puedes hacer clic
en un commit, aterrizar en su árbol y descubrir que tu archivo *es* un blob al
que un árbol le puso el nombre, la porcelana deja de ser magia.

`⌘K` → **Explorador de objetos**. Nada de esta página puede cambiar un solo
byte — todas las llamadas que hay detrás son de lectura.

![Los campos de un commit, con su árbol y sus padres como enlaces, junto a la lista de refs](../../screenshots/objects.webp)

## Los cuatro objetos

| Objeto | Es | Sabe |
|--------|----|-------|
| **blob** | El *contenido* de un archivo | Nada. Ni su nombre, ni su ruta, ni su historial |
| **tree** | Un listado de directorio | Nombres, modos y el sha de cada blob o árbol hijo |
| **commit** | Una instantánea | Su árbol, sus padres, autor, committer, mensaje |
| **tag** | Una etiqueta anotada | El objeto que apunta, quién la creó, un mensaje |

La sorpresa para casi todo el mundo es la primera fila. **Un blob no tiene
nombre.** Dos archivos con contenido idéntico en cualquier punto de tu historial
son el mismo blob, almacenado una sola vez. El nombre vive en el árbol que lo
apunta — por eso git rastrea contenido en lugar de archivos, y por eso los
renombrados se detectan en lugar de registrarse.

Una **ref** — `refs/heads/main`, `refs/tags/v1.0`, `HEAD` — no es más que un
archivo que contiene un sha. En eso consiste entero lo de "crear ramas es
barato".

## Recorrer

La columna izquierda lista todas las refs del repositorio, agrupadas como las
agrupa git. Haz clic en una para aterrizar en el objeto que nombra.

A partir de ahí todo es un enlace:

- Un **commit** muestra su `tree` y cada `parent` — entra a la instantánea, o
  ve hacia atrás por el historial de commit en commit.
- Un **tree** lista sus entradas con modo, tipo, sha y tamaño. Haz clic en un
  nombre para abrir ese hijo.
- Un **blob** muestra su texto (el principio, si es grande), o dice claramente
  que es binario.
- Una **etiqueta anotada** muestra a qué apunta — entra hasta el commit.

**Atrás** deshace tus pasos.

## Escribir una revisión

La caja acepta cualquier cosa que acepte `git rev-parse`, que es donde esto
deja de ser un navegador y empieza a ser una forma de aprender:

| Escribe esto | Para obtener |
|-----------|--------|
| `HEAD` | El commit actual |
| `HEAD~3` | Tres commits atrás |
| `HEAD^{tree}` | El árbol de ese commit, pelado |
| `HEAD:src/app.ts` | El blob de esa ruta, directamente |
| `v1.0^{}` | A qué apunta una etiqueta anotada, en vez del objeto de etiqueta |
| `a1b2c3d` | Cualquier objeto, por sha — las abreviaturas valen |

Los dígitos de modo en el listado de un árbol merecen conocerse: `100644` un
archivo, `100755` ejecutable, `040000` un subárbol, `120000` un enlace
simbólico, `160000` un gitlink de submódulo — y ese último es todo lo que
guarda un submódulo.

## Límites que conviene conocer

- **Es de solo lectura, a propósito.** Aquí no hay nada con lo que escribir.
  Fabricar objetos a mano es un ejercicio de `git hash-object`, y su sitio es un
  terminal.
- **Los blobs grandes se truncan** a partir de los primeros 200 KB — suficiente
  para ver qué son, no tanto como para colgar la ventana.
- **Los tamaños son el tamaño del contenido del objeto** tal como lo reporta
  `git cat-file -s`, no lo que ocupa en disco después de empaquetarlo. Para eso,
  mira [mantenimiento](maintenance.md).
- **Los objetos inalcanzables siguen siendo objetos.** Pega un sha del informe
  de colgantes de `git fsck` y se abre, que suele ser la vía más rápida para ver
  qué contenía un commit perdido antes de decidir si lo recuperas.

Ver también: [El grafo](graph.md) · [Mantenimiento del repositorio](maintenance.md) ·
[Recuperación](recovery.md)
