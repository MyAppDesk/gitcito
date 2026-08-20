---
title: Accesibilidad
category: Hazlo tuyo
order: 78
summary: Compatibilidad con lector de pantalla y teclado — qué está cubierto y qué no, todavía.
keywords: accesibilidad accessibility a11y lector de pantalla VoiceOver NVDA navegación por teclado foco aria contraste movimiento reducido
---

# Accesibilidad

Gitcito aspira a poder manejarse sin ratón y a ser legible para un lector de
pantalla. Esta página cuenta qué significa eso en concreto — y dónde están los
límites.

## Teclado

- **Las pestañas, las filas de la barra lateral, las listas de archivos y los
  menús de la barra de herramientas** reciben el foco y se activan con Enter o
  Space. Los botones divididos (pull/push/stash) exponen su flecha desplegable
  como un control enfocable propio.
- **El grafo de commits** es una sola parada de foco: enfócalo y usa
  arriba/abajo (o j/k) para recorrer la historia. El commit seleccionado se
  anuncia con su asunto, su autor y su posición. Shift+F10 (o la tecla de
  menú) abre el menú contextual del commit seleccionado.
- **Los menús contextuales** se abren con el foco dentro: las flechas mueven,
  Enter activa, ArrowRight/ArrowLeft entran y salen de los submenús, Escape
  cierra.
- **Los diálogos** atrapan el Tab dentro de sí, devuelven el foco a donde
  estabas cuando se cierran, y se cierran con Escape.
- La **paleta de comandos** (Cmd/Ctrl+K) es un combobox: los resultados se
  anuncian mientras escribes y mientras los recorres con las flechas.

## Lectores de pantalla

- Cada diálogo se anuncia con su título. Los toasts — el canal de feedback de
  la app — son regiones vivas: los éxitos se anuncian con cortesía, los
  errores interrumpen.
- El progreso (clonado, descarga de una actualización) se expone como una
  barra de progreso con porcentaje, y los estados ocupados («Obteniendo…») se
  anuncian solos.
- El estado de los archivos se pronuncia («Añadido», «Modificado», «En
  conflicto»), no solo se muestra como un glifo de color.
- La ventana está estructurada con regiones landmark (banner, main, barra
  lateral, barra de estado), así que la navegación por landmarks funciona.

## Los límites, dichos sin rodeos

- **La terminal** es xterm.js y hereda su historia con los lectores de
  pantalla, que es floja. Trátala como una superficie para usuarios videntes;
  cada operación de git que ofrece existe también como acción de la interfaz.
- **Cosmos (la historia en 3D), los carriles del grafo de commits y los diffs
  de imágenes** son visuales por naturaleza. Los datos que hay detrás — la
  lista de commits, las listas de archivos — son accesibles; el dibujo en sí,
  no.
- **Arrastrar y soltar** (reordenar los pasos de un rebase interactivo,
  arrastrar ramas para fusionar) es solo con puntero donde así se indica;
  cada acción de arrastre tiene un equivalente en menú o botón.
- La auditoría detrás de esta página se hizo con VoiceOver en macOS.
  NVDA/JAWS en Windows deberían comportarse igual, pero no se han probado
  sobre el terreno — los informes son bienvenidos como
  [issues](https://github.com/MyAppDesk/gitcito/issues).

## Ajustes relacionados

**Reducir el movimiento** se respeta desde el ajuste del sistema — las
animaciones se convierten en transiciones instantáneas. El contraste del tema
puede afinarse por tema en [Ajustes → Apariencia](themes.md).
