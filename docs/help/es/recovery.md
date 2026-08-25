---
title: Recuperación y el reflog
category: Recuperación y seguridad
order: 60
summary: La red de seguridad: reflog, instantáneas WIP y bisect.
keywords: reflog recuperación deshacer undo commits perdidos instantáneas snapshots wip guardián guard sin seguimiento untracked descartar discard limpiar clean bisect bisect run script automatizado código de salida exit code restaurar hard reset
---

# Recuperación y el reflog

Git casi nunca pierde nada. Lo difícil es volver a encontrarlo.

## Reflog

Cada movimiento de `HEAD` — y de cada rama — con lo que lo provocó: checkout,
reset, rebase, amend, un fetch forzado. Desde cualquier entrada pasada puedes
**hacer checkout**, **crear una rama desde ahí** o **hacer un hard reset a ese
punto**.

![El visor del reflog](../../screenshots/reflog.webp)

Este es el botón de "acabo de resetear la rama equivocada".

## Instantáneas WIP

El trabajo sin commitear es lo único que el reflog no puede salvar, así que
Gitcito le hace instantáneas: el **árbol de trabajo entero — archivos
modificados, preparados y sin seguimiento** — commiteado a través de un índice
desechable y fijado bajo `refs/gitcito/wip`. Ni tu índice real ni tu lista de
stashes se tocan.

![Instantáneas WIP](../../screenshots/snapshots.webp)

Tres cosas toman una:

| Disparador | Cuándo |
|---------|------|
| **Guardián** | Automáticamente, justo antes de una acción destructiva — descartar, limpiar, hard reset, restaurar desde un commit. Activado por defecto; se puede conmutar en el diálogo de instantáneas. |
| **Temporizador** | Cada 5 / 15 / 30 minutos mientras el repositorio esté abierto. |
| **A mano** | El botón **Instantánea ahora**. |

El guardián es el que importa: el momento en que el trabajo suele perderse para
siempre es el segundo después de un descarte que no querías. Con el guardián
activado, ese estado es una instantánea — abre la lista, pulsa restaurar,
respira de nuevo.

Selecciona una instantánea para ver los archivos que capturó, previsualizar el
cambio de cualquier archivo y restaurar un **solo archivo** o el árbol entero.
Restaurar copia archivos de la instantánea sobre las copias actuales — antes se
toma una instantánea del guardián, así que una restauración también se puede
deshacer.

**Límites que conviene conocer.** Un tick del temporizador o del guardián que no
encuentra nada nuevo no registra nada. Restaurar sobrescribe y recrea archivos,
pero nunca borra un archivo que creaste después de la instantánea. Los archivos
ignorados no se capturan. Las instantáneas son refs ocultas locales: nunca se
pushean, están a salvo de `git gc`, y se conservan las 50 más recientes.

## Bisect guiado

Marca commits como buenos y malos, mira cómo se estrecha el rango, aterriza en el
primer commit malo. Gitcito lleva la cuenta de cuántos pasos quedan, así que
sabes si estás a dos preguntas de la respuesta o a diez.

![Bisect guiado](../../screenshots/bisect.webp)

### Que decida un comando

Una vez sembrado el rango, **Que decida un comando** le entrega la búsqueda
entera a `git bisect run`. Git hace checkout de cada candidato, ejecuta tu
comando y lee su código de salida:

| Código de salida | Significa |
|-----------|-------|
| `0` | Bueno — el fallo no está aquí |
| `125` | No se puede probar este; sáltatelo |
| cualquier otro | Malo |

Una suite de tests ya habla ese idioma, y por eso `npm test` suele ser la
respuesta completa. Gitcito ofrece los propios scripts de este proyecto para
rellenarlo en un clic, transmite la salida mientras corre y aterriza en el primer
commit malo sin que respondas ni una sola pregunta.

![La caja de comando, lista para entregar la búsqueda a una suite de tests](../../screenshots/bisect-run.webp)

**A qué prestar atención.** El comando se ejecuta en *cada* commit que git prueba,
así que un comando que despliega, publica o escribe fuera del repositorio lo hará
varias veces. Que se limite a leer e informar. **Parar** corta la ejecución y deja
la sesión abierta, para que sigas marcando a mano; **Abortar** termina el bisect
del todo.

Un comando que falla por un motivo ajeno — una dependencia que falta en ese punto
de la historia, por ejemplo — marca un commit bueno como malo y manda la búsqueda
al sitio equivocado. Salir con `125` desde un script envoltorio es la salida que
git da para eso.

## Un archivo de bloqueo olvidado

Git crea un archivo `.lock` junto a lo que va a escribir y lo borra cuando la
escritura termina. Un proceso que muere sosteniendo uno —un editor que se cae,
una terminal cerrada durante `git commit`, un fetch matado mientras podaba
referencias remotas— deja el bloqueo ahí, y a partir de entonces toda escritura
falla con la misma línea:

```
error: could not delete references: cannot lock ref 'refs/remotes/origin/x':
Unable to create '…/refs/remotes/origin/x.lock': File exists.
```

El repositorio no está dañado. Simplemente hay un archivo en medio.

Gitcito reintenta unas cuantas veces primero, porque un bloqueo en manos de un
git *en marcha* suele liberarse en milisegundos. Cuando no ocurre, el fallo abre
un diálogo en lugar de un muro de texto: todos los bloqueos que siguen en disco,
la antigüedad de cada uno y un botón que los elimina y reintenta la acción que
había fallado.

**La antigüedad es todo el argumento.** Un bloqueo de menos de 30 segundos se
presume de un git que sigue trabajando, y Gitcito se niega a borrarlo: ofrece
esperar y reintentar. Los más viejos sí se ofrecen para eliminar, del más
antiguo al más reciente, y el diálogo dice sin rodeos qué comprobar antes de
aceptar: que ningún editor, terminal u otro cliente de Git esté trabajando ahora
mismo en este repositorio. Borrar un bloqueo bajo una escritura viva es como se
rompe un índice.

El barrido cubre el directorio git del repositorio y su directorio común, así
que también encuentra los bloqueos de un worktree enlazado. Los submódulos se
saltan: pertenecen a otro repositorio y se limpian abriéndolo.

## Deshacer / rehacer

La mayoría de las operaciones apilan una entrada en una pila de deshacer, así que
<kbd>⌘Z</kbd> revierte la última siempre que git lo permita.

**Ver también:** [Qué ha cambiado desde](range-diff.md) · [Stashes](stashes.md)
