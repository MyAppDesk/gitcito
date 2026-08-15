---
title: Replace e injertos
category: Repositorio e historial
order: 17
summary: Acorta el historial de un clon sin reescribirlo — git replace, injertos, y cómo devolver el historial a su sitio.
keywords: replace git replace injerto graft refs/replace shallow superficial truncar truncate historial history archivo archive padres parents reescribir rewrite filter-branch alternativa clon más pequeño smaller clone useReplaceRefs no-replace-objects
---

# Replace e injertos

`git replace` le dice a git: *allá donde ibas a leer el objeto A, lee B en su
lugar*. No se reescribe nada. Ningún sha cambia. Cada commit se queda
exactamente donde estaba — git simplemente mira a otro sitio al pasar por ahí.

Suena a curiosidad hasta que quieres un clon más pequeño. Entonces es la
alternativa honesta a reescribir el historial: **injerta un commit sin padres**
y todo lo anterior desaparece del log, del grafo y de cualquier clon que se haga
desde ahí — sin dejar de estar almacenado, sin dejar de poder traerse, y a una
ref borrada de volver.

`⌘K` → **Replace e injertos**.

![Las sustituciones existentes, y debajo el formulario de injerto](../../screenshots/replace.webp)

## Injertar

| Le das | Y obtienes |
|---------|-------------|
| Un commit, **sin padres** | Ese commit pasa a ser el principio del historial |
| Un commit, **uno o más padres** | Se engancha ahí en lugar de donde está de verdad |

La segunda forma es la interesante. Guarda el historial completo en un
repositorio de archivo, trunca el de trabajo, y un injerto que apunte a la punta
del archivo vuelve a unir los dos — el mismo truco que usa GitHub para servir un
clon superficial que aun así se puede profundizar.

**Injertar sin padres pregunta antes**, porque "el historial ya no está" y "el
historial está oculto" se ven igual desde el log y no son en absoluto lo mismo.
Los objetos sobreviven hasta que un `gc` los pode; mira
[mantenimiento](maintenance.md).

## Convivir con ello

**Las sustituciones son refs**, bajo `refs/replace/`. Eso tiene tres
consecuencias que conviene conocer:

- Son **locales hasta que las publicas**: `git push origin "refs/replace/*"` las
  comparte, y quien clone sin ellas verá el historial intacto.
- **El deshacer funciona** — borrar la ref restaura la ascendencia real al
  momento, y Gitcito registra el injerto como una acción deshacible, igual que
  cualquier otra.
- `core.useReplaceRefs=false` hace que git las ignore todas de golpe. El
  interruptor de aquí escribe exactamente eso, y el diálogo lo dice cuando está
  desactivado, porque un repositorio que ignora en silencio sus propias
  sustituciones es un sitio confuso.

Desde la línea de comandos, `git --no-replace-objects log` muestra el historial
real sin tocar ningún ajuste.

## Cuándo tirar de esto en lugar de reescribir

| Objetivo | Herramienta |
|------|------|
| El clon es demasiado grande, el historial está bien | **Injerto** — no se reescribe nada, es reversible |
| Un secreto o un blob enorme tienen que *desaparecer* | [Eliminar un archivo del historial](history-purge.md) — una reescritura de verdad |
| Solo quieres descargar menos una vez | `git clone --depth` — superficial, sin refs que gestionar |

Un injerto no elimina nada. Si la razón por la que quieres fuera esos commits
viejos es que contienen algo que nunca debió commitearse, esta no es tu página:
los objetos siguen ahí, siguen siendo accesibles por sha, y siguen en todos los
clones que ya existen.

## Límites que conviene conocer

- **Lo que ves deja de coincidir con lo que hay almacenado.** Esa es la
  funcionalidad, y también el peligro. Quien depure un clon con sustituciones
  necesita saber que existen.
- **Las sustituciones no viajan por defecto**, así que el `git log` de un colega
  y el tuyo pueden discrepar con toda la razón.
- **Una sustitución puede esconder un commit de las herramientas, no de git.**
  `git cat-file` y el [explorador de objetos](objects.md) siguen abriendo el
  original por sha.
- **Gitcito no ofrece `git replace --edit`** (reescribir a mano el contenido de
  un objeto). Eso es trabajo de un editor de texto sobre un objeto en crudo, y
  un tiro en el pie con una interfaz alrededor.

Ver también: [Explorador de objetos](objects.md) ·
[Eliminar un archivo del historial](history-purge.md) ·
[Mantenimiento del repositorio](maintenance.md)
