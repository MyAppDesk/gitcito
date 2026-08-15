---
title: La línea de comandos
category: Herramientas del espacio de trabajo
order: 93
summary: `gitcito .` — como `code .`, pero para Git.
keywords: cli linea de comandos command line terminal shim path instalar abrir carpeta instancia unica single instance
---

# La línea de comandos

```sh
gitcito .                        # open this folder
gitcito ~/code/api               # …or that one
gitcito . -n "My API"            # with a display name
gitcito . -g "Work"              # inside a group tab
gitcito . -n "My API" -g "Work"  # both
```

## Instalar el shim

Paleta de comandos (<kbd>⌘K</kbd>) → **Instalar el comando 'gitcito' en el PATH**
(macOS). Crea un enlace simbólico a un pequeño shim en `/usr/local/bin` o
`/opt/homebrew/bin`, y solo pide permisos de administrador si ninguno de los dos
es escribible por ti. Ejecuta el mismo comando otra vez para desinstalarlo.

## Cómo se comporta

- Si la ruta **ya está abierta** — como pestaña o dentro de un grupo — Gitcito
  **le da el foco** en vez de abrir un duplicado.
- Si todavía no es un repositorio Git, se abre igualmente, ofreciendo el flujo de
  «inicializar un repositorio aquí».
- `-g` añade el repositorio a un grupo con ese nombre, creando el grupo si no
  existe.
- Gitcito es de **instancia única**: ejecutar `gitcito` con la aplicación abierta
  le pasa la petición a esa ventana en lugar de lanzar una segunda copia.

**Ver también:** [Espacios de trabajo, pestañas y grupos](workspaces.md)
