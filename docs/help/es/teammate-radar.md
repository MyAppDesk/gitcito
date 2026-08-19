---
title: Radar de compañeros
category: Ramas y cirugía
order: 45
summary: Quién movió qué en el remoto — y si aterriza sobre tu trabajo sin commitear.
keywords: radar de compañeros teammate radar actividad remota remote activity upstream solapamiento overlap archivos sucios dirty files colisión collision quién tocó who touched conflicto conflict fetch
---

# Radar de compañeros

Estás editando `api.ts`. Otra persona también, en una rama que no has mirado.
La forma habitual de enterarse es un conflicto de fusión la semana que viene;
la del radar es una lista, hoy.

Todo se calcula a partir de tu **último fetch** — referencias de seguimiento
remoto, un `merge-tree` en memoria, nada más. Sin servidor, sin agentes en las
máquinas de tus compañeros, sin más red que el fetch que ya estabas haciendo.

![Radar de compañeros](../../screenshots/teammate-radar.webp)

## Qué te dice cada fila

Para cada rama remota con commits que tu `HEAD` no tiene:

| Columna | Significado |
|--------|---------|
| Quién y cuándo | El último committer de esa rama, y hace cuánto |
| Commits / archivos | Cuánto viene de camino, y cuántos archivos toca |
| **Solapamiento** | Cuáles de esos archivos están **sucios en tu árbol de trabajo ahora mismo** — la píldora roja |
| Riesgo | Si fusionar esa rama en `HEAD` daría conflicto (el mismo motor que el [radar de conflictos](conflict-radar.md)) |

Las filas se ordenan por cuánto chocan contigo: primero el solapamiento,
después los conflictos previstos, después lo más reciente. Expande una fila
para ver las listas exactas de archivos; **Comparar** abre la comparación
completa de ramas.

## Cuándo avisa

Tras cada fetch — manual o automático — el radar barre en silencio. Solo
muestra un aviso cuando los commits del remoto tocan archivos que tú has
modificado **y** ese conjunto ha cambiado de verdad desde el último barrido.
Sin archivos sucios no hay ruido: un árbol de trabajo limpio no puede chocar
con nada.

## Límites

- Ve lo que vio el último fetch. Un compañero que no ha hecho push es
  invisible — esto lee referencias, no mentes.
- El solapamiento es a nivel de ruta, no de línea: tocar el mismo archivo es un
  aviso, no la prueba de un conflicto. La columna **Riesgo** es la respuesta a
  nivel de línea, pero solo entre estados ya commiteados.
- Las ramas inactivas más de ~45 días se omiten, y solo se escanean las 30 que
  se han movido más recientemente.

**Ver también:** [Radar de conflictos](conflict-radar.md) · [Traer, hacer pull y hacer push](syncing.md) · [Qué ha cambiado desde](range-diff.md)
