---
title: Primeros pasos
category: Empieza aquí
order: 1
summary: Abre un repositorio, lee el grafo, haz tu primer commit.
keywords: intro primeros pasos abrir clonar clone pestañas tabs grafo graph commit empezar inicio
---

# Primeros pasos

Gitcito abre una carpeta y te enseña su historial. No escribe nada en tu
repositorio hasta que se lo pidas.

![Un repositorio recién abierto, todavía sin commits](../../screenshots/empty-repo.webp)

## Abrir un repositorio

- **Arrastra una carpeta** sobre la ventana, o usa **Abrir repositorio** en la
  pantalla de bienvenida.
- **Clona** uno desde una URL o directamente desde tu hosting — mira
  [clonar](cloning.md) para las opciones que hacen que un repositorio enorme se
  clone rápido.
- Desde un terminal, `gitcito .` abre la carpeta actual en la app que ya está
  en marcha — mira [la línea de comandos](cli.md).
- Una carpeta que todavía no es un repositorio Git también se abre, y te ofrece
  inicializarla.

## Los tres paneles

| Panel | Qué contiene |
|---|---|
| Izquierda | Ramas, remotos, etiquetas, stashes, worktrees — y la pestaña **Archivos** para el árbol de trabajo |
| Centro | El grafo de commits, y lo que selecciones en él |
| Derecha | El compositor de commits, o los detalles del commit seleccionado |

## Cómo encontrar todo lo demás

Dos caminos, y llevan a los mismos sitios:

- **`⌘K`** (`Ctrl+K`) — la paleta de comandos. Escribe lo que quieras; también
  salta a ramas, commits y archivos.
- **Herramientas** en la barra superior — el mismo conjunto, con ámbito de
  repositorio, en forma de menú, con la cola larga plegada en grupos para que
  siga siendo legible.

![El menú Herramientas: primero las herramientas frecuentes, el resto agrupado](../../screenshots/tools-menu.webp)

Cuando la ventana se estrecha, la barra de acciones deja de competir por el espacio: los botones que ya no caben se pliegan en un menú **Más** al final, en el mismo orden y conservando sus submenús. Ensancha la ventana y vuelven a salir.

Todo lo que se alcanza por un camino se alcanza por el otro, así que no hay
nada que solo encuentren los usuarios avanzados.

## Tu primer commit

1. Edita un archivo. Aparece bajo **Sin preparar**.
2. Prepáralo — el archivo entero, un hunk, o [líneas sueltas](staging.md).
3. Escribe un mensaje y pulsa **Commit**.

Todo lo demás en Gitcito es opcional.

