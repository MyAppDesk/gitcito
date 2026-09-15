---
title: Preparación
category: Trabajar con cambios
order: 30
summary: Prepara archivos enteros, hunks sueltos o líneas concretas.
keywords: preparacion preparar stage staging unstage descartar discard hunk lineas indice index parcial
---

# Preparación

El panel de commit tiene tres listas: **En conflicto**, **Sin preparar** y
**Preparado**. Cada una se pliega, y cada una recuerda si la dejaste abierta.

![Un diff sin preparar, con los controles de hunk y de archivo al lado](../../screenshots/line-staging.webp)

## Qué cambió, por tipo

La cabecera encima de las listas parte el recuento en chips: modificados,
añadidos, eliminados, renombrados, en conflicto. Los mismos colores que los
glifos de las filas. Un tipo sin archivos simplemente no aparece, no se muestra
como cero. Pasa el cursor por los chips para ver el total.

Los archivos sin seguimiento cuentan como añadidos. Es el único sitio en el que
el resumen de preparación discrepa del de un commit, porque un commit no tiene
archivos sin seguimiento.

## Tres niveles de precisión

| Nivel | Cómo |
|---|---|
| **Archivo** | Pulsa el ✚ de la fila, o selecciona varias filas y prepáralas de golpe |
| **Hunk** | Abre el diff y usa el botón de la cabecera del hunk |
| **Línea** | Selecciona líneas dentro del diff y prepara exactamente esas |

Preparar por líneas es lo que hace práctico dejar fuera del commit un
`console.log` de depuración sin tener que borrarlo antes.

## Descartar

Descartar funciona en los mismos niveles, y siempre pregunta. Los archivos sin
seguimiento se borran; los que sí lo tienen vuelven a su estado preparado (o al
del commit).

## Teclado

<kbd>↑</kbd> <kbd>↓</kbd> (o <kbd>j</kbd> <kbd>k</kbd>) recorren las listas de
archivos, con <kbd>⇧</kbd> para un rango y <kbd>⌘</kbd>/<kbd>Ctrl</kbd> para
marcar archivos sueltos.

<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> amplía la selección desde la última fila
en la que hiciste clic. Haz clic derecho sobre la selección para preparar,
quitar de preparados, guardar en stash o descartar todo de una vez.

## Copiar rutas

El clic derecho sobre un archivo sin commitear ofrece **Copiar ruta del
archivo** (absoluta, con los separadores de la plataforma) y **Copiar ruta
relativa del archivo** (`src/index.ts`, sin `./` inicial). Varios archivos
seleccionados copian una ruta por línea, en el orden de la lista. Los archivos
eliminados siguen disponibles: esas acciones solo copian texto. Las carpetas
siguen copiando la ruta de la carpeta.

## Antes de hacer commit

Gitcito comprueba unas cuantas cosas y pregunta una vez, nunca en silencio:

- un archivo que parece un **secreto** (`.env`, `*.pem`, `id_rsa`…),
- un blob **muy grande** (el umbral está en Ajustes → Seguridad),
- hacer commit **directamente a una rama protegida** (`main`/`master` por
  defecto).

Cada uno de esos casos ofrece un *Ignorar y dejar de seguir* de un clic. Mira
[Seguridad y secretos](security.md).

**Ver también:** [Hacer commits](committing.md) · [Diffs](diffs.md) · [Absorb](absorb.md)
