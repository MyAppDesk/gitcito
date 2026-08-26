---
title: Flutter DevTools
category: Herramientas del espacio de trabajo
order: 93
summary: La vista de red, la línea de tiempo, el inspector y el perfilador de memoria, en una pestaña de Gitcito.
keywords: devtools flutter dart red network timeline inspector memoria perfilador webview panel embebido vm service
---

# Flutter DevTools

DevTools ya tiene la vista de red, la línea de tiempo, el inspector de widgets y
el perfilador de memoria, y es una app Flutter web servida en tu propia máquina.
Así que Gitcito no reimplementa nada de eso, ni habla él mismo con el Dart VM
Service: detecta la dirección y la embebe.

![DevTools abierto en una pestaña de Gitcito](../../screenshots/devtools.webp)

`flutter run` imprime la línea en cuanto el VM service está levantado:

```
The Flutter DevTools debugger and profiler on iPhone 16 Pro is available at:
http://127.0.0.1:9100?uri=http://127.0.0.1:53412/uJ8k=/
```

La sesión de lanzamiento vigila su propia salida buscándola, y a la barra de
depuración le sale un botón. Al pulsarlo, DevTools se abre **en el propio
repositorio**, como uno de sus
[iconos](workspaces.md#páginas-que-pertenecen-a-un-repositorio) en vez de en una
pestaña propia. Un icono por sesión — dos apps a la vez son dos DevTools.

Un **hot restart publica una dirección nueva**, y el panel la sigue mientras su
sesión viva. Cuando la sesión desaparece, el panel conserva la última dirección
que tuvo, que normalmente ya está muerta: cierra el icono y abre DevTools desde
la nueva ejecución.

## Qué herramientas

Una herramienta entra aquí si hace dos cosas: servir una interfaz web en esta
máquina, e imprimir su dirección.

| Herramienta | La línea que imprime |
|-------------|----------------------|
| Flutter DevTools | `The Flutter DevTools … is available at: <url>` |
| Dart DevTools (`dart devtools`) | `Serving DevTools at <url>` |
| Vue DevTools (`@vue/devtools`) | `Vue Devtools … listening on <url>` |
| Prisma Studio | `Prisma Studio is up on <url>` |
| Drizzle Studio | `Drizzle Studio is up and running on <url>` |
| webpack-bundle-analyzer | `Webpack Bundle Analyzer is started at <url>` |
| cualquier otra que nombre DevTools y una dirección | cae en una coincidencia genérica |

**Qué no se puede embeber, y por qué.** El inspector de Node imprime un endpoint
`ws://` para que se enganche un depurador, no una página — y el front de Chrome
DevTools que le acompaña vive tras una URL `devtools://` que ninguna vista
embebida puede cargar. La build independiente de React DevTools es su propia
ventana de escritorio, no una página servida. Ninguna puede ser una pestaña aquí;
ambas necesitarían un cliente de protocolo de depuración, no una dirección.

**Un dev server no es una dev tool.** Vite en `:5173` es tu app, y embeberla
sería un panel de vista previa: otra feature, deliberadamente no esta.

## Qué se le permite hacer

La vista embebida va con correa corta, porque esta app maneja credenciales:

- **Solo loopback.** `127.0.0.1`, `localhost`, `::1`. Un intento de cargar
  cualquier otra dirección se rechaza, y una redirección hacia ella también.
- **Sin preload, sin node integration, con aislamiento de contexto.** La página
  no tiene ningún puente hacia Gitcito.
- **Los enlaces se abren en tu navegador de verdad**, en una ventana normal, no
  dentro del panel.

## Los límites

- **Es DevTools, no algo nuestro.** Lo que pueda esa versión, lo puede el panel;
  lo que no, tampoco nosotros. No hay una vista de red con sabor a Gitcito.
- **Solo Flutter se anuncia así.** Un programa Dart normal imprime una URL del VM
  service pero ninguna dirección de DevTools, así que no aparece botón.
- **Un panel en blanco significa que la app se paró.** DevTools lo sirve *la app
  en ejecución*; cuando la app termina, su dirección deja de responder.

**Ver también:** [Ejecutar y depurar](launch.md)
