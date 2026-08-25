---
title: Tareas
category: Herramientas del espacio de trabajo
order: 97
summary: Una lista privada por repositorio, visible desde las pestañas y la barra de estado.
keywords: todo todos tarea tareas lista checklist casilla nota notas recordatorio pendientes prioridad
---

# Tareas

La mitad de las notas que escribe alguien que programa ocupan una línea y viven
una tarde: *renombrar esa variable antes del PR*, *la ruta del fixture está
mal*, *preguntar por el límite de reintentos*. Un gestor de incidencias pesa
demasiado para eso, un archivo de apuntes acaba en un commit por descuido, y un
post-it deja de existir en cuanto cambias de repositorio.

Las tareas son esa lista, pegada al repositorio en el que estás.

![La lista de tareas con una abierta, mostrando sus notas y su prioridad](../../screenshots/todos.webp)

## Dónde viven

En ningún sitio de tu repositorio. Una tarea se guarda con los ajustes del
propio Gitcito, indexada por la ruta del repositorio, y eso tiene tres
consecuencias que conviene conocer:

- **No se hace commit de nada.** No aparece ningún archivo en `git status`, así
  que una tarea nunca puede colarse en un commit ni en un diff.
- **Nadie más la ve.** Es una nota para ti, no un backlog compartido. Si algo es
  del equipo, su sitio es una incidencia.
- **Sigue a la carpeta, no a la rama.** Abre el mismo clon en dos pestañas y
  verás una sola lista. Clona el proyecto otra vez en otro sitio del disco y
  tendrás una lista distinta.

La rama en la que estabas al escribirla se guarda como *contexto* de la tarea y
se ve en su detalle. Es un recordatorio de dónde estabas, no un filtro: las
tareas no desaparecen cuando cambias de rama.

## Escribir una

Abre la lista —el botón ↗ de la cabecera de la sección **Tareas**, el indicador
de la barra de estado, o **Tareas** en la paleta de comandos—, escribe la línea
y pulsa <kbd>Enter</kbd>. La sección de la barra lateral sigue siendo una lista
para leer y marcar; escribir ocurre en un solo sitio.

El orden lo pone la lista: primero lo abierto —prioridad alta por encima de la
normal, y esta por encima de la baja— y, dentro de cada prioridad, lo más
antiguo primero, porque lo que lleva más tiempo ignorado es lo que merece
verse. Lo completado baja al final, con lo último marcado arriba, para que
deshacer un clic equivocado sea inmediato.

## Verlas sin buscarlas

![El anillo en la pestaña, la sección de la barra lateral y el indicador de la barra de estado, en una misma ventana](../../screenshots/todos-markers.webp)

| Marca | Dónde | Qué significa |
|---|---|---|
| Anillo hueco | Junto al nombre de la pestaña, al lado del punto gris de cambios sin commitear | Este repositorio tiene tareas abiertas |
| Indicador <kbd>☑ 3</kbd> | Barra de estado, a la izquierda de la rama | Cuántas están abiertas; amarillo si alguna es de prioridad alta |
| Contador | La cabecera de la sección en la barra lateral | El mismo número, junto a la lista |

Las tres desaparecen cuando llegas a cero. Un «0 tareas» permanente es
mobiliario, y el mobiliario es justo lo que la gente deja de ver.

## El detalle

Haz clic en una tarea —en la barra lateral, en el indicador de la barra de
estado o en **Tareas** desde la paleta de comandos— para abrir la lista completa
con su panel de detalle.

| Campo | Para qué sirve |
|---|---|
| **Título** | La línea. Se edita ahí mismo; no hay botón de guardar. |
| **Notas** | Todo lo que no cabía en el título: por qué importa, qué archivos, qué significa estar hecha. |
| **Prioridad** | Baja, normal o alta. Manda en el orden y en el color del indicador. |
| **Creada / Completada** | Cuándo la escribiste y cuándo la marcaste. |
| **Anotada en** | La rama que estaba activa en ese momento. |

Esa misma vista trae el filtro, el conmutador **Mostrar completadas** y **Borrar
completadas**, que elimina lo marcado para siempre y pregunta antes.

## Lo que a propósito no hace

- **Ni fechas límite, ni recordatorios, ni notificaciones.** Una lista de tareas
  que insiste es un calendario; esta espera a que la mires.
- **Ni sincronización ni compartir.** No sale de tu máquina y no forma parte de
  la exportación de un espacio de trabajo.
- **Ni enlaces a incidencias o commits.** Si una nota merece tanta estructura,
  se le ha quedado pequeña esta lista: abre una [incidencia](hosting.md).
- **Borrar es definitivo.** No hay entrada de deshacer al eliminar una tarea,
  porque git nunca llegó a registrarla.

**Ver también:** [Ajustes por repositorio](repo-settings.md) ·
[Centro de control](mission-control.md)
