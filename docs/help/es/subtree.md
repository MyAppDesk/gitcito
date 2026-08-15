---
title: Subtrees
category: Ramas y cirugía
order: 49
summary: Incorpora otro repositorio dentro de un directorio del tuyo — archivos realmente presentes, sin la ceremonia de los submódulos.
keywords: subtree git subtree vendor biblioteca librería incrustar prefix split squash monorepo submodule submódulo alternativa pull push
---

# Subtrees

Un subtree copia otro repositorio dentro de un directorio del tuyo. A partir de
ahí los archivos **están ahí de verdad**: un `git clone` normal se los lleva,
`git checkout` los mueve como a cualquier otro archivo, y nadie tiene por qué
saber que el directorio vino de otro sitio.

Esa es toda la diferencia con un [submódulo](lfs-sparse.md), que guarda solo un
puntero y necesita `--recurse-submodules`, su propio checkout y su propio HEAD
desacoplado que llevar en la cabeza.

`⌘K` → **Subtrees**.

![Un directorio incorporado encontrado en el historial, con el origen que Gitcito recuerda para él](../../screenshots/subtree.webp)

## La pega que nadie menciona

**Git no registra ningún manifiesto para los subtrees.** Un submódulo tiene
`.gitmodules`, con cada url y cada ruta. Un subtree no tiene nada — solo un
trailer `git-subtree-dir:` en el commit que hizo la importación.

Así que un repositorio puede contener un subtree y no darte forma alguna de
averiguar de dónde salió. Gitcito hace lo que puede:

- La lista se descubre desde el historial, leyendo esos trailers. Cualquier
  subtree añadido por cualquiera, con cualquier herramienta, aparece.
- El **repositorio de origen y la ref** los recuerda Gitcito, en la configuración
  de git de este repositorio. Un subtree descubierto desde el historial empieza
  con esos campos vacíos — rellénalos una vez y pull y push funcionan a partir de
  entonces.

Los valores recordados viven bajo `gitcito.subtree.*` en `.git/config`, así que
se quedan con el repositorio pero no viajan a un clon. **Olvidar** los borra y no
toca nada más.

## Añadir uno

| Campo | Significado |
|-------|---------|
| Directorio | Dónde aterriza, p. ej. `vendor/parser`. No debe existir todavía |
| Repositorio de origen | Una URL o una ruta en disco |
| Rama o etiqueta | Qué importar |
| Squash | Traerlo como un único commit en lugar de con todo su historial |

**Deja Squash activado** salvo que tengas un motivo. Sin él, cada commit de la
biblioteca queda entrelazado en tu log para siempre, y `git log` deja de ir sobre
tu proyecto.

## Convivir con él

| Acción | Qué ejecuta |
|--------|--------------|
| **Pull** | `git subtree pull` — los cambios de upstream aterrizan como una fusión en tu directorio |
| **Push** | `git subtree push` — tus cambios locales bajo ese directorio vuelven al origen |
| **Split** | `git subtree split -b <branch>` — extrae el historial propio del directorio a una rama, con los archivos en su raíz |

**Split** es el que merece la pena conocer: convierte un directorio incorporado
de nuevo en el historial de un repositorio independiente, que es como un subtree
deja de ser un subtree.

## Límites que conviene conocer

- **El push es lento.** Recalcula el historial del directorio desde cero cada
  vez. En un repositorio grande son segundos o minutos, no algo instantáneo, y
  Gitcito solo puede esperar.
- **Un pull es una fusión**, así que puede dar conflictos como cualquier fusión —
  acabas en [el resolutor](conflicts.md).
- **`git subtree` es un script de contrib**, no un builtin de git. Una
  instalación de git recortada puede no traerlo; Gitcito lo dice claramente en
  lugar de pasarte un "'subtree' is not a git command".
- **Un historial con squash no se puede des-squashear** después. Esos commits
  nunca se importaron.
- Gitcito no convierte un submódulo en un subtree, ni al revés.

Ver también: [Fusionar y rebasar](merging.md) · [Fontanería con interfaz](lfs-sparse.md)
