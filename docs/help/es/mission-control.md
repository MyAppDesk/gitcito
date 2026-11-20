---
title: Centro de control
category: Sincronizar y muchos repos
order: 51
summary: Todos los repositorios del espacio de trabajo en una pantalla, el peor primero.
keywords: centro de control mission control panel dashboard todos los repos resumen estado sucio dirty sin publicar unpushed detrás behind espacio de trabajo workspace
---

# Centro de control

Veinte repositorios, y la pregunta siempre es la misma: ¿cuál me necesita?

El centro de control la responde. Todos los repositorios del **espacio de
trabajo activo** en una pantalla, ordenados por lo que de verdad te reclama:

1. **Bloqueados** — un rebase o un merge a medias, conflictos, un repositorio
   que ni siquiera se puede leer.
2. **Por sincronizar** — commits que traer, y luego commits que publicar.
3. **En curso** — trabajo sin commitear, archivos sin seguimiento.
4. **Limpios** — los tranquilos, abajo del todo, que es donde les toca.

![Todos los repositorios en una pantalla, el peor primero](../../screenshots/mission-control.webp)

## Qué te dice una fila

Cada fila se lee de izquierda a derecha, y las columnas se alinean a lo largo de
la lista, así que los recuentos se comparan como en una tabla:

| Columna | Qué muestra |
|---|---|
| **Repositorio** | Nombre, grupo, la rama y su upstream — o **sin upstream** en ámbar: esa rama nunca se sube por error, pero tampoco se sincroniza |
| **Último commit** | Asunto y autor: lo último que hizo el repositorio, sin abrirlo |
| **Recuentos** | Conflictos · ↓ por bajar · ↑ por subir · preparados · modificados · sin seguimiento · stashes · PR abiertos (si el repo ya está cargado). Pasa el ratón para ver qué cuenta cada uno |
| **Actividad** | Un sparkline de commits de 14 días, y cuántos son |
| **Edades** | Cuánto hace del último commit y del último **fetch** |

Pasa el ratón por el icono de estado para ver por qué la fila está ahí —
"2 por subir · 1 sin commit".

La edad del fetch está porque leer esta página nunca hace fetch: el recuento "por
bajar" es tan reciente como el último fetch. Si una rama con upstream lleva un día
o más sin fetch, o nunca lo hizo, la edad se pone ámbar — haz fetch antes de fiarte
de un 0. La hora sale del propio git, así que un `git fetch` en la terminal también
cuenta.

En una ventana estrecha, la columna del último commit es la primera en irse; los
recuentos se quedan.

Despliega una fila (el chevrón, o <kbd>espacio</kbd>) para ver exactamente qué
commits esperan a ser publicados y qué archivos están sucios.

## Trabajar la lista

- Las píldoras de estado de arriba son **filtros** — haz clic en «3 bloqueados»
  para ver solo esos.
- Ordena por **urgencia**, **nombre** o **actividad**.
- **Marca varios repositorios** para hacerles fetch, o pull solo de los que van
  por detrás (el botón te los cuenta).
- Se refresca solo cada 30 segundos mientras está abierto.

| Tecla | Acción |
|---|---|
| <kbd>↑</kbd> <kbd>↓</kbd> o <kbd>j</kbd> <kbd>k</kbd> | Recorrer la lista |
| <kbd>Enter</kbd> | Abrir ese repositorio |
| <kbd>f</kbd> / <kbd>p</kbd> | Hacerle fetch / pull |
| <kbd>espacio</kbd> | Desplegarlo |
| <kbd>/</kbd> | Saltar al filtro |

## Es una vista, no una pestaña

El indicador junto al nombre del espacio de trabajo lo abre y lo cierra; hacer
clic en cualquier pestaña te devuelve a tu trabajo. Nunca añade una pestaña
propia, y pertenece al espacio en el que estás — cambia de espacio y obtienes el
panel de ese espacio.

Leerlo es **puramente local**: un `git status` por repositorio, sin red, sin
tokens. Abrir el panel no autentica en ningún sitio. El fetch siempre es algo
que has pedido tú.

**Ver también:** [Espacios de trabajo y pestañas](workspaces.md) · [Espacios de trabajo, pestañas y grupos](workspaces.md)
