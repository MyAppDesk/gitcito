---
title: Ejecutar y depurar (launch.json)
category: Herramientas del espacio de trabajo
order: 91
summary: Ejecuta tus configuraciones de lanzamiento de VS Code sin salir de Gitcito.
keywords: launch.json ejecutar run depurar debug vscode configuraciones configs tareas tasks preLaunchTask input background segundo plano
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

Una barra flotante te da **pausar / reanudar, reiniciar, parar**, y alterna entre
las sesiones en marcha.

Actívalo en **Ajustes → General → Habilitar launch.json**. El botón **LAUNCH**
aparece junto a las pestañas Git / Ficheros.

**Ver también:** [Terminal integrado](terminal.md)
