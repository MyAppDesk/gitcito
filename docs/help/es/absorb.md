---
title: Absorber
category: Trabajar con cambios
order: 33
summary: Manda cada arreglo preparado de vuelta al commit que introdujo la línea.
keywords: absorb absorber fixup autosquash amend staged preparado hunks blame revision correcciones arreglos
---

# Absorber

Has arreglado tres comentarios de revisión repartidos por tres archivos. Lo
honesto son tres commits `fixup!` apuntando a los padres correctos. Lo que la
gente hace en realidad es un único commit llamado "review fixes".

Absorber hace lo honesto por ti.

![Absorber enrutando cada hunk preparado al commit que lo introdujo](../../screenshots/absorb.webp)

## Cómo funciona

1. Prepara los arreglos.
2. Herramientas → **Absorber cambios preparados…** (o <kbd>⌘K</kbd>).
3. Gitcito hace blame de las líneas que toca cada hunk preparado, averigua cuál
   de **tus commits sin publicar** las introdujo, y te enseña el plan antes de
   hacer nada.

El plan lista cada commit destino con los hunks que van hacia él, más un grupo
**Todavía no pertenece a nada** — un archivo recién creado no tiene historial en
el que absorberse, así que se queda preparado para que hagas commit de la forma
habitual.

| Botón | Qué pasa |
|---|---|
| **Crear fixups** | Un commit `fixup!` por destino. No se hace rebase de nada. |
| **Crear fixups y hacer rebase** | Lo mismo, y luego un rebase con autosquash los pliega dentro. |

## Las reglas que respeta

- **Sólo los commits sin publicar son candidatos.** Lo que ya está publicado no
  es nuestro para reescribirlo. Si todo está publicado, absorber te lo dice y no
  hace nada.
- **Nunca se toca el árbol de trabajo.** Sólo el índice y los commits que crea
  el propio absorber.
- **Un fallo no deja estropicio.** Si algún paso falla, HEAD y el índice se
  dejan exactamente como estaban.
- Se niega a ejecutarse durante un merge o un rebase — ese índice es de git.

**Ver también:** [Rebase interactivo](rebase.md) · [Preparación](staging.md)
