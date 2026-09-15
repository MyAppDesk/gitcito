---
title: El grafo de commits
category: Repositorio e historial
order: 10
summary: Leer el historial: carriles, refs, columnas, filtros y selección múltiple.
keywords: grafo graph historial commits carriles lanes ramas branches fusiones merges columnas filtro lineal first-parent amend enmendar deshacer undo reset github stash stashes orden colocación spur
---

# El grafo de commits

Ramas, fusiones y fusiones pulpo dibujadas como es debido, en claro o en oscuro.
El renderizado va por ventanas, así que un repositorio con cien mil commits se
desplaza igual que uno con cien.

| | |
|---|---|
| ![Grafo de commits, claro](../../screenshots/graph-light.webp) | ![Grafo de commits, oscuro](../../screenshots/graph-dark.webp) |

## Moverse por él

- <kbd>↑</kbd> <kbd>↓</kbd> (o <kbd>j</kbd> <kbd>k</kbd>) recorren la selección.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+clic mete o saca un commit de una **selección
  múltiple**; <kbd>⇧</kbd>+clic coge un rango. Con varios seleccionados, haz
  clic derecho para hacerles cherry-pick sobre la rama actual, aplastar un tramo
  contiguo, exportar un único parche combinado, o copiar sus SHA.
- Los commits que llegaron en tu **último fetch o pull** se marcan como nuevos.
  Los que aún no están en la rama activa se ven algo translúcidos hasta que un
  pull los incorpora.
- Clic derecho en un commit para **Enmendar**, **Deshacer**, **Restablecer al
  commit…** y **Ver en GitHub**, además de checkout, cherry-pick, revert, rama,
  etiqueta y copiar. Las acciones inseguras siguen visibles y se deshabilitan.

## Que muestre lo que tú quieres

- El **enfoque del grafo** decide cuánto historial se dibuja — Ajustes → Temas →
  **Grafo**, o el menú del engranaje en la cabecera del grafo. *Todo* lo dibuja
  entero; *Historial lineal* (first-parent) deja sólo el tronco; *Ocultar ramas
  fusionadas* deja el tronco más las ramas aún sin fusionar; *Modo solo* deja tu
  rama, tus ramas favoritas y la rama por defecto.

  Sólo filtra lo que el log ya ha cargado. *Ocultar ramas fusionadas* se fía de
  la respuesta de git a «ya está contenida en la rama actual», así que cambiar de
  rama cambia lo que esconde — y conserva todo commit al que aún apunte una
  etiqueta o una ref que no reconozca, que es justo lo que deja atrás una rama
  borrada. *Historial lineal* y *Modo solo* son más bruscos: una etiqueta o un
  stash que vivan en un commit que ocultan se van con él.

- **Filtrar por ruta**: clic derecho en un archivo o carpeta → *Filtrar el grafo
  por esta ruta*, y sólo se quedan encendidos los commits que la tocaron.

![El grafo filtrado a una sola ruta](../../screenshots/graph-path-filter.webp)

- **Columnas**: muestra, esconde, redimensiona y reordena las columnas de rama,
  mensaje, autoría, fecha, SHA, firma y despliegue.
- **Estilo**: Ajustes → Temas → **Grafo** — paleta de carriles (8 integradas,
  personalizada o generada por IA), estilo de las esquinas, densidad de filas y
  grosor de línea, con una vista previa en miniatura en vivo.

![Ajustes de estilo del grafo con vista previa en vivo](../../screenshots/settings-graph.webp)

## Dónde se sientan los stashes

Un stash se dibuja como una fila propia, colgando del commit del que se tomó
en un espolón discontinuo para no desplazar el tronco. Va en la fila
**justo encima de ese commit padre**, no en el hueco que le tocaría por su
propia marca de tiempo.

Su marca es una caja de archivo en un marco de puntos — el mismo símbolo de
archivo que usan la lista de stashes, la paleta de comandos y la cabecera de
detalles, para que el grafo nombre un stash como el resto de la app. El marco
de puntos es lo que lo separa de un commit: al sentarse una fila por encima
de su padre, la forma tiene que decir «esto no forma parte de la rama».

Un stash casi siempre es más reciente que el commit sobre el que se sienta,
así que ordenar por fecha lo subiría entre commits que no tienen nada que ver
y estiraría el cable a lo ancho de medio grafo. El padre es la única fila con
la que un stash se relaciona de verdad, así que se queda al lado.

El límite: un stash cuyo commit padre no está en la ventana cargada — podado,
o más allá del final del log — no tiene ancla, y vuelve al orden por fecha
hasta que el padre cargue. Los modos *Historial lineal* y *Modo solo* tiran
un stash cuyo padre tiran, como se dijo más arriba.

## Detalles del commit

Al seleccionar un commit se ven sus archivos modificados (en árbol o en plano),
la autoría, el SHA, los coautores y su firma. Las referencias `#123` y las
`@menciones` se enlazan automáticamente a tu hosting.

La lista de archivos se selecciona en grupo con los gestos habituales (clic con
<kbd>⌘</kbd>/<kbd>Ctrl</kbd>, clic con <kbd>⇧</kbd>,
<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd>). Clic derecho sobre la selección →
*Restaurar {n} archivos al árbol de trabajo* toma esos archivos exactamente
como estaban en este commit: tras una única confirmación sobrescribe las copias
de trabajo, sin tocar HEAD ni el índice.

![Recorriendo los detalles de un commit](../../screenshots/clip-commit-details.webp)

**Ver también:** [Blame e historial de archivo](blame.md) · [Búsqueda](search.md) · [Máquina del tiempo](time-machine.md)
