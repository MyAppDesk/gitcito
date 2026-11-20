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
- **Arrastra un terminal sobre otro** en la lista para fusionarlos en un grupo
  dividido. Cada terminal conserva su nombre como panel; el grupo fusionado
  recibe un nombre numerado nuevo.

![Dos paneles divididos lado a lado en un mismo grupo de terminal](../../screenshots/terminal-split.webp)

## Teclas

| Teclas | Hace |
|---|---|
| <kbd>⌃`</kbd> | Muestra u oculta la terminal — la tecla Control física, en todas las plataformas |
| <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> | Nueva terminal, mientras la terminal tiene el foco |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | Cierra la terminal enfocada; cerrar la última oculta el panel |
| <kbd>Ctrl+Shift+C</kbd> | Copia la selección; un <kbd>Ctrl+C</kbd> solo también copia mientras hay selección, y sigue siendo SIGINT cuando no la hay |
| <kbd>Ctrl+V</kbd> / <kbd>Ctrl+Shift+V</kbd> / <kbd>Shift+Ins</kbd> | Pega desde el portapapeles |
| Clic derecho | Copia la selección, o pega si no hay nada seleccionado |

Las dos primeras se limitan a la terminal a propósito: fuera de ella siguen
abriendo y cerrando [pestañas de espacio de trabajo](workspaces.md). En macOS,
Copiar/Pegar del menú Edición funcionan igual.

## Sugerencias de scripts

Escribe `npm run ` (o `pnpm`, `yarn`, `bun run`) y aparece en el cursor una lista
de los scripts del proyecto, filtrada a medida que escribes: `npm run loc`
encuentra `LOCAL_SERVER`. Cada nombre muestra el comando que ejecuta.

| Tecla | Hace |
|-------|------|
| **Tab** | Completa el script seleccionado |
| **↑ / ↓** | Elige otro |
| **Esc** | Cierra la lista hasta que vuelvas a escribir |

Otros comandos tienen su propia lista:

| Escrito | Lista | Leído de |
|-------|-----|--------|
| `composer run ` | Scripts de Composer | el `composer.json` más cercano |
| `make ` | Objetivos del Makefile, con el `## texto` tras el objetivo como descripción | el `Makefile` del directorio actual, como lo lee `make` |
| `git checkout `, `switch`, `merge`, `rebase` | Ramas locales, luego las remotas por su nombre corto | el repositorio en el que está el shell |

Un objetivo de Makefile construido con variables o un patrón (`%.o`) no aparece,
y `git checkout -b` no tiene lista: da nombre a una rama nueva.

Los scripts salen del `package.json` más cercano al directorio **actual** del
shell, así que tras `cd frontend` ves los del frontend. Primero van los nombres
que empiezan por lo escrito, luego los que lo contienen.

La lista solo conoce las teclas escritas desde el último Enter. Recuperar un
comando con ↑, mover el cursor o usar el Tab del propio shell cambia la línea sin
que ella lo vea, así que se queda callada hasta el siguiente Enter en lugar de
completar algo equivocado. En Windows no se puede leer el directorio actual, por
lo que la lista sigue la carpeta donde se abrió la terminal.

## Tu PATH

El shell arranca como **shell de login**, igual que en Terminal.app o iTerm, así
que se ejecutan `~/.zprofile`, `~/.zlogin` y `~/.bash_profile`. Importa porque
los gestores de versiones y `brew shellenv` suelen instalarse ahí: una
herramienta como `fvm`, `nvm` o `pyenv` que funciona en tu terminal funciona
también aquí.

Además, Gitcito le pregunta a tu shell de login por su `PATH` real al arrancar y
lo fusiona en todo lo que lanza, porque una app gráfica abierta desde el Dock no
hereda casi nada. Si aun así no encuentra un comando, comprueba que esté en el
`PATH` de un shell de login y no solo en el de uno interactivo.

Todo lo que ejecutes aquí es invisible para el sistema de bloqueos de Gitcito,
así que un `git rebase` largo escrito a mano y un clic en la interfaz todavía
pueden chocar — la aplicación se refresca desde disco cuando el terminal cambia
algo.

## Shell, tema y Oh My Posh

En Windows, Ajustes → Diseño elige el shell que abre cada terminal nueva —
PowerShell, PowerShell Core (`pwsh`), `cmd`, Git Bash, WSL o un ejecutable
propio. El aspecto de la terminal (tema, tamaño y familia de fuente) está en
Ajustes → Temas → Tema de la terminal y se aplica al momento a todas las
sesiones.

Si [Oh My Posh](https://ohmyposh.dev) está instalado, la sección también lista
cada `*.omp.json` de `%POSH_THEMES_PATH%` con vista previa en vivo — elegir uno lo
inyecta como `POSH_THEME` en las terminales nuevas, así que un simple
`oh-my-posh init pwsh` en tu perfil lo toma. También vale una ruta propia a un
`.omp.json`; dejar el campo en Predeterminado conserva lo que ya fijen tu
shell/perfil o un `POSH_THEME` global. Las sesiones abiertas mantienen su tema —
cierra y reabre una terminal para aplicar uno nuevo. Los glifos del prompt
necesitan una Nerd Font en la familia de fuente de la terminal (por ejemplo
`CaskaydiaMono Nerd Font`), o los iconos se verán como cuadros.

Sobre la velocidad: Oh My Posh ejecuta su binario una vez por prompt — unos
100–200 ms en Windows, más con temas que tienen un segmento de git en un
repositorio grande — y se nota como una pausa breve antes de cada prompt, no como
lentitud de Gitcito. Los temas sin segmento de git son los más rápidos. También
influye el estilo de predicción de PowerShell: `-PredictionViewStyle InlineView`
repinta un área pequeña por tecla, mientras que `ListView` redibuja un bloque
entero.

**Ver también:** [Ejecutar y depurar](launch.md) · [Hooks](hooks.md)
