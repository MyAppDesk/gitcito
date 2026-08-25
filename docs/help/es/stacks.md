---
title: Ramas apiladas
category: Ramas y cirugía
order: 43
summary: Cadenas de ramas dependientes — restack en cascada y PRs encadenados con un clic.
keywords: stack stacked apiladas ramas branches graphite restack dependiente cadena padre parent PR por nivel submit enviar autopilot piloto automático retarget redirigir base
---

# Ramas apiladas

Una pila es una cadena de ramas en la que cada una se construye sobre la de
abajo: `main → api → ui`. Revisar tres PR pequeños es mejor que revisar uno
descomunal.

![Una pila de ramas](../../screenshots/branch-stack.webp)

Gitcito lo dibuja como una **ruta**: una rama de inicio arriba y luego una parada
por nivel. El PR de cada parada apunta a la parada de encima, y la primera aterriza
en la rama de inicio. Cada parada muestra sus propios commits, si necesita restack
y, una vez enviada, su número de PR.

## Editar la ruta

**Nada se ejecuta hasta que pulsas Aplicar.** Elegir una rama, mover una parada,
quitarla de la ruta: todo eso edita una lista en pantalla. La operación real
rebasa ramas y las deja activas, y eso no es algo que deba hacer un clic
exploratorio. Cuando la ruta se lea bien, **Aplicar ruta** la ejecuta como un
único paso deshacible; **Descartar** devuelve el dibujo a lo que dice el
repositorio.

La ruta se dibuja en orden de fusión: la rama de arriba se fusiona en la de
abajo, hasta la rama en la que aterriza la pila.

| Control | Qué hace |
|---------|----------|
| El campo **Inicio** | Dónde aterriza la pila. Cámbialo y toda la cadena se reengancha a la rama nueva y se reproduce. |
| El campo de una **parada** | Cambia qué rama ocupa esa posición. La rama que sale se desvincula, nunca se borra. |
| **↑ / ↓** | Mueve una parada un puesto por la ruta. |
| **✕** | Saca la parada de la ruta; sus vecinas se unen. |
| **Añadir parada** | Elige una rama que ya tengas y se une arriba del todo, o escribe un nombre que no exista y se crea sobre la punta de la última parada y se deja activa. |
| El botón de flecha | Cambia a esa parada (checkout). |

Todos los campos son de escritura predictiva: escribe para filtrar, ↑/↓ y Enter
para elegir, y lo que escribas aunque no esté en la lista también vale — así una
referencia remota como `origin/main` sirve de rama de inicio.

Por debajo, todas esas ediciones son la *misma* operación: la ruta entera, de una
vez. Por eso cada gesto es una sola entrada de deshacer (<kbd>⌘Z</kbd>) y no un
rastro de enlaces a medio aplicar.

## Qué cuesta editar la ruta

Todo lo que cambie el orden —un intercambio, un movimiento, otro inicio—
**reproduce** la cadena: los commits propios de cada parada se rebasan sobre su
nueva base. Por eso puede dar **conflictos**, igual que un restack. Dos paradas que tocan las mismas líneas no pueden
intercambiarse sin una persona, y cuando eso pasa **no pasa nada**: la edición
entera se revierte —puntas, enlaces de padre y el rebase a medias— y Gitcito
nombra las dos paradas que chocan. Un desplegable que rozaste no debería dejarte
a mitad de un rebase.

**Restack** es la otra mitad del trato: es un rebase que pediste por su nombre,
así que sí se detiene en el conflicto y te da la vista de conflictos — que es
además la forma de conseguir el reordenamiento que Gitcito rechazó: resuelve ahí
y luego mueve la parada.

Deshacer reproduce la ruta anterior. No resucita los commits antiguos, porque los
nuevos son el mismo trabajo con otros padres.

## Enviar todo

**Enviar todo** empuja cada nivel con `--force-with-lease` y ahí se detiene: es
`gh stack push` sin abrir nada. **Enviar la pila como PRs** hace ese mismo push
y además el trabajo de PR; usa **Enviar todo** cuando quieras las ramas en el
remoto pero aún no la revisión.

## Enviar la pila como PRs encadenados

**Enviar** pregunta antes: cuántos pull requests abrirá, cuántos redirigirá, en
qué remoto y la línea `rama → base` de cada uno — abrir PRs es público y cuesta
deshacerlo. Al terminar, un aviso dice cuántos se abrieron y cuántos se
redirigieron. La sección de navegación que escribe en cada cuerpo es lo que hace
visible la cadena en GitHub, que no tiene concepto de pila.

**Enviar pila como PRs** hace en un clic lo que las herramientas de stacking
cobran:

1. Empuja cada nivel con `--force-with-lease` (las ramas recién creadas lo
   toleran, las reapiladas lo necesitan).
2. Abre un PR para cada nivel que no tenga uno — cada uno **basado en su rama
   padre**, no en `main`, de modo que cada revisión muestra solo sus propios
   commits. El título y la descripción salen de los commits del propio nivel.
3. Redirige la base de cualquier PR existente cuya base se haya desviado.
4. Escribe una **sección de navegación de la pila** en el cuerpo de cada PR,
   para que quien revisa cualquier nivel pueda ver la cadena completa y dónde
   encaja este PR en ella.

La acción es **idempotente**: púlsala tras cada restack, nivel nuevo o PR
fusionado y converge — no se duplica nada, solo se toca lo que se había
desviado.

Cuando el PR de abajo se ha **fusionado**, el mismo botón limpia lo que queda:
el hijo del nivel fusionado se reapunta al tronco, el nivel se desvincula, su
rama local se borra (sin riesgo — el tronco demostradamente la contiene), la
cadena se reapila y todos los PR restantes se redirigen. Fusiona de abajo
arriba, pulsa Enviar, repite.

### En GitHub además se convierte en una pila de verdad

Las bases encadenadas son lo que entiende cualquier host, y en GitLab, Bitbucket
y Azure DevOps son todo lo que hay. GitHub tiene más: desde su preview de
stacked pull requests, una pila es un objeto del servidor. Una vez creados los
PR, Gitcito los registra como pila —de abajo arriba— y obtienes el mapa de la
pila en la UI del PR, un rebase en cascada del lado del servidor y un merge en
el PR de arriba que aterriza todos los niveles de debajo.

Si el repositorio no está en ese preview, o el token no puede gestionar pilas,
la llamada se omite sin ruido: la cadena y su sección de navegación se sostienen
solas, igual que en los demás hosts.

## Restack

Cuando una rama de abajo cambia — has atendido los comentarios de revisión en
`api` — todas las ramas por encima están ahora construidas sobre la base
equivocada. **Restack** rehace la cadena entera en cascada con `rebase --onto`,
de modo que reescribir un padre no duplica sus commits dentro de los hijos.
Después de un restack, pulsa **Enviar** de nuevo: hace force-push de los
niveles reescritos y los PRs se actualizan en su sitio.

## Límites

- El envío es **solo para GitHub** por ahora (la creación funciona en los
  cuatro servicios de hosting, pero redirigir la base y actualizar los cuerpos
  requiere la API de GitHub).
- La limpieza tras fusionar el nivel de abajo ve los merges y los merges por
  rebase por ascendencia, y los merges por **squash** preguntando a GitHub si
  el PR de la rama aterrizó — así que con un token de GitHub todos los estilos
  de merge se limpian. En otros servicios, o sin token, un nivel fusionado con
  squash sigue necesitando desvincularse a mano. Haz fetch primero, además —
  la comprobación de ascendencia lee el tronco tal como estaba en tu último
  fetch.
- La sección de la pila en el cuerpo de un PR se mantiene entre marcadores
  ocultos — tu propia descripción encima de ella se conserva.
- Reordenar y cambiar de tronco **reescriben la historia** en cada nivel que
  tocan. Las ramas son tuyas y los niveles sin publicar no cuestan nada, pero un
  nivel que ya está en revisión recibirá un force-push en el siguiente envío.
- Un nivel solo se mueve una posición cada vez. Dos intercambios son dos rebases,
  y quedarse a medias es un estado legible; un arrastre que aterriza tres
  posiciones más allá no lo es.
- Una parada se **rebasa**, así que la rama en la que aterriza la pila nunca es
  además una parada, y tampoco lo es una rama **protegida** (`main` y `master`
  salvo que cambies la lista). Ambas se rechazan en vez de reescribir en silencio
  historia compartida.
- Antes de abrir nada, el envío pregunta al remoto qué ramas llegaron de verdad
  y nombra las que no. GitHub responde a un head ausente con un escueto
  «Validation Failed», que no le sirve a nadie.
  La rama en la que aterriza la pila también se comprueba: si solo existe en
  local, el envío se ofrece a enviarla y continuar en vez de fallar en el PR de abajo.

## Dónde viven los enlaces

Los enlaces al padre se guardan en la **config de git**, así que viajan con el
repositorio y sobreviven a un reclonado. No hay nada en ningún servicio.

**Ver también:** [Rebase interactivo](rebase.md) · [Hosting y pull requests](hosting.md)
