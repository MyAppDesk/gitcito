---
title: TODOs del código
category: Herramientas del espacio de trabajo
order: 93
summary: Cada TODO, FIXME y HACK que lleva el código, agrupados por etiqueta, por responsable o por carpeta.
keywords: todo todos fixme hack xxx note marca marcas comentario comentarios árbol etiqueta responsable asignado cgm deuda técnica grep escaneo
---

# TODOs del código

Un TODO es una promesa que alguien se hizo a sí mismo y luego perdió. Se
escribe donde está el problema, que es justo donde nadie vuelve a mirar, y para
cuando importa quien lo escribió ya ha cambiado de equipo. Con grep aparecen, y
mil líneas de salida de grep es lo mismo que no encontrarlos.

La pestaña **TODOs** del panel del analizador los lee todos y hace lo que grep
no puede: agruparlos. Abre el panel desde la barra de estado o desde la paleta
de comandos (`TODOs del código`) y cambia a la segunda pestaña.

La barra de estado cuenta las marcas junto a los errores y avisos de los
analizadores; al pulsar ese contador se abre esta pestaña.

![La pestaña TODOs, agrupada por responsable](../../screenshots/code-todos.webp)

## Qué cuenta como marca

Una etiqueta, dentro de un comentario, en un archivo que Git sigue o seguiría:

| Escrito | Se lee como |
|---------|-------------|
| `// TODO: envíalo` | etiqueta `TODO`, sin responsable |
| `//todo envíalo` | lo mismo — los dos puntos y el espacio son opcionales |
| `# todo envíalo` | lo mismo — ni las mayúsculas ni el lenguaje importan |
| `/* TODO(cgm): envíalo */` | etiqueta `TODO`, responsable `cgm` |
| `-- TODO (CGM) envíalo` | el mismo responsable: `cgm`, `(CGM)` y `[cgm]` son una persona |
| `<!-- TODO: @cgm envíalo -->` | otra vez lo mismo |

Las etiquetas son `TODO`, `FIXME`, `BUG`, `HACK`, `XXX`, `NOTE`, `OPTIMIZE`,
`REVIEW`, `REFACTOR`, `DEPRECATED`, `QUESTION`, `IDEA`, `WIP` y `TEMP`. Las
cuatro primeras van con color, porque «esto está roto» y «esto es una idea que
tuve» no deberían parecerse en una lista.

La etiqueta tiene que ir detrás de un inicio de comentario — `//`, `#`, `--`,
`;`, `%`, `/*`, `*`, `<!--`, `"""`. Nada más cuenta: `todo = [l for l in lines]`
es código, y un panel que apunta una asignación de variable como deuda es un
panel en el que no se vuelve a confiar. La misma regla deja fuera de la lista a
una función llamada `reviewNotes`.

## Agrupar es la función

Cuatro ejes, un clic cada uno:

| Agrupar por | Responde a |
|-------------|------------|
| **Etiqueta** | ¿Qué clase de deuda arrastra este repositorio? |
| **Responsable** | ¿Qué dejó cada persona — y qué hay en el montón sin asignar? |
| **Carpeta** | ¿Qué rincón del árbol se está pudriendo? |
| **Archivo** | La lista de siempre, cuando ya sabes adónde vas. |

**Sin asignar** es un grupo de verdad, no un resto: las marcas a las que nadie
puso su nombre son las que nunca recoge nadie, y verlas contadas es justo el
punto.

Las fichas de etiqueta de arriba filtran la lista; también lo hace pulsar la
insignia de responsable en una fila, y el buscador, que compara contra el
mensaje, el archivo, la etiqueta y el responsable. **Solo cambiados** reduce a
los archivos que has editado y aún no has confirmado — la última comprobación
antes de un push, cuando un `// FIXME` que dejaste hace una hora está a punto de
volverse permanente.

Al pulsar una fila se abre el archivo en esa línea.

## Lo que no hace

- **Lee, nunca escribe.** No hay «marcar como hecho»: la forma de cerrar un TODO
  es borrar la línea y confirmarlo. Si quieres una lista que Gitcito guarde por
  ti, mira [todos](todos.md), que es otra cosa distinta: notas privadas que viven
  en la app, no en el código.
- **Los archivos ignorados se saltan**, junto con `node_modules`, digan lo que
  digan las etiquetas de dentro. Los archivos sin seguimiento sí entran: una
  marca escrita hace cinco minutos es la que más merece verse.
- **No sabe distinguir un comentario de una cadena.** Una línea que dice
  `const banner = "// TODO"` es una marca para el escaneo. No tiene un analizador
  sintáctico de cuarenta lenguajes y no pretende tenerlo.
- **El escaneo es una foto fija.** Si editas un archivo, el panel conserva los
  números que tenía hasta que vuelvas a escanear; el botón de refrescar es toda
  la historia.
- **Se detiene en 5.000 marcas.** Un repositorio que pase de ahí tiene un
  problema de deuda que ningún panel va a resolver.

## Dónde se ejecuta

Un solo `git grep` sobre el árbol de trabajo, que es por lo que tarda
milisegundos donde la pestaña [Problemas](problems.md) tarda segundos: no se
compila nada, no interviene ninguna cadena de herramientas, y la búsqueda se
salta binarios y rutas ignoradas porque Git ya sabe cuáles son.
