---
title: Hosting y pull requests
category: Sincronizar y muchos repos
order: 56
summary: Crea PRs en cualquier hosting; revísalos y fusiónalos en GitHub y GitLab.
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

## Revisar — GitHub y GitLab

| | |
|---|---|
| **Conversación** | Comentarios y estado de la revisión |
| **Checks** | Ejecuciones de CI (GitHub) o trabajos de pipeline (GitLab) con pasa/falla/pendiente y enlaces a los logs |
| **Archivos vistos** | Una lista de comprobación con ✓ por archivo y su progreso |
| **Hilos en línea** | Comentarios de línea agrupados por `file:line`, y las respuestas |
| **Acciones** | Comentar, aprobar, pedir cambios, y merge / squash |

Si alguien hace force push a mitad de la revisión, [qué ha cambiado
desde](range-diff.md) te enseña exactamente qué se ha movido.

Las diferencias de GitLab, dichas claramente: GitLab no tiene una única llamada
de "enviar revisión", así que **aprobar** usa su endpoint de aprobaciones y
**pedir cambios** retira tu aprobación y publica tu comentario. El
**rebase-merge** no se ofrece — GitLab decide entre merge-commit y fast-forward
según la configuración del proyecto, así que el menú de merge muestra solo
merge y squash. Los hilos en línea muestran el archivo y la línea, pero no el
hunk del diff que los rodea, porque la API de GitLab no lo devuelve.
Revisar/fusionar funciona para proyectos en **gitlab.com**; las instancias
autoalojadas aún no están soportadas. Bitbucket y Azure DevOps se siguen
abriendo en el navegador para revisar.

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
