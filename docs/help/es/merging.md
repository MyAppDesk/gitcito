---
title: Fusionar y rebasar
category: Ramas y cirugía
order: 41
summary: Fusiona, rebasa, compara refs y arrastra una ref sobre otra en la barra lateral o en el grafo.
keywords: merge fusionar fusión rebase rebasar fast-forward comparar refs arrastrar soltar rama grafo insignia badge tag etiqueta remoto revert reset cherry-pick amend enmendar deshacer undo github
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

El cherry-pick y el revert viven en el menú contextual del grafo, como siempre.
**Reset** es una sola entrada — **Restablecer al commit…** — en lugar de tres
elementos crudos soft/mixed/hard que se contradecían entre sí.

Enmendar, deshacer y restablecer están en lo alto del menú de un solo commit y
siguen **visibles cuando no son seguros**: se deshabilitan, con un tooltip que
dice por qué. Deshacer es solo para un HEAD sin enviar; enmendar también se
permite sobre un HEAD publicado, pero avisa de que hará falta un force push.
Restablecer solo alcanza a los ancestros locales más el primer commit
publicado — no a historia arbitrariamente más antigua.

El diálogo de reset hace explícito el modo:

![El diálogo Restablecer al commit, con los tres modos explicados](../../screenshots/reset-to-commit.webp)

| Modo | Resultado |
|------|--------|
| **Soft** | Conserva los cambios en el área de stage |
| **Mixed** | Conserva los cambios sin preparar |
| **Hard** | Descarta los commits y sus cambios |

Hard nunca viene preseleccionado. Un árbol de trabajo sucio recibe un aviso
extra, porque restablecer puede sobrescribir trabajo en curso o entrar en
conflicto con él. **Ver en GitHub** vive junto a las acciones de copiar y solo
se abre para commits publicados en un remoto de github.com.

Selecciona varios commits primero y el cherry-pick aplica la selección entera, en
orden.

## Antes de fusionar nada

El [radar de conflictos](conflict-radar.md) analiza cada rama contra una base y
te dice cuáles van a pelearse, sin hacer checkout de nada.

**Ver también:** [Rebase interactivo](rebase.md) · [Ramas apiladas](stacks.md) · [Radar de conflictos](conflict-radar.md)
