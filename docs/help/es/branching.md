---
title: Ramas, remotos y la barra lateral
category: Ramas y cirugía
order: 40
summary: Todo lo que hace la barra lateral izquierda, y las ramas fijadas.
keywords: rama ramas branch branches crear checkout renombrar borrar remoto fijada pinned barra lateral sidebar presencia
---

# Ramas, remotos y la barra lateral

Una única barra lateral, reordenable y con búsqueda, contiene **ramas, remotos,
etiquetas, stashes, worktrees y submódulos**. Cada sección se puede esconder o
reordenar (Ajustes → Disposición), y la caja de filtro se aplica a todas.
Qué secciones y carpetas dejas abiertas o cerradas se recuerda por repositorio,
incluso tras reiniciar.

![La barra lateral, con las ramas fijadas arriba del todo](../../screenshots/pinned-branches.webp)

## Ramas

Crea, haz checkout, renombra y borra — en local y en el remoto. Las filas de
rama muestran:

- **↑por delante / ↓por detrás** respecto a su upstream,
- **insignias de presencia por remoto** (qué remotos tienen esta rama),
- un **punto de riesgo** tras un escaneo del [radar de conflictos](conflict-radar.md),
- un **marcador ⟳** cuando el remoto [reescribió el historial](range-diff.md).

Las ramas con `/` en el nombre se pliegan en carpetas plegables automáticamente.
Haz clic derecho en la cabecera de una carpeta para actuar sobre el grupo
entero: *Eliminar todas las ramas bajo `feature` (4 ramas)* borra todo lo que
contiene tras una única confirmación que lista exactamente qué ramas se van —
la rama en la que estás queda excluida. El mismo menú existe en las carpetas de
ramas remotas, borrando del remoto en su lugar.

El desplegable de ramas de la barra de herramientas lista las ramas locales
y remotas. Haz clic derecho en cualquier rama de ese desplegable para
renombrar una rama local, copiar su nombre, abrirla en un nuevo worktree,
fusionarla en la rama activa o eliminarla. Las ramas remotas omiten el
renombrado y se eliminan de su remoto tras una confirmación. Gitcito omite
la fusión cuando la referencia seleccionada ya está contenida en la rama
activa, y desactiva la creación del worktree cuando esa rama ya está extraída.

![Acciones de rama local en el desplegable de la barra de herramientas](../../screenshots/branch-dropdown-local-context-menu.webp)

![Acciones de rama remota en el desplegable de la barra de herramientas](../../screenshots/branch-dropdown-remote-context-menu.webp)

Las filas se seleccionan en grupo como los archivos: clic con <kbd>⌘/Ctrl</kbd>
alterna una fila, clic con <kbd>Mayús</kbd> selecciona un rango, y
<kbd>Mayús</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> amplía la selección desde la última
fila en la que hiciste clic. Haz clic derecho sobre la selección para el menú
en bloque — *Eliminar 4 ramas* — que confirma con la lista completa. Los mismos
gestos funcionan en ramas remotas, etiquetas y stashes.

![Nombres de rama separados por barras plegados en un árbol](../../screenshots/branch-grouping.webp)

## Ramas fijadas

Marca con una estrella las ramas a las que vuelves una y otra vez — pasa el
ratón por la fila y pulsa ★, o clic derecho → *Fijar rama*. Aparecen en un grupo
**Fijadas** arriba de la sección Local, recordado por repositorio, sin dejar de
estar en su sitio habitual más abajo.

## Hacer checkout de una rama remota

Haz doble clic en una rama remota para crear la local que la sigue. Si ya existe
una rama local con ese nombre y ha **divergido**, Gitcito pregunta cómo
reconciliarla — rebase, merge o reset — y ofrece hacer antes una copia de
seguridad de la rama.

![El diálogo de rama divergida: rebase, merge o reset, con opción de copia de seguridad](../../screenshots/diverged-checkout.webp)

### Cuando tu rama local está por detrás

Se avanza (fast-forward) hasta la punta del remoto como parte del checkout. Si
el árbol de trabajo está sucio, se guarda en un stash con nombre y se restaura
después, para que tus ediciones locales no aborten la actualización.

### Cuando tu rama local está por delante

Si la rama local va por delante y el remoto no tiene nada nuevo, hacer checkout
respondería a una petición de la rama *remota* con tu propio trabajo sin subir —
así que no se cambia de rama hasta que digas a qué lado te referías:

| Opción | Qué ocurre |
|--------|------------|
| Cambiar a la local | Cambia a la rama local con los commits intactos. Lo que cualquier otro cliente hace en silencio. |
| Reset (soft) | Devuelve la rama a la punta del remoto; los cambios de esos commits quedan **preparados**, listos para volver a commitear. |
| Reset (mixed) | El mismo movimiento, con los cambios **sin preparar** en el árbol de trabajo. |
| Reset (hard) | Descarta los commits *y* sus cambios. |

![El diálogo de rama por delante: cambiar a la local, o reset soft, mixed o hard](../../screenshots/ahead-checkout.webp)

Deja marcado *Crear primero una rama de respaldo* y la punta local se guarda como
`backup/<rama>-<marca-de-tiempo>` antes de mover nada, de modo que incluso un
reset hard queda a un checkout de distancia de deshacerse. El reset también entra
en la pila de deshacer (⌘Z), pero solo hasta que cierres el repositorio — la rama
de respaldo dura más.

**Límites:** el diálogo solo compara la rama con la referencia de seguimiento
recién obtenida, así que un remoto que rechazó el fetch (sin conexión,
credenciales incorrectas) se compara con la última punta conocida. No dice nada
sobre si tus commits son *buenos*: solo que existen aquí y no allí.

**Ver también:** [Fusionar y rebasar](merging.md) · [Worktrees](worktrees.md)
