---
title: Menú contextual del repositorio
category: Empieza aquí
order: 4
summary: Haz clic derecho en cualquier ficha o pestaña de repositorio para alias, worktrees, GitHub, terminal y quitar.
keywords: menú contextual clic derecho alias worktree github terminal mostrar editor quitar repositorio pestaña context menu
---

# Menú contextual del repositorio

Haz clic derecho en un repositorio — una pestaña suelta, una ficha dentro de un
grupo, una ficha dentro de una carpeta anidada, una fila de la lista de
bienvenida/lanzador, o una fila del desplegable de repositorios de la barra de
herramientas — y obtienes el mismo menú de ámbito de repositorio. La ficha del
grupo sigue abriendo el menú del grupo; el clic tiene que caer sobre el
repositorio.

![El menú contextual del repositorio sobre una ficha agrupada](../../screenshots/repo-context-menu.webp)

El desplegable de repositorios de la barra de herramientas lista todos los
repositorios abiertos, igual que el desplegable de ramas lista las ramas. Clic
izquierdo en una fila para cambiar a él. Clic derecho en una fila (o en la
propia píldora del repositorio actual) para alias, worktrees, GitHub, terminal,
mostrar, editor y quitar. **Abrir repositorio…**, al final, abre el lanzador.

![Clic derecho en una fila del desplegable de repositorios de la barra de herramientas](../../screenshots/repo-dropdown-context-menu.webp)

## Qué hace cada acción

| Acción | Efecto |
|---|---|
| **Crear alias…** / **Cambiar alias…** | Solo un nombre visible. Gitcito nunca renombra ni mueve la carpeta en disco. El mismo alias sigue al repositorio por pestañas, grupos y espacios de trabajo. |
| **Quitar alias** | Aparece cuando existe un alias. Restaura el nombre de la carpeta. |
| **Mostrar worktrees** | Enfoca este repositorio y abre la sección de worktrees de la barra lateral. |
| **Nuevo worktree…** | El mismo diálogo de crear worktree que se usa desde una rama. Deshabilitado mientras falte la ruta o haya un merge/rebase/cherry-pick/revert en curso. |
| **Copiar nombre del repositorio** | Copia el nombre canónico de la carpeta, no el alias. |
| **Copiar ruta del repositorio** | Copia la ruta absoluta. |
| **Ver en GitHub** | El origin si es github.com; si no, el primer remoto de GitHub que se pueda interpretar. Deshabilitado cuando no se puede derivar ninguno. |
| **Abrir en el terminal** | Abre el terminal de Gitcito con este repositorio como directorio de trabajo. |
| **Mostrar en el Finder / Explorador** | Resalta la carpeta del repositorio en el gestor de archivos de la plataforma. |
| **Abrir en el editor externo** | El editor configurado en Ajustes. Visible pero deshabilitado hasta que haya uno configurado. |
| **Quitar…** | Cierra la pestaña o saca la ficha del grupo. Usa el mismo aviso de trabajo sin commitear que el botón **×**. Nunca borra archivos del disco. |

Una ruta ausente o inválida mantiene disponibles copiar, alias y quitar, y
atenúa todo lo que abriría o inspeccionaría el directorio.

**Ver también:** [Espacios de trabajo, pestañas y grupos](workspaces.md) · [Worktrees y submódulos](worktrees.md) · [Editor externo](editor.md) · [Terminal](terminal.md)
