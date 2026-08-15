---
title: Diff semántico
category: Leer cambios
order: 21
summary: Qué ha cambiado, símbolo a símbolo — renombrados, cambios de firma, movimientos.
keywords: diff semantico semántico ast tree-sitter rename renombrado firma signature movido symbols simbolos qué ha cambiado what changed
---

# Diff semántico

Un renombrado puro aparece en un diff por líneas como un archivo entero borrado
y un archivo entero añadido. Es técnicamente cierto y completamente inútil.

Encima de cada diff de archivo, Gitcito muestra una tira **Qué ha cambiado**:
ambas versiones del archivo se analizan con **tree-sitter** — árboles de sintaxis
de verdad, no expresiones regulares — y se emparejan sus declaraciones.

![La tira de qué ha cambiado: renombrados y cambios de firma, símbolo a símbolo](../../screenshots/semantic-diff.webp)

| Veredicto | Ejemplo |
|---|---|
| **Renombrado** | `startServer` → `bootServer` |
| **Firma** | `open(path)` → `open(path, mode)` |
| **Añadido** / **Eliminado** | una función nueva; una borrada |
| **Movido** | el mismo código, 40 líneas más abajo |
| **Modificado** | mismo nombre y misma firma, cuerpo distinto |

Los renombrados y los cambios de firma se ordenan primero — son lo que quien
revisa no puede pasar por alto. Pulsa una fila para saltar a ese símbolo dentro
del diff.

## Qué sabe analizar

TypeScript, TSX, JavaScript, Python, Go, Rust, Java, C, C++, C#, Ruby, PHP,
Swift, Kotlin, Scala, Lua, Bash y Zig.

Un archivo cuyo lenguaje no tiene gramática se queda con su diff por líneas de
siempre — la tira ni siquiera aparece. Lo mismo con los archivos de más de
400 KB.

## Límites honestos

- Un renombrado cuyo cuerpo también cambió se reporta como renombrado **y** lo
  dice.
- Dos funciones de una línea que casualmente se parecen *no* se emparejan: por
  debajo de cierto umbral de tamaño la coincidencia tiene que ser casi exacta,
  así que obtienes un eliminado + añadido limpio en vez de un renombrado
  inventado.
- Los símbolos que sólo se desplazan unas líneas porque algo por encima creció
  no se reportan como "movidos" — eso enterraría los movimientos de verdad.

**Ver también:** [Visor de diffs](diffs.md) · [Qué ha cambiado desde](range-diff.md)
