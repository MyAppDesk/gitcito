---
title: Radar de conflictos
category: Ramas y cirugía
order: 44
summary: Ve qué ramas van a dar conflicto antes de fusionar ninguna.
keywords: radar de conflictos conflict radar previsualizar merge preview choque riesgo ramas branches merge-tree
---

# Radar de conflictos

Descubrir que una rama da conflicto fusionándola es una forma cara de hacer una
pregunta. El radar la responde antes.

Gitcito fusiona cada rama contra una base que tú eliges **dentro de la base de
datos de objetos** (`git merge-tree --write-tree`). Sin checkout, sin tocar el
índice, sin tocar el árbol de trabajo, sin nada que limpiar después. Tu trabajo
sin commitear puede quedarse exactamente donde está mientras corre el escaneo.

![El radar, un veredicto por rama](../../screenshots/conflict-radar.webp)

![Escaneando rama a rama, y abriendo después los archivos en disputa](../../screenshots/clip-conflict-radar.webp)

## Cómo se usa

Ábrelo desde el menú de herramientas, con <kbd>⌘K</kbd> → *Radar de
conflictos*, o haz clic derecho en una rama para escanearlo todo contra **esa**
rama.

Escanea nada más abrirse, usando tu rama actual como base.

| Veredicto | Qué significa |
|---|---|
| **Dará conflicto** | Fusionarla requiere manos. Se listan las rutas exactas. |
| **Fusiona limpio** | Se aplicaría sin pelea. |
| **Ya está dentro** | La base ya la contiene — no hay nada que fusionar. |
| **Falló** | Git se negó: historiales sin relación, referencia inexistente. Se muestra el motivo. |

Las ramas se ordenan de peor a mejor, y la peor de todas — la que toca más
archivos — sube arriba del todo.

## Archivos en disputa

Debajo, **Archivos en disputa** ordena las rutas por cuántas ramas las están
reescribiendo. Dos ramas peleándose por un archivo es una conversación que
tener ya; cinco es un problema de diseño.

## Después de un escaneo

Las filas de rama de la barra lateral llevan un punto de color: rojo dará
conflicto, verde está limpia, ámbar es una rama que git rechazó. Las ramas que
la base ya contiene no llevan punto — una hilera de puntos grises sobre todo lo
que ya está fusionado es solo ruido.

> Escanear no cambia nada. `git status` sigue limpio y HEAD no se mueve.

**Ver también:** [Qué ha cambiado desde](range-diff.md) · [Fusionar y rebasar](merging.md)
