---
title: Fusionar y rebasar
category: Ramas y cirugía
order: 41
summary: Fusiona, rebasa, compara refs y arrastra una ref sobre otra en la barra lateral o en el grafo.
keywords: merge fusionar fusión rebase rebasar fast-forward comparar refs arrastrar soltar rama grafo insignia badge tag etiqueta remoto revert reset cherry-pick
---

# Fusionar y rebasar

## Desde la barra lateral

Haz clic derecho en una rama para **Fusionar en la actual** o **Rebasar sobre**
— o **Fusionar con opciones…** cuando la fusión normal es justo la que sale mal
una y otra vez; mira [opciones de merge](merge-options.md).

## Arrastra una ref sobre otra

El gesto más rápido de la aplicación: coge una rama y suéltala sobre otra.
Gitcito abre un menú pequeño con lo que ese gesto podría significar, y no hace
nada hasta que elijas.

![Arrastrar una rama sobre otra abre el menú de lo que puede significar el gesto](../../screenshots/clip-branch-drop.webp)

Funciona en **los dos** sitios donde se muestran refs — las filas de ramas,
remotos y etiquetas de la barra lateral, y las **insignias de ref de colores del
grafo** mismo. Arrastra entre ellos en cualquier combinación; el destino se
resalta mientras pasas por encima.

| Soltar | Significa |
|------|-------|
| **Merge {origen} → {destino}** | Hace checkout del destino y fusiona el origen en él |
| **Rebase {origen} sobre {destino}** | Repite los commits del origen encima del destino |
| **Comparar** | Abre la [comparación](#comparar-dos-refs-cualesquiera) — no cambia nada |

**El menú solo ofrece lo que git puede hacer.** Fusionar hace un commit sobre el
destino, así que el destino tiene que ser una rama local — no puedes fusionar en
una etiqueta ni en una ref de seguimiento remoto. Rebasar reescribe el origen,
así que el origen tiene que ser una rama local. Suelta una etiqueta sobre una
rama remota y lo único que se te ofrece es *Comparar*, porque es sinceramente
todo lo que hay.

El rebase pide confirmación antes: le da un hash nuevo a cada commit repetido, lo
que significa un force push si la rama ya está publicada. La fusión no pregunta
— solo añade. En cualquier caso, un solo **Deshacer** te devuelve.

## Merge

Fast-forward cuando se puede, o fuerza un commit de fusión cuando quieres dejar
la topología registrada. Si hay conflicto, aterrizas en
[el resolutor](conflicts.md).

## Comparar dos refs cualesquiera

Elige una ref base y una de comparación — rama, etiqueta o SHA en crudo, con un
botón para intercambiarlas — y obtienes los contadores de adelanto/retraso, los
commits exclusivos de cada lado, el diff combinado completo y un traspaso en un
clic para **abrir una PR**.

![Comparar dos ramas: lo exclusivo de cada lado y el diff combinado](../../screenshots/branch-compare.webp)

Se llega desde la barra lateral (comparar con la rama actual), desde el menú
Herramientas o con <kbd>⌘K</kbd>.

## Cherry-pick, revert, reset

Los tres desde el menú contextual del grafo. El reset ofrece **soft / mixed /
hard** y deja claro qué le hace cada uno a tu árbol de trabajo antes de que
elijas.

Selecciona varios commits primero y el cherry-pick aplica la selección entera, en
orden.

## Antes de fusionar nada

El [radar de conflictos](conflict-radar.md) analiza cada rama contra una base y
te dice cuáles van a pelearse, sin hacer checkout de nada.

**Ver también:** [Rebase interactivo](rebase.md) · [Ramas apiladas](stacks.md) · [Radar de conflictos](conflict-radar.md)
