---
title: Problemas
category: Herramientas del espacio de trabajo
order: 92
summary: Lo que dicen los analizadores de tu proyecto, y qué parte ha causado tu diff.
keywords: problemas analizador analizadores diagnósticos errores avisos warnings lint tsc typescript eslint dart analyze clippy cargo go vet ruff panel archivos cambiados
---

# Problemas

Todo proyecto ya trae una herramienta que te dice qué está mal en él — `tsc`,
`dart analyze`, ESLint, Clippy, `go vet`, Ruff. Lo que ninguna te dice es si
**tu** diff es el que ha metido los cuarenta avisos que acaba de imprimir.
Gitcito sabe qué archivos están sucios, así que la misma lista responde a esa
pregunta con un interruptor.

![El panel de problemas y el contador de la barra de estado](../../screenshots/problems.webp)

La barra de estado lleva la cuenta — errores, avisos, información: las tres
cifras que VS Code enseñó a leer a todo el mundo. Haz clic (o usa **Problemas**
en la paleta de comandos) y el panel se abre abajo, agrupado por archivo. Al
pulsar una línea se abre el archivo justo ahí.

## Qué ejecuta

| Si el repositorio tiene | Gitcito ejecuta |
|-------------------------|-----------------|
| `pubspec.yaml` | `dart analyze --format=machine` |
| `tsconfig.json` | `tsc --noEmit` |
| una configuración de ESLint | `eslint -f json` |
| `Cargo.toml` | `cargo clippy --message-format=short` |
| `go.mod` | `go vet ./...` |
| `pyproject.toml` o `ruff.toml` | `ruff check --output-format=json` |

**Flutter entra por la fila de Dart:** una app Flutter es un proyecto Dart, y
`flutter analyze` llama al mismo analizador que `dart analyze`.

**El proyecto no tiene por qué estar en la raíz.** Esos marcadores se buscan
también unos niveles más abajo, así que una app Flutter en `mobile/` o un paquete
en `apps/web` se encuentran, y cada analizador se ejecuta en el directorio de su
propio proyecto. Un proyecto anidado del mismo tipo se omite cuando un ancestro
ya lo cubre — un `tsconfig.json` en la raíz dice justamente eso — y un barrido se
detiene en doce proyectos, porque un monorepo no debería lanzar cincuenta
compiladores.

Un binario en `node_modules/.bin` gana al del PATH, igual que lo resuelven los
propios scripts del proyecto. Todo se ejecuta en paralelo, y la salida de cada
herramienta se convierte en una única forma, sin duplicados y ordenada: dos
analizadores que informan de la misma línea producen una sola fila.

**Nada se ejecuta solo.** `tsc --noEmit` en un repositorio grande son decenas de
segundos, y estos comandos son la cadena de herramientas del repositorio, no de
Gitcito. Arrancan cuando abres el panel o pulsas actualizar, nunca por su
cuenta. Por eso la lista es una foto fija: edita un archivo y queda obsoleta
hasta que la vuelvas a ejecutar.

## Solo lo que has cambiado

El interruptor de la cabecera descarta todos los problemas de archivos que no
has tocado. Esa es la vista que merece la pena tener abierta: una lista plana de
todos los avisos de un código se convierte en papel pintado en una semana,
mientras que "¿los ha metido este diff?" es una pregunta que conviene responder
antes de commitear.

Las pastillas de severidad también filtran. Apagadas significan *mostrar todo*;
encender una reduce la lista a esa severidad.

## Los límites

- **No hay servidor de lenguaje.** Esto es un barrido, no un demonio: sin
  subrayados mientras escribes, sin resultados antes de pedirlos.
- **Una herramienta que no está instalada se nombra, no se esconde.** El pie
  dice qué no se pudo ejecutar, porque una lista vacía sin explicación es peor
  que una corta con un motivo.
- **Solo se entiende la salida legible por máquina.** Cada analizador se lee de
  su formato máquina documentado; una herramienta configurada para imprimir otra
  cosa es invisible aquí.
- **El tope son cinco mil problemas.** Pasado eso el panel lo dice y para — un
  repositorio en ese estado tiene un problema mayor que una barra de scroll.

**Ver también:** [CI local](local-ci.md) · [Terminal integrado](terminal.md)
