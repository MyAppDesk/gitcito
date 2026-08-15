---
title: Recuperación y el reflog
category: Recuperación y seguridad
order: 60
summary: La red de seguridad: reflog, instantáneas WIP y bisect.
keywords: reflog recuperación deshacer undo commits perdidos instantáneas snapshots wip bisect bisect run script automatizado código de salida exit code restaurar hard reset
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
Gitcito le hace instantáneas: tus cambios seguidos más el índice preparado,
capturados como un commit de `git stash create` fijado bajo `refs/gitcito/wip`.

![Instantáneas WIP](../../screenshots/snapshots.webp)

- **Nunca toca tu árbol de trabajo** y **nunca aparece en tu lista de stashes**
  — es una ref oculta, no un stash.
- Haz una a mano, o déjala correr cada **5 / 15 / 30 minutos**.
- Restaura o borra cualquier instantánea desde la lista.

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

## Deshacer / rehacer

La mayoría de las operaciones apilan una entrada en una pila de deshacer, así que
<kbd>⌘Z</kbd> revierte la última siempre que git lo permita.

**Ver también:** [Qué ha cambiado desde](range-diff.md) · [Stashes](stashes.md)
