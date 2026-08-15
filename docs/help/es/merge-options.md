---
title: Opciones de merge
category: Ramas y cirugía
order: 45
summary: Los interruptores de git merge para las fusiones que salen mal siempre igual — -X ours, espacios en blanco, squash, subtree.
keywords: merge fusion fusionar opciones estrategia -X ours theirs ignore-space-change espacios whitespace squash no-ff ff-only no-commit subtree resolve ort recursive log --merge por que conflicto
---

# Opciones de merge

Un merge normal es un botón, y casi siempre ahí acaba la historia. Esta página
es para las otras veces: el lockfile que choca en cada fusión, el archivo que
alguien reindentó, el proyecto vendorizado cuyas rutas no cuadran. Git tiene
interruptores para los tres desde hace años; solo que están enterrados en una
página de manual que nadie abre en mitad de un conflicto.

Clic derecho en una rama → **Merge con opciones…** — en las filas de ramas y
remotos de la barra lateral *y* en las insignias de colores de las refs del
grafo, que comparten un mismo bloque de menú — o `⌘K` → **Merge con opciones**.

![Opciones de merge, con el comando git exacto escrito debajo](../../screenshots/merge-options.webp)

El comando se va escribiendo mientras lo construyes. Está ahí para que lo
contrastes con el manual — y para que lo ejecutes desde una terminal la próxima
vez, sin este diálogo.

## Cuando un hunk entra en conflicto

| Elección | Flag | Significa |
|--------|------|-------|
| Para y pregúntame | — | Lo predeterminado. Lo resuelves tú |
| Quedarme con el lado de esta rama | `-X ours` | Los hunks que chocan se resuelven con lo que ya está en el árbol de trabajo |
| Aceptar el lado entrante | `-X theirs` | Los hunks que chocan se resuelven con la rama que entra |

**`-X ours` no es `-s ours`.** El interruptor de aquí decide solo los hunks que
realmente chocan; todos los demás cambios de la otra rama se fusionan con
normalidad. La estrategia llamada `ours` — que Gitcito no ofrece — se queda con
tu árbol entero y tira el otro lado a la basura, produciendo un commit de merge
que dice contener trabajo que no contiene. Esa distinción es lo peor entendido
de todo lo que rodea a las fusiones en git.

**No puede decidirlo todo.** Un conflicto de modificación/borrado — un lado
editó un archivo, el otro lo borró — no es un hunk de contenido, y `-X` te lo
deja a ti. Y está bien que así sea: no existe ninguna versión de "prefiere los
míos" que responda a si un archivo borrado debe volver.

## Espacios en blanco

| Elección | Flag |
|--------|------|
| Ignorar cambios en espacios ya existentes | `-X ignore-space-change` |
| Ignorar los espacios por completo | `-X ignore-space-at-eol`, `-X ignore-all-space` |

El caso para el que existe esto: una rama reindentó un archivo (o lo hizo un
formateador), la otra editó las mismas líneas. Git ve dos ediciones sobre una
misma línea y se para. Con los espacios ignorados, la reindentación deja de ser
un cambio que sopesar, y la edición de verdad pasa por la fusión.

El resultado conserva los espacios del *otro* lado en las líneas que tocó, así
que pasar el formateador después no es mala idea.

## Qué registrar

| Elección | Flag | Con qué te quedas |
|--------|------|-----------------|
| Fast-forward cuando se pueda | — | Un commit de merge solo si el historial divergió |
| Crear siempre un commit de merge | `--no-ff` | Un commit de merge incluso en un fast-forward, para que la rama quede visible en el grafo para siempre |
| Solo fast-forward, o negarse | `--ff-only` | Nada, si hiciera falta una fusión de verdad. Útil como comprobación |
| Squash | `--squash` | Los cambios preparados, ninguna fusión registrada, el commit lo escribes tú |
| Fusionar pero no hacer commit | `--no-commit` | La fusión preparada y en curso, para que puedas inspeccionarla o retocarla antes |

**Squash y `--no-commit` no son lo mismo.** El squash olvida que hubo una fusión
siquiera: git no registra un segundo padre, y la próxima vez la rama parecerá
sin fusionar. `--no-commit` es una fusión en curso que simplemente te está
esperando — `MERGE_HEAD` está puesto, y hacer commit la termina con normalidad.

**`--ff-only` no falla en silencio.** Si hiciera falta un commit de merge, git
se niega y no se mueve nada, que es justo lo que lo convierte en una buena
comprobación de cordura antes de una fusión automatizada.

## Estrategia

| Estrategia | Para |
|----------|-----|
| Por defecto (`ort`) | Todo. La fusión a tres bandas moderna de git |
| `subtree` | Los dos lados viven en rutas distintas — un proyecto vendorizado dentro de un subdirectorio de este |
| `resolve` | La fusión a tres bandas antigua. De vez en cuando funciona donde `ort` se rinde con un historial entrecruzado |

`-s subtree` es la que merece la pena recordar. Fusionar actualizaciones de un
proyecto que vive en `vendor/parser/` se leería si no como "todos los archivos
borrados, todos los archivos añadidos"; la estrategia subtree calcula primero el
desplazamiento de rutas. Mira [subtrees](subtree.md) para el flujo completo.

## Por qué esto entra en conflicto

Dentro del [resolvedor de conflictos](conflicts.md) hay un botón **Por qué esto
entra en conflicto**. Ejecuta `git log --merge` para el archivo que tienes
delante y lista, por cada lado, los commits que lo han tocado desde que las
ramas se separaron.

![Los commits de cada lado que tocaron el archivo en conflicto](../../screenshots/conflict-why.webp)

Los marcadores de conflicto dicen *qué* choca. Esto dice *quién lo cambió,
cuándo y por qué* — que suele ser la pregunta que de verdad decide la
resolución, y la razón para ir a preguntarle a alguien antes de elegir un lado.

Si no muestra nada, ninguno de los dos lados hizo commit de un cambio en este
archivo exacto: el choque viene de un renombrado o de un movimiento de directorio
más arriba.

## Límites que conviene conocer

- **Las opciones valen para una fusión.** No se recuerdan, y no cambian ni la
  entrada normal **Fusionar en la actual** ni el menú de arrastrar y soltar.
- **Deshacer sigue funcionando**: una fusión ejecutada con opciones registra la
  misma entrada de deshacer, que resetea a `ORIG_HEAD`.
- **Las fusiones pulpo** (más de dos ramas a la vez) no se ofrecen aquí.
- **Las entradas "Fusionar X en Y" por ref del menú del commit** siguen siendo
  fusiones normales. Usa la insignia de la ref cuando quieras las opciones.
- **`-X` decide en silencio.** Nada marca qué hunks se resolvieron solos, así
  que en una fusión importante lee el diff después, en lugar de fiarte de la
  ausencia de conflictos.

Ver también: [Fusionar y rebasar](merging.md) · [Conflictos](conflicts.md) ·
[Subtrees](subtree.md) · [Radar de conflictos](conflict-radar.md)
