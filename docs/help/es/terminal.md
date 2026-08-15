---
title: Terminal integrado
category: Herramientas del espacio de trabajo
order: 90
summary: Un PTY de verdad acoplado bajo el repo, con pestañas por repositorio.
keywords: terminal shell pty xterm consola pestañas acoplado docked
---

# Terminal integrado

Un PTY de verdad (xterm + node-pty), no un lanzador de comandos. Tu shell, tu
prompt, tus alias.

![El terminal integrado](../../screenshots/terminal.webp)

- **Varias pestañas por repositorio**, cada una arrancando en la carpeta de ese
  repositorio.
- Acóplalo **debajo** del grafo o como **columna a la derecha**; el panel
  recuerda su tamaño.
- La visibilidad del terminal es por repositorio: cambiar a una pestaña que nunca
  abrió uno lo deja cerrado.
- Las pestañas se nombran solas según lo que se esté ejecutando en ellas.
- Plegar la lista de terminales la reduce a un **raíl**: un icono por terminal
  (los terminales divididos muestran un minimapa de paneles), pulsa para cambiar,
  clic derecho para el menú habitual de renombrar/dividir/matar.

![Dos paneles divididos lado a lado en un mismo grupo de terminal](../../screenshots/terminal-split.webp)

Todo lo que ejecutes aquí es invisible para el sistema de bloqueos de Gitcito,
así que un `git rebase` largo escrito a mano y un clic en la interfaz todavía
pueden chocar — la aplicación se refresca desde disco cuando el terminal cambia
algo.

**Ver también:** [Ejecutar y depurar](launch.md) · [Hooks](hooks.md)
