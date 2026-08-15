---
title: Hosting y pull requests
category: Sincronizar y muchos repos
order: 56
summary: Crea PRs en cualquier hosting; revísalos y fusiónalos en GitHub.
keywords: pull request PR merge request MR GitHub GitLab Bitbucket Azure DevOps revisar review aprobar approve fusionar merge issues incidencias notificaciones
---

# Hosting y pull requests

## Crear

Crea un pull (o merge) request sin salir de la app: desplegables de ramas,
título y cuerpo rellenados a partir de los commits de la rama, un interruptor
de borrador y — en GitHub — revisores, etiquetas y asignados aplicados al
crearlo.

![Creando un pull request](../../screenshots/create-pr.webp)

Funciona en **GitHub, GitLab, Bitbucket y Azure DevOps**. Los PR/MR abiertos de
los cuatro aparecen listados en la barra lateral.

Empieza uno desde la comparación de ramas, desde el grafo, desde el `+` del
panel de PRs, o desde una incidencia (lo que rellena `Closes #N`).

## Revisar — GitHub

| | |
|---|---|
| **Conversación** | Comentarios y estado de la revisión |
| **Checks** | Ejecuciones de CI con pasa/falla/pendiente y enlaces a los logs |
| **Archivos vistos** | Una lista de comprobación con ✓ por archivo y su progreso |
| **Hilos en línea** | Comentarios de línea agrupados por `file:line` con su hunk del diff, y las respuestas |
| **Acciones** | Comentar, aprobar, pedir cambios, y merge / squash / rebase |

Si alguien hace force push a mitad de la revisión, [qué ha cambiado
desde](range-diff.md) te enseña exactamente qué se ha movido.

## Incidencias, hitos y releases — GitHub

Explora las incidencias y abre una pestaña completa por incidencia: cuerpo,
comentarios, etiquetas, asignados, hito, campos de Projects v2, cerrar/reabrir,
y **crear una rama para esta incidencia** (con nombre generado por IA). Los
hitos muestran su progreso y sus incidencias. Los releases se pueden explorar
con su página de changelog.

## Notificaciones — GitHub

Tu bandeja entera — peticiones de revisión, menciones, actividad de CI — de
todos los repositorios, con filtros de no leídas/todas y marcar como leída. La
campana de la barra lleva un contador de no leídas, y opcionalmente saltan
notificaciones de escritorio cuando te piden una revisión o cuando termina la
CI.

## Tokens

Tokens por perfil para varias cuentas u organizaciones, guardados en el llavero
del sistema. Gitcito también puede tomar prestado lo que ya tenga tu **helper
de credenciales de git**, así que una organización para la que ya te has
autenticado a menudo no necesita configuración ninguna. Mira [Seguridad y
secretos](security.md).

**Ver también:** [Ramas apiladas](stacks.md) · [Funciones de IA](ai.md)
