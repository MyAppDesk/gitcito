---
title: Traer, hacer pull y hacer push
category: Sincronizar y muchos repos
order: 50
summary: Mantenerte al día, con guardias en las operaciones que muerden.
keywords: fetch traer pull push publicar force forzar auto-fetch prune podar remotos upstream rama protegida varios remotos fork mirror espejo push tags etiquetas all
---

# Traer, hacer pull y hacer push

## Pull

Tres modos, elegidos desde el desplegable: **por defecto**, **solo
fast-forward** o **rebase**. Los cambios locales se guardan en un stash y se
restauran automáticamente alrededor del pull, así que un árbol sucio no te
bloquea.

## Push

Los force push usan siempre `--force-with-lease` — la variante segura, que se
niega si el remoto se movió desde la última vez que miraste. Hacer force push
sobre una **rama protegida** pide confirmación (la lista está en el engranaje de
ajustes del repositorio).

![La confirmación que exige una rama protegida antes de un force push](../../screenshots/force-push-guard.webp)

### Más de un remoto

El botón **Push** apunta al upstream de la rama. La flecha de al lado ofrece
además, en cuanto un repositorio tiene más de un remoto:

| | |
|---|---|
| **Push a un remoto** | Elige un solo remoto — un fork, un espejo, un destino de despliegue |
| **Push a los N remotos** | Un push por remoto, en orden |
| **Push de todas las etiquetas a** | `git push <remote> --tags`, todas las etiquetas locales de golpe |

Las mismas dos acciones están en la fila de cada remoto en la barra lateral, que
suele ser donde estás cuando surge la pregunta.

**Un rechazo no cancela el resto.** Publicar en un fork y en su upstream es
exactamente el caso en el que un lado se niega y el otro debería salir igual, así
que cada remoto informa por separado: los que funcionan se nombran en un solo
aviso, y cada fallo tiene el suyo con el motivo que da git.

Solo el **primer** remoto de la lista fija el upstream de la rama. Una rama tiene
un upstream, y el último remoto al que has hecho push no es automáticamente el
que quieres que siga.

Los dos caminos pasan las mismas comprobaciones que un push normal — la
confirmación de rama protegida y el [guardia de secretos](security.md). Publicar
en dos remotos es el doble de exposición, no la mitad de precaución.

## Ramas en las que no estás

`git pull` sólo mueve HEAD, y por eso casi todos los clientes te obligan a hacer
checkout de una rama antes de poder ponerla al día. Gitcito no: haz clic derecho
en cualquier rama local —en la barra lateral o en su etiqueta del
[grafo](graph.md)— y tendrás **Pull de \<rama\>** y **Push de \<rama\>**, ambos
sobre *esa* rama y no sobre la que tienes en checkout.

| | |
|---|---|
| **Pull de `<rama>`** | Adelanta la referencia local hasta su upstream, sin checkout. El árbol de trabajo no se toca. **Deshacible con ⌘Z**: el undo devuelve la rama donde estaba. |
| **Push de `<rama>`** | Un push normal de esa rama, con las mismas protecciones de rama protegida y de [secretos](security.md) que el botón de la barra. |

El pull queda deshabilitado en una rama que no sigue nada: no hay de dónde
traer. En la rama en la que *sí* estás, ambos caen en el pull normal, que además
actualiza el árbol de trabajo.

**El límite que conviene saber:** una rama que ha **divergido** de su upstream se
rechaza, con un mensaje que lo dice. Reconciliar una divergencia es un merge o un
rebase, y ambos necesitan árbol de trabajo, así que ese caso sí te cuesta un
checkout. Forzar el push de una rama en la que no estás se ofrece cuando el
remoto rechaza el push; la ruta de "pull y reintento" no, por el mismo motivo.

## Fetch

**Traer todo y podar** en todos los remotos, más el **auto-fetch** en segundo
plano con el intervalo que tú fijes (Ajustes → General) y una insignia de
"traído hace X" en la barra de herramientas.

Un fetch que encuentra **historial reescrito** lo dice: un aviso nombra la rama, y
su fila gana un marcador que abre [qué ha cambiado desde](range-diff.md)
exactamente en el commit al que apuntaba antes.

## Muchos repositorios a la vez

- Una pestaña de grupo puede hacer **Traer todo / Pull en todo** sobre su
  subárbol entero.
- El [centro de control](mission-control.md) lo hace en todo el espacio de
  trabajo, y puede hacer pull *solo* en los repositorios que están realmente
  atrasados.

## Remotos

Añade, edita, elimina y trae remotos individuales desde la barra lateral. Las
filas de rama llevan insignias de presencia por remoto, así que ves de un vistazo
qué remotos tienen una copia de una rama.

**Ver también:** [Centro de control](mission-control.md) · [Hosting y pull requests](hosting.md)
