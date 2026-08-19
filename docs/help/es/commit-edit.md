---
title: Edita cualquier commit
category: Ramas y cirugía
order: 46
summary: Reescribe los archivos o el mensaje de un commit histórico en el sitio — con la cascada previsualizada primero.
keywords: editar commit edit reescribir historia rewrite history amend pasado reword corregir errata typo cascada cascade replay rebase in place cirugía surgery
---

# Edita cualquier commit

La errata está en un commit de hace tres semanas. El arreglo habitual es un
rebase interactivo: parar en el commit, editar, continuar, rezar. El arreglo de
Gitcito es: clic derecho en el commit, **Editar este commit**, cambiar el
texto, listo. El botón del lápiz en el panel de detalles del commit abre el
mismo editor.

![Editando un commit histórico](../../screenshots/commit-edit.webp)

## Qué hace

Elige cualquier commit en un camino lineal hasta `HEAD`. El modal muestra sus
archivos y su mensaje; edita cualquiera de los dos. A partir de ahí pasan dos
cosas:

1. **Previsualizar la cascada** reproduce cada commit por encima del editado
   *en memoria* (una cadena de cherry-picks con `merge-tree` — sin checkout,
   sin árbol de trabajo, sin refs). Cada descendiente aparece en verde o en
   rojo, así que sabes **antes de que nada se mueva** si la edición se propaga
   limpiamente o choca con un cambio posterior.
2. **Reescribir la historia** lo hace de verdad: la misma cadena se construye
   con plumbing y después la rama se mueve con `reset --keep` — tus cambios
   sin commitear se arrastran, o el reset aborta y no ha pasado nada. Antes se
   toma una [instantánea guardián](recovery.md), y deshacer restaura la cadena
   antigua.

La autoría y las fechas de cada commit reproducido se conservan; solo cambian
los hashes — eso es lo que significa reescribir la historia.

## Cuando la cascada da conflicto

Un commit posterior tocó las mismas líneas que estás editando. La
previsualización marca ese commit en rojo con los archivos en conflicto y la
reescritura se niega a ejecutarse — nada queda aplicado a medias, nunca. O
editas de otra forma, o afrontas el conflicto de cara con un
[rebase interactivo](rebase.md).

## Límites

- **Solo historia lineal.** Un merge entre el commit y `HEAD` desactiva la
  edición — reproducir merges es un problema distinto y más difícil.
- Los archivos binarios y los que superan 2 MB se muestran pero no se pueden
  editar.
- Un commit que ya está en un remoto se puede editar, pero tu siguiente push
  tendrá que ser un **force push** — el modal avisa antes de que te
  comprometas a eso.
- Los archivos eliminados en el commit no se pueden editar (no hay contenido
  que editar).

**Ver también:** [Rebase interactivo](rebase.md) · [Recuperación y el reflog](recovery.md) · [Absorber](absorb.md)
