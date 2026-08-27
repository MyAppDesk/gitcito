---
title: Resolver conflictos
category: Trabajar con cambios
order: 32
summary: Un resolutor de tres paneles que te dice qué lado es cuál.
keywords: conflicto conflictos resolver resolutor merge fusión ours theirs nuestro suyo marcadores tres vías rerere reuse recorded resolution recordar repetir
---

# Resolver conflictos

Cuando un merge, un rebase, un cherry-pick o un revert se detiene, un aviso te
dice **qué** se ha parado y **entre qué** — "fusionando `feature/x` en `main`",
no un simple "conflicto".

![El resolutor de conflictos](../../screenshots/conflict-resolver.webp)

## Por qué hay conflicto

**Por qué hay conflicto**, en la cabecera, enumera por cada lado los commits que
tocaron este archivo desde que las ramas se separaron — `git log --merge`, que
git lleva incluyendo desde siempre y que nadie encuentra.

![Los commits de cada lado que tocaron el archivo en conflicto](../../screenshots/conflict-why.webp)

Los marcadores dicen qué choca. Esto dice quién lo cambió y por qué, que suele
ser lo que de verdad decide la resolución. Si ahí no hay nada, ninguno de los dos
lados hizo un commit sobre esta ruta exacta — el choque viene de un renombrado o
de un movimiento.

## Los tres paneles

| Panel | Es |
|---|---|
| Izquierda | **Ours** — el lado en el que estabas, etiquetado con su commit |
| Derecha | **Theirs** — el lado que entra, etiquetado con su commit |
| Centro | La **salida**: editable, con números de línea, y lo que realmente se prepara |

Los tres paneles se redimensionan, y la cabecera de la salida lleva dos
interruptores de vista:

| Interruptor | Qué hace |
|---|---|
| **Ajustar** | Pliega las líneas largas dentro de los paneles A y B en vez de desplazarlas. El panel de salida mantiene una fila por línea — sus marcadores laterales dependen de eso — así que siempre se desplaza |
| **Vinculado** | Desplaza A, B y la salida a la vez, en vertical y en horizontal. Sus recuentos de líneas difieren, así que la posición vertical se iguala por proporción |

Ajustar empieza desactivado, Vinculado empieza activado, y ambos recuerdan su
estado.

## Moverse

Al abrir un archivo aterrizas en su **primer conflicto**, no al principio del
archivo. Las flechas ⌃ / ⌄ de la cabecera de la salida — o <kbd>Alt+↑</kbd> /
<kbd>Alt+↓</kbd> — recorren el resto, desplazando los tres paneles hasta cada
uno.

## Elegir

Por **línea**, por **bloque**, o el **lado entero** de una vez — y puedes quedarte
con los dos lados de un bloque cuando la respuesta es "conservar ambos". Un
navegador conflicto a conflicto te lleva por lo que queda, así que no puedes
dejarte un marcador sin querer.

## Ayuda de IA

Con la IA activada, **Resolver con IA** propone una fusión en el panel de salida.
Nunca aplica nada por su cuenta: la lees, la editas y la preparas. Mira
[Funciones de IA](ai.md).

## Archivos de proyecto de Xcode

`project.pbxproj` entra en conflicto más que cualquier otro archivo de un
repositorio de iOS, y casi nunca porque alguien discrepara. Es un único
diccionario plano de objetos con claves de 24 dígitos hexadecimales, así que
añadir un archivo escribe cuatro entradas: un `PBXBuildFile`, un
`PBXFileReference`, una línea en los `children` del grupo que lo contiene y otra
en la fase de compilación del target. Dos personas que añaden un archivo cada
una escriben ocho entradas que caen sobre las mismas pocas líneas. Git ve una
colisión; no hay nada que resolver.

Cuando el archivo en conflicto es un `project.pbxproj`, el resolutor lee las
tres versiones como proyectos en vez de como texto y ofrece **fusionar por
estructura**: emparejar objetos por identificador, tomar todas las adiciones de
ambos lados, unir los arrays `children` y `files`, y detenerse en lo que
realmente divergió. La franja sobre los paneles dice qué añadió cada lado y qué
queda —si queda algo— para ti.

Igual que la propuesta de la IA, aterriza en el panel de salida y no prepara
nada. Lo lees antes de guardar.

![La franja de fusión estructural sobre los paneles de conflicto, en un archivo de proyecto de Xcode](../../screenshots/conflict-pbxproj.webp)

### Lo que se niega a hacer

**Nunca adivina un ajuste que ambos movisteis.** Si tú pones
`MARKETING_VERSION` en `1.1` y ellos en `2.0`, eso es una decisión, y aparece
nombrada en la franja —el ajuste, tu valor, el suyo— en lugar de resolverse a tus
espaldas. Un objeto que no pudo zanjar conserva *tu* versión exacta, así que
nunca llega al disco una fusión a medio aplicar.

**Rechaza el archivo entero si alguna de las tres versiones no se puede
analizar.** Un `project.pbxproj` que Xcode no pueda abrir cuesta más que una
fusión manual, así que todo lo que no pueda leer con certeza sigue siendo un
conflicto de texto normal, y lo dice.

**No detecta dos identificadores acuñados para objetos distintos.** Es raro,
porque Xcode los elige al azar, pero cuando pasa, tomar cualquiera de los dos
lados descartaría en silencio el archivo de alguien, así que se informa en vez
de fusionarse.

### No uses `merge=union`

El remedio que circula para esto es `*.pbxproj merge=union` en
[`.gitattributes`](attributes.md). Evítalo. La unión funciona mientras los
únicos cambios sean adiciones independientes, y en cuanto dos personas editan el
mismo ajuste de compilación emite ambas líneas y produce un archivo que Xcode se
niega a abrir — justo en el momento en el que menos probable es que estés leyendo
el diff con atención. La fusión estructural da la misma comodidad sin ese fallo.

## Lockfiles

`Podfile.lock`, `Package.resolved`, `yarn.lock` y sus primos registran un grafo
de dependencias que el resolutor de alguien ya resolvió. La mitad de una
solución cosida a la mitad de otra es un grafo que no resolvió nadie: puede que
no instale, y si instala, instala algo que ninguna de las dos ramas probó.

Así que cuando el archivo en conflicto es un lockfile, la franja nombra la
herramienta que lo gobierna, ofrece **Quedarme con lo mío** y **Quedarme con lo
suyo** ahí mismo, y te da el comando que lo vuelve a generar después. Elegir un
lado no es un apaño aquí — es el método entero, y regenerarlo es lo que lo hace
correcto.

![La franja de lockfile sobre los paneles de conflicto](../../screenshots/conflict-lockfile.webp)

Los tres paneles siguen disponibles, porque de vez en cuando sí quieres leer qué
cambió: una suma de comprobación que reconoces, una versión que esperabas.
Editarlos a mano es justo de lo que esto intenta disuadirte.

## Evitarlos de entrada

El [radar de conflictos](conflict-radar.md) te dice qué ramas van a dar conflicto
antes de que fusiones ninguna.

## Dejar que git lo recuerde (rerere)

Haz rebase de una rama de larga vida y te encontrarás el mismo conflicto una y
otra vez. `rerere` — *reuse recorded resolution* — es la respuesta de git:
memoriza cómo resolviste un conflicto y repite esa respuesta la próxima vez que
aparezca el idéntico.

**Ajustes → General → Recordar resoluciones de conflictos.** Escribe
`rerere.enabled` en tu configuración global de git, así que la línea de comandos
se comporta igual.

Cuando git ha respondido por ti, el resolutor lo dice en lugar de mostrar una
pantalla vacía de "sin marcadores de conflicto", y ofrece **Olvidar esta
resolución** — que borra el recuerdo *y* devuelve el conflicto, para que puedas
resolverlo de otra manera.

Dos cosas que conviene saber:

- **Una resolución repetida no se prepara** salvo que actives *Preparar
  automáticamente una resolución repetida*. Déjalo desactivado: el sentido de la
  pausa es que una respuesta memorizada puede ser incorrecta para esta fusión en
  concreto, y preparar sin mirar es como acaba llegando a un commit.

  Por eso un archivo repetido **sigue en Archivos en conflicto**: git escribió el
  contenido pero el índice lo mantiene como no fusionado, y solo prepararlo
  cierra el asunto. **Preparar tal cual** en el resolutor, o **Marcar todo como
  resuelto** en la lista, es lo que lo mueve.
- **rerere no entiende todos los conflictos.** Los conflictos de tipo add/add y
  delete/modify no tienen preimagen, así que vuelven siempre en crudo. El
  contador de Ajustes es cuántos guarda de verdad, y **Olvidar todo** lo vacía.

**Ver también:** [Radar de conflictos](conflict-radar.md) · [Fusionar y rebasar](merging.md)
