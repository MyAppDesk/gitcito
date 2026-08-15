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

## Antes de hacer commit

Gitcito comprueba unas cuantas cosas y pregunta una vez, nunca en silencio:

- un archivo que parece un **secreto** (`.env`, `*.pem`, `id_rsa`…),
- un blob **muy grande** (el umbral está en Ajustes → Seguridad),
- hacer commit **directamente a una rama protegida** (`main`/`master` por
  defecto).

Cada uno de esos casos ofrece un *Ignorar y dejar de seguir* de un clic. Mira
[Seguridad y secretos](security.md).

**Ver también:** [Hacer commits](committing.md) · [Diffs](diffs.md) · [Absorb](absorb.md)
