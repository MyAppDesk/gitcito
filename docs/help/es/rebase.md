---
title: Rebase interactivo
category: Ramas y cirugía
order: 42
summary: Reordena, squash, fixup, reword, edita o descarta — arrastrando.
keywords: rebase interactivo interactive squash fixup reword drop edit descartar autosquash todo
---

# Rebase interactivo

La lista de tareas de `git rebase -i`, convertida en una lista que puedes
arrastrar.

![El editor de rebase interactivo](../../screenshots/interactive-rebase.webp)

| Acción | Significa |
|---|---|
| **pick** | Dejarlo tal cual |
| **reword** | Conservar el cambio, editar el mensaje |
| **squash** | Fundirlo con el commit de arriba, juntando ambos mensajes |
| **fixup** | Fundirlo con el commit de arriba, descartando este mensaje |
| **edit** | Parar aquí para que puedas enmendarlo |
| **drop** | Tirar el commit a la basura |

Arrastra las filas para reordenar. El editor nunca se abre en un terminal —
Gitcito escribe el todo por ti.

## Autosquash, de un clic

- **Fixup de los cambios preparados en este commit** crea el `fixup!` por ti.
- **Autosquash desde aquí** funde cada `fixup!` / `squash!` con su destino.

Si lo que tienes es un montón de correcciones de revisión en vez de una sola,
[absorb](absorb.md) averigua a qué commit pertenece cada hunk, para que no
tengas que hacerlo tú.

> Hacer rebase reescribe el historial. Todo lo que ya hayas publicado necesitará
> un force-push, y quien lo revisó querrá saber [qué cambió desde
> entonces](range-diff.md).

**Ver también:** [Absorb](absorb.md) · [Qué cambió desde entonces](range-diff.md) · [Recuperación](recovery.md)
