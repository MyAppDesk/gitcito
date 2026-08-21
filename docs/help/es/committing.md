---
title: Hacer commits
category: Trabajar con cambios
order: 31
summary: Estilos de mensaje, plantillas, coautores y el linter.
keywords: commit mensaje compositor convencional conventional gitmoji ticket amend enmendar plantilla template coautor co-author linter deshacer undo reset
---

# Hacer commits

## Estilos de mensaje

Elige uno en Ajustes; el compositor se adapta a él.

| Estilo | Tiene esta pinta |
|---|---|
| **Convencional** | `feat(api)!: add rate limiting` — con un desplegable de tipos |
| **Gitmoji** | `✨ add rate limiting` — con un selector de emoji |
| **Ticket** | `ABC-123: add rate limiting` — sacado del nombre de la rama |
| **Simple** · **Auto** | Lo que escribas; con Auto es la IA quien decide la forma |
| **Cavernícola** · **Haiku** | Exactamente lo que parecen |

![Compositor rellenado desde una plantilla de commit](../../screenshots/commit-template.webp)

## Cosas que el compositor hace por ti

- <kbd>↑</kbd> <kbd>↓</kbd> recuperan tus **mensajes recientes**.
- Un **selector de coautores** añade trailers `Co-authored-by:` a partir de
  quienes ya han contribuido al repositorio.
- `commit.template` / `.gitmessage` **rellena** el mensaje, sin las líneas de
  comentario.
- Durante un merge, un cherry-pick o un revert, el mensaje viene **prerrellenado**
  como lo haría git.
- Los borradores **persisten** por repositorio, así que cambiar de pestaña nunca
  pierde un mensaje.

## El linter

Una comprobación en vivo y sin bloqueo: longitud del asunto (con contador de
caracteres), punto final, asunto en minúscula o no imperativo, líneas del cuerpo
demasiado anchas. Son pistas, nunca una barrera — no te impedirá hacer el commit.

## Amend

Amend reescribe el último commit con lo que tengas preparado. Gitcito te enseña
antes el mensaje existente, para que estés editando y no reescribiendo.

**Enmendar commit…** en una fila del grafo hace lo mismo para HEAD: carga el
mensaje completo, pone el compositor en modo amend y le da el foco. Un HEAD ya
enviado también se puede enmendar, pero Gitcito avisa de que actualizar el
remoto exigirá un force push.

**Deshacer commit…** es su hermano para un HEAD sin enviar: reset mixed al
padre, los cambios del árbol de trabajo se conservan, y el mensaje vuelve al
compositor. El commit inicial tiene un camino propio que deja una rama sin
nacer en lugar de destruir los archivos.

**Ver también:** [Preparación](staging.md) · [Absorb](absorb.md) · [Generador de changelog](changelog.md)
