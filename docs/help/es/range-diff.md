---
title: Qué ha cambiado desde
category: Leer cambios
order: 23
summary: Alguien ha hecho force-push a la rama que revisaste. Mira qué cambió de verdad.
keywords: range-diff force push rebase reescrito revision interdiff reflog actualizacion forzada rama
---

# Qué ha cambiado desde

Revisaste una rama. Alguien le hizo rebase y force-push. Un diff normal ya no
sirve de nada: después de un rebase cada commit es un commit nuevo, así que todo
parece nuevo.

`git range-diff` empareja las dos versiones commit a commit, y Gitcito lee las
posiciones antiguas directamente del **reflog** — así que no hubo que registrar
nada por adelantado para que esto funcione.

![Commits reescritos, nuevos y descartados tras un force-push](../../screenshots/range-diff.webp)

| Veredicto | Significado |
|---|---|
| **Reescrito** | El mismo commit, cambiado. Despliégalo para ver el interdiff — el retoque del mensaje y la comprobación extra, no el archivo entero. |
| **Nuevo** | Añadido desde que lo miraste. |
| **Descartado** | Desaparecido desde que lo miraste. |
| **Sin cambios** | Sobrevivió intacto a la reescritura. |

## Cómo llegar aquí

- **Un fetch que encuentra historial reescrito te lo dice.** Un aviso nombra la
  rama, y su fila bajo Remotos gana un **⟳** que puedes pulsar para abrir la
  comparación exactamente en el commit al que apuntaba antes.
- Clic derecho en cualquier rama → *Qué ha cambiado desde…*
- <kbd>⌘K</kbd> → *Qué ha cambiado desde*

## Posiciones anteriores

Las fichas bajo los campos de refs son el reflog de la rama: actualizaciones
forzadas, rebases, resets, cada una con cuándo ocurrió. Elige una y la
comparación se vuelve a ejecutar contra ella. Eso es toda la funcionalidad — el
historial de por dónde ha pasado una rama ya está en tu disco.

**Ver también:** [Radar de conflictos](conflict-radar.md) · [Recuperación y reflog](recovery.md)
