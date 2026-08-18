---
title: Ejecutar y depurar (launch.json)
category: Herramientas del espacio de trabajo
order: 91
summary: Ejecuta tus configuraciones de lanzamiento de VS Code sin salir de Gitcito.
keywords: launch.json ejecutar run depurar debug vscode configuraciones configs tareas tasks preLaunchTask input background segundo plano compound compounds stopAll serverReadyAction sesiones paralelas
---

# Ejecutar y depurar

Gitcito lee tu `.vscode/launch.json` — el de la raíz y los anidados que haya,
agrupados con separadores — y ejecuta la configuración que elijas en el terminal
integrado.

![El selector de configuraciones de lanzamiento y la barra flotante](../../screenshots/launch-configs.webp)

- Las **variables** de VS Code **se resuelven** (`${workspaceFolder}` y
  compañía).
- El **`preLaunchTask`** de una configuración se ejecuta primero.
- Los valores **`${input:…}`** se preguntan de forma interactiva antes de lanzar
  (`promptString` y `pickString`).
- Las tareas **`isBackground`** (watchers, servidores de desarrollo) se ejecutan
  desacopladas, así que nunca bloquean el lanzamiento.
- Los **compounds** ejecutan cada miembro como su **propia sesión paralela**,
  en un terminal dividido con el nombre del compound — un panel por miembro,
  exactamente como las sesiones de depuración de VS Code. Con `stopAll: true`,
  parar un miembro los para a todos.
  Las tareas que comparten varios miembros se ejecutan **una sola vez**, en su
  propio panel, antes de que arranquen los miembros — un prompt de subir versión
  pregunta una vez, no una por miembro.
  Ese panel se cierra solo si todo va bien y se queda abierto si falla.
- Se respeta **`serverReadyAction`**: cuando la salida de la sesión coincide con
  el patrón configurado, la URL anunciada se abre en tu navegador
  (`openExternally`; `debugWithChrome` / `debugWithEdge` también abren el
  navegador — Gitcito no puede adjuntarle un depurador).

![Un compound ejecutando dos sesiones paralelas](../../screenshots/launch-compound.webp)

Una barra flotante te da **pausar / reanudar, reiniciar, parar**, y alterna entre
las sesiones en marcha.

Actívalo en **Ajustes → General → Habilitar launch.json**. El botón **LAUNCH**
aparece junto a las pestañas Git / Ficheros.

Un miembro de un compound se muestra como *compound › miembro*, y reiniciarlo
reinicia solo ese miembro.

Lo que Gitcito deliberadamente **no** hace: ejecuta tus programas en terminales
reales, pero no es un depurador — sin puntos de interrupción, sin inspección de
variables, sin Debug Adapter Protocol. Las configuraciones de solo attach
funcionan cuando llevan un `preLaunchTask` (la tarea es el trabajo); un attach
puro no tiene nada que ejecutar.

**Ver también:** [Terminal integrado](terminal.md)
