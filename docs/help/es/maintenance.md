---
title: Mantenimiento del repositorio
category: Repositorio e historial
order: 15
summary: Lo que el repositorio cuesta en disco, cuánto de eso es recuperable, y qué haría realmente cada tarea de git.
keywords: mantenimiento gc garbage collect recolector basura repack prune fsck count-objects sueltos loose packed objetos disco espacio tamaño optimizar commit-graph git maintenance programar dangling colgantes
---

# Mantenimiento del repositorio

Git nunca te dice lo que cuesta un repositorio. Sigue funcionando esté como esté
su base de datos de objetos, así que la primera señal de problema suele ser un
clonado que se arrastra o un portátil sin disco libre — mucho después del punto
en el que un solo comando lo habría arreglado.

Este panel es esa lectura que falta: dónde se fue el espacio, cuánto es
recuperable, y qué hace cada tarea antes de que la ejecutes.

`⌘K` → **Mantenimiento del repositorio**.

![Uso de disco repartido entre empaquetado, suelto e inalcanzable, con las tareas de mantenimiento debajo](../../screenshots/maintenance.webp)

## Leer los números

Todo sale de `git count-objects -v` y de un recorrido real de alcanzabilidad —
nada está estimado.

| Fila | Qué es | Por qué crece |
|-----|-----------|--------------|
| **Empaquetado** | Objetos dentro de packfiles, comprimidos y con deltas | Este es el estado sano |
| **Suelto** | Un fichero por objeto, apenas comprimido | Cada commit, cada fetch escribe de estos |
| **Inalcanzable** | Objetos a los que ya no apunta nada | Commits descartados, mensajes enmendados, rebases abandonados |

El recuento junto a **Suelto** — *"n objetos, m ya empaquetados"* — es el que
merece la pena vigilar. Esos `m` están guardados dos veces: una sueltos, otra
dentro de un pack. Son pura duplicación, y `git gc` es lo que los colapsa.

**Inalcanzable no significa basura todavía.** Esos objetos son la razón por la
que `git reflog` te devuelve un commit que borraste con un reset. Git los
conserva dos semanas a propósito.

## Las tareas

| Botón | Ejecuta | Coste |
|--------|------|------|
| **Optimizar** | `git gc` | De segundos a un minuto. Casi siempre la respuesta correcta |
| **Reempaquetar desde cero** | `git gc --aggressive` | Minutos en un repositorio grande. Recalcula cada delta |
| **Reconstruir el commit graph** | `git commit-graph write --reachable` | Rápido. Hace que los recorridos de log y del grafo vayan notablemente más ágiles |
| **Comprobar integridad** | `git fsck --dangling` | Lento en un repositorio grande, no cambia nada |
| **Descartar los inalcanzables ya** | `git gc --prune=now` | Destruye la red de seguridad del reflog |

**Optimizar** es la que hay que usar. Empaqueta los objetos sueltos, descarta lo
que lleva más de dos semanas inalcanzable, y deja recuperable el historial
reciente.

**Reempaquetar desde cero** está sobrevalorado. Tira cada delta existente y
recalcula desde nada, lo que tarda minutos y normalmente ahorra un pequeño
porcentaje frente a un gc normal. Merece la pena una vez tras importar un
historial enorme; no merece la pena de forma rutinaria.

**Descartar los inalcanzables ya** pregunta antes, y la confirmación dice cuántos
objetos y cuánto espacio. Después de eso, un commit que borraste con un reset
hace una hora es irrecuperable — la entrada del reflog puede seguir apareciendo,
pero el objeto que había detrás ya no está.

## Comprobar integridad

`git fsck` verifica que cada objeto referenciado por otro objeto está realmente
presente y es internamente consistente.

- **Los objetos colgantes son normales.** Son los inalcanzables, listados por
  nombre. Un repositorio con cientos de ellos después de un rebase está sano.
- **Los objetos que faltan son daño** — una escritura truncada, un disco
  defectuoso, una transferencia interrumpida. Si aparece alguno, no reempaquetes:
  reempaquetar una base de datos dañada puede convertir un problema recuperable
  en uno permanente. Clona una copia buena desde tu remoto y llévate tus ramas
  sin publicar con un [bundle](export.md).

## Mantenimiento en segundo plano

La casilla registra el repositorio en **`git maintenance`**, que empaqueta y
hace prefetch según una planificación que ejecuta tu sistema operativo (launchd,
systemd o el Programador de tareas).

Nada de esto es específico de Gitcito: la misma planificación sirve a tu
terminal, y `git maintenance unregister` la deshace desde cualquier sitio.
Desmarcar la casilla hace exactamente eso, y deja la planificación en pie para
los demás repositorios que estén registrados.

## Límites que conviene conocer

- **El recuento de inalcanzables necesita un recorrido completo de
  alcanzabilidad**, así que abrir el panel en un repositorio muy grande tarda un
  momento. Ese es el número honesto, no una estimación.
- **Los tamaños son lo que el disco entrega**, no la longitud del contenido. Un
  objeto suelto de 400 bytes sigue ocupando un bloque de 4 KB, que es por lo que
  mil de ellos cuestan megabytes — y por lo que empaquetarlos merece la pena.
- **Un worktree o un submódulo tiene su propio `.git`**, así que el tamaño
  mostrado es solo el de este repositorio.
- **El mantenimiento no puede encoger el historial.** Si un blob de 400 MB está
  en un commit, es alcanzable, y gc lo conservará para siempre — eso es
  [eliminar un fichero del historial](history-purge.md), una operación distinta
  y mucho más disruptiva.
- **Gitcito nunca ejecuta gc a tus espaldas.** El propio `gc --auto` de git
  todavía puede hacerlo, como siempre; si falla deja una nota en `.git/gc.log`,
  que este panel te muestra.

Ver también: [Eliminar un fichero del historial](history-purge.md) ·
[Bundles y archivos](export.md) · [Recuperación](recovery.md)
