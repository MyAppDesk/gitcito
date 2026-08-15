---
title: Ajustes por repositorio
category: Herramientas del espacio de trabajo
order: 94
summary: Ramas protegidas, información, analíticas, historial y el registro de operaciones.
keywords: ajustes del repo repo settings ramas protegidas protected branches analíticas analytics registro de operaciones operation log historial información engranaje gear
---

# Ajustes por repositorio

El engranaje que hay junto a las herramientas de la barra abre los ajustes que
pertenecen a **este** repositorio, no a la aplicación.

![Ajustes por repositorio](../../screenshots/repo-settings.webp)

| Pestaña | Qué contiene |
|---|---|
| **General** | Ramas protegidas (un multiselector de ramas, guardado en la config de git), firma |
| **Info** | Notas y campos libres sobre este repositorio, guardados en local |
| **Caja fuerte** | Las entradas de la [caja fuerte](vault.md) de este repositorio |
| **Métricas** | El [panel de historial](insights.md) |
| **Analíticas** | Lo que has hecho en este repositorio, contado en local |
| **Historial** · **Logs** | El registro de operaciones: cada comando de git que Gitcito ejecutó, con su salida |

El registro de operaciones es el sincero: cuando algo se comporta de forma rara,
muestra el comando exacto y el error exacto, para que un informe de fallo lleve
hechos en vez de adjetivos.

**Ver también:** [Seguridad y secretos](security.md) · [Métricas](insights.md)
