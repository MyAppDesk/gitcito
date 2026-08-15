---
title: Caja fuerte
category: Seguridad
order: 71
summary: Un almacén local y cifrado para los secretos que un repo necesita — nunca commiteados.
keywords: caja fuerte vault secretos secrets env llavero keychain cifrado encrypted local por repositorio global copiar copy
---

# Caja fuerte

Los valores del `.env` que un proyecto necesita tienen que vivir en algún sitio.
La caja fuerte es ese sitio, sin que acaben dentro del repositorio.

![La caja fuerte](../../screenshots/vault.webp)

- **Cifrada en reposo** con el llavero de tu sistema operativo.
- **Dos ámbitos**: entradas asociadas a un repositorio, y un conjunto **global**
  al que puedes referirte desde cualquier sitio.
- **No es un archivo, y no tiene nada que ver con tu `.env`.** Las entradas están
  *asociadas* a un repositorio pero nunca se escriben en él, nunca se
  commitean, nunca se publican.
- **Nada sale nunca de tu máquina.** Sin sincronización, sin nube.

## Cómo usarla

Ábrela con <kbd>⌘⇧V</kbd>, desde el menú de herramientas, desde Ajustes, o desde
la paleta de comandos. Cambia entre cualquier repositorio conocido, revela o
copia un valor, o haz **Copiar como .env** de un conjunto entero directamente al
portapapeles.

## Llevarla de una máquina a otra

[Compartir seguro](secure-share.md) puede empaquetar la caja fuerte en un
paquete cifrado — y solo cuando pides explícitamente que se incluyan los
secretos.

**Ver también:** [Seguridad y secretos](security.md) · [Compartir seguro](secure-share.md)
