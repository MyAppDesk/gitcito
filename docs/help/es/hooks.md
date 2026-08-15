---
title: Hooks y .gitignore
category: Herramientas del espacio de trabajo
order: 92
summary: Gestiona los hooks de git, e ignora archivos sin editarlos a mano.
keywords: hooks ganchos pre-commit husky core.hooksPath gitignore ignorar ignore untrack dejar de seguir
---

# Hooks y .gitignore

## Hooks

Lista todos los hooks del repositorio, mira cuáles son reales y cuáles siguen
siendo `.sample`, y actívalos, desactívalos, edítalos o créalos.

![El gestor de hooks](../../screenshots/hooks.webp)

Gitcito detecta un **`core.hooksPath`** personalizado (husky y compañía) y la
configuración de un **framework pre-commit**, y te avisa cuando los hooks viven
en un sitio que no es `.git/hooks` — si no, estarías editando un archivo que git
nunca ejecuta.

> Los hooks se ejecutan para los commits de Gitcito exactamente igual que para
> `git commit`. Un hook que falla bloquea el commit, y su salida vuelve dentro
> del error.

## .gitignore inteligente

Clic derecho en un archivo → **Ignorar**, y elige:

| Opción | Escribe |
|---|---|
| Este archivo | `path/to/file.log` |
| Todos los `*.ext` | `*.log` |
| La carpeta entera | `path/to/folder/` |

![El selector de .gitignore](../../screenshots/gitignore-chooser.webp)

La regla va al `.gitignore` de la **carpeta más cercana**, o al de la raíz del
repositorio, con una vista previa en vivo de la línea antes de que te
comprometas con ella. Los archivos que ya tienen seguimiento incluyen un
**Ignorar y dejar de seguir** en el mismo diálogo.

**Ver también:** [Seguridad y secretos](security.md) · [Preparación](staging.md)
