---
title: La barra de menús
category: Empieza aquí
order: 5
summary: Qué contienen los menús de Gitcito en macOS, y por qué Windows y Linux no los tienen.
keywords: barra de menús menu bar menús aplicación archivo edición ver ventana ayuda repositorio macos nativo acerca de salir
---

# La barra de menús

Una barra de menús responde a una pregunta que ninguna otra superficie responde
bien: *¿qué sabe hacer esta aplicación?* La [paleta de comandos](search.md) es
más rápida cuando ya sabes qué buscas, y la [chuleta](keyboard.md) enumera las
teclas, pero por ninguna de las dos se navega. Por los menús sí.

Todo lo que hay en ellos también se alcanza desde dentro de la ventana. Nada es
exclusivo del menú, y es a propósito: una función que solo existe en un menú es
una función que quienes usan Windows y Linux no tienen.

## Qué hay en cada menú

| Menú | Contiene |
|---|---|
| **Gitcito** | Acerca de, comprobación de actualizaciones, [Ajustes](repo-settings.md), y los elementos estándar de ocultar y salir |
| **Archivo** | Nueva pestaña, abrir o [clonar](cloning.md) un repositorio, abrir reciente, cerrar y reabrir pestañas |
| **Editar** | Cortar, copiar, pegar, deshacer — la edición de texto que tu teclado ya hace — más la [búsqueda en el código](search.md) |
| **Ver** | Paleta de comandos, los interruptores de la barra lateral y del panel, la [terminal](terminal.md), [mission control](mission-control.md), la [caja fuerte](vault.md), el zoom |
| **Repositorio** | Fetch, pull, push, confirmar, stash, nueva rama, [pull request](hosting.md), deshacer, mostrar en el Finder, ajustes del repositorio |
| **Ventana** | Minimizar, zoom, traer todo al frente |
| **Ayuda** | Este manual, la chuleta, novedades, licencias, informar de un problema |

El menú Repositorio se atenúa por completo cuando la pestaña activa no es un
repositorio git, y **Deshacer** se atenúa cuando no hay nada que deshacer: el
menú es un resumen legible de lo que la aplicación te dejará hacer ahora mismo.

## Atajos mostrados, no confiscados

Las teclas que aparecen junto a cada elemento son las que realmente tienes
asignadas. Reasigna <kbd>⌘K</kbd> en Ajustes y el menú Ver lo dirá.

Funciona porque el menú *muestra* esas combinaciones sin reclamarlas: el manejo
de teclado propio de Gitcito sigue al mando, que es lo que permite que un atajo
se comporte de forma distinta según dónde esté el cursor. Lo único que esto no
puede mostrar es un atajo que Gitcito no posee: <kbd>⌘F</kbd> pertenece al
archivo o diff que estés leyendo, así que ningún elemento del menú lo reclama.

## Los límites

- **Solo macOS.** En Windows y Linux la ventana no tiene marco — la barra de
  título la dibuja Gitcito y no hay dónde alojar una barra de menús. Esas
  plataformas reciben los mismos comandos por la [paleta de
  comandos](search.md) y los [atajos de teclado](keyboard.md).
- **Recargar y Herramientas de desarrollo solo aparecen en compilaciones de
  desarrollo.** Recargar tira el estado de todas las pestañas abiertas, y eso no
  es algo que una versión publicada deba ofrecer junto a Zoom.
- **Abrir reciente lista diez repositorios como mucho**, del más reciente al
  menos, y sigue la misma lista que muestra la [pantalla de
  bienvenida](getting-started.md).
- **Reabrir pestaña cerrada nunca se atenúa.** La pila de pestañas cerradas vive
  solo durante la sesión y el menú no puede verla; elegirlo sin nada que reabrir
  no hace nada.
