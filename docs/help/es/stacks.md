---
title: Ramas apiladas
category: Ramas y cirugía
order: 43
summary: Cadenas de ramas dependientes — restack en cascada y PRs encadenados con un clic.
keywords: stack stacked apiladas ramas branches graphite restack dependiente cadena padre parent PR por nivel submit enviar autopilot piloto automático retarget redirigir base
---

# Ramas apiladas

Una pila es una cadena de ramas en la que cada una se construye sobre la de
abajo: `main → api → ui`. Revisar tres PR pequeños es mejor que revisar uno
descomunal.

![Una pila de ramas](../../screenshots/branch-stack.webp)

Gitcito muestra la pila de abajo → arriba con el número de commits en cada
nivel. Cada nivel que tiene un PR abierto lleva su número como una etiqueta —
haz clic en ella para abrir el PR.

## Enviar la pila como PRs encadenados

**Enviar pila como PRs** hace en un clic lo que las herramientas de stacking
cobran:

1. Empuja cada nivel con `--force-with-lease` (las ramas recién creadas lo
   toleran, las reapiladas lo necesitan).
2. Abre un PR para cada nivel que no tenga uno — cada uno **basado en su rama
   padre**, no en `main`, de modo que cada revisión muestra solo sus propios
   commits. El título y la descripción salen de los commits del propio nivel.
3. Redirige la base de cualquier PR existente cuya base se haya desviado.
4. Escribe una **sección de navegación de la pila** en el cuerpo de cada PR,
   para que quien revisa cualquier nivel pueda ver la cadena completa y dónde
   encaja este PR en ella.

La acción es **idempotente**: púlsala tras cada restack o nivel nuevo y
converge — no se duplica nada, solo se toca lo que se había desviado.

## Restack

Cuando una rama de abajo cambia — has atendido los comentarios de revisión en
`api` — todas las ramas por encima están ahora construidas sobre la base
equivocada. **Restack** rehace la cadena entera en cascada con `rebase --onto`,
de modo que reescribir un padre no duplica sus commits dentro de los hijos.
Después de un restack, pulsa **Enviar** de nuevo: hace force-push de los
niveles reescritos y los PRs se actualizan en su sitio.

## Límites

- El envío es **solo para GitHub** por ahora (la creación funciona en los
  cuatro servicios de hosting, pero redirigir la base y actualizar los cuerpos
  requiere la API de GitHub).
- Después de que el PR de abajo se fusione, git sigue viendo la cadena antigua:
  **desvincula** el nivel fusionado (o apunta el padre de su hijo al tronco),
  reapila y envía. La limpieza tras fusionar el nivel de abajo aún no está
  automatizada.
- La sección de la pila en el cuerpo de un PR se mantiene entre marcadores
  ocultos — tu propia descripción encima de ella se conserva.

## Dónde viven los enlaces

Los enlaces al padre se guardan en la **config de git**, así que viajan con el
repositorio y sobreviven a un reclonado. No hay nada en ningún servicio.

**Ver también:** [Rebase interactivo](rebase.md) · [Hosting y pull requests](hosting.md)
