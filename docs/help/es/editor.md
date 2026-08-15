---
title: Editor externo
category: Herramientas del espacio de trabajo
order: 95
summary: Envía un repositorio, un archivo o una sola línea de código al editor en el que de verdad escribes.
keywords: editor externo vscode code cursor windsurf zed sublime jetbrains intellij webstorm xcode abrir en el editor línea columna comando personalizado argv line column custom command
---

# Editor externo

Un cliente de Git es donde lees código; casi nunca es donde lo arreglas. Entre
detectar un problema en un diff y tener el cursor sobre esa línea en tu editor
hay una búsqueda de archivo y un scroll — cada vez.

Apunta Gitcito a tu editor una vez y esa distancia desaparece: haz clic derecho
en una línea de la vista de archivo o de blame y se abre ahí, en esa línea.

## Elegir uno

**Ajustes → General → Editor externo.** El desplegable lista los editores que
Gitcito encuentra en esta máquina — busca primero el comando de cada editor y
después, en macOS, el bundle de la aplicación en `/Applications` y
`~/Applications`. El escaneo se ejecuta cada vez que abres los Ajustes, así que
un editor instalado hace cinco minutos aparece sin reiniciar nada.

Reconocidos de serie:

| Editor | Comando que busca |
|--------|----------------------|
| Visual Studio Code | `code`, `code-insiders` |
| Cursor | `cursor` |
| Windsurf | `windsurf` |
| Zed | `zed` |
| Sublime Text | `subl` |
| IDEs de JetBrains | `idea`, `webstorm`, `pycharm`, `rustrover`, `goland`, `clion`, `rider`, `phpstorm` |
| Xcode | `xed` |

## El límite que conviene conocer

**Saltar a una línea necesita el comando del editor, no su icono.** Un bundle
`.app` de macOS se lanza con `open`, que acepta una ruta y nada más — así que un
editor encontrado solo como bundle abre el archivo por arriba, y Gitcito lo dice
debajo del desplegable en vez de disimularlo.

El arreglo está del lado del editor: *Shell Command: Install 'code' command in
PATH* en VS Code, el symlink `subl` de Sublime, *Toolbox → Settings → Shell
scripts* en JetBrains. En cuanto el comando existe, vuelve a elegir el editor y
el salto de línea funciona.

## Dónde aparecen las acciones

| Superficie | Qué abre |
|---------|---------------|
| Pestaña del repo, repo en la barra lateral, barra de estado | La carpeta del repositorio |
| Árbol de archivos, archivos de un commit, archivos de un stash, el compositor de commits | Ese archivo |
| El icono al final de la fila en el árbol de archivos | Ese archivo, de un clic |
| Clic derecho en una línea de la vista de **archivo** | El archivo, en esa línea |
| Clic derecho en una línea de la vista de **blame** | El archivo, en esa línea |

Las acciones de línea solo aparecen donde el número de línea aún significa algo:
un archivo mostrado en un commit antiguo, o un blame rebobinado a una revisión
anterior, tiene líneas que ya no coinciden con lo que hay en disco, así que
Gitcito no ofrece ningún salto ahí en lugar de mandarte al sitio equivocado.

## Un comando tuyo

Elige **Comando personalizado** para cualquier cosa que no esté en la tabla — un
script envoltorio, un lanzador de desarrollo remoto, un editor de terminal
arrancado a través de tu propio shim.

| Campo | Significado |
|-------|---------|
| Comando | El ejecutable a lanzar. Sin shell, así que nada de `&&`, tuberías ni globs. |
| Nombre | Cómo lo llaman las entradas del menú. |
| Argumentos para un archivo | Plantilla argv, p. ej. `-g {path}:{line}:{col}` |
| Argumentos para una carpeta | Plantilla argv, normalmente solo `{path}` |

Las plantillas se parten por espacios y cada token se sustituye una sola vez —
una ruta con un espacio sigue siendo un único argumento, y nada se vuelve a
parsear después, así que un nombre de archivo nunca puede convertirse en
sintaxis. Cuatro marcadores: `{path}`, `{line}`, `{col}`, `{repo}`.

Un marcador sin valor se lleva su flag consigo: `--line {line} {path}` ejecutado
sin línea se queda solo en la ruta, nunca en un `--line` colgando que se comería
el nombre del archivo como argumento. Una plantilla sin `{line}` simplemente
significa que Gitcito no ofrecerá acciones con precisión de línea para ese
editor.

## Lo que esto no es

Esto no es el ajuste de [app «Abrir con»](repo-settings.md), que muestra el
selector del sistema y recuerda una app para abrir *cualquier cosa* — una
imagen, un PDF, una carpeta en el Finder. El editor es el más específico de los
dos, así que cuando ambos están configurados el editor gana en el icono al final
de la fila del árbol de archivos; los dos siguen apareciendo en el menú
contextual.

Gitcito nunca lanza tu editor por su cuenta, y cerrar Gitcito nunca lo cierra:
el editor se arranca desacoplado, como un proceso propio.
