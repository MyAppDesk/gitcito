---
title: Wiki del repositorio (IA)
category: IA
order: 81
summary: Una guía generada de un código donde cada afirmación cita un archivo.
keywords: wiki documentacion generada codebase codigo resumen dependencias arquitectura exportar docs
---

# Wiki del repositorio

Apúntalo a un repositorio y escribe una wiki corta que explica el código.

## La ficha del repositorio

- **Desglose de lenguajes** por bytes.
- **El stack** — frameworks mostrados como insignias (Next, Angular, Electron,
  Tailwind, Django…).
- **Dependencias** leídas directamente de tus manifiestos (`package.json`,
  `Cargo.toml`, `go.mod`, `pyproject.toml`, `pubspec.yaml`, `Gemfile`…) y
  agrupadas por su papel arquitectónico. El andamiaje — stubs de tipos,
  loaders, plugins de lint — se filtra primero, y sólo pueden aparecer paquetes
  que el proyecto declara de verdad.
- **Un grafo de dependencias entre módulos**, extraído del código fuente (JS/TS,
  Python, Go, Rust, Dart, Ruby, C/C++, PHP) y resuelto contra los archivos del
  propio repositorio, de modo que importar un paquete nunca se convierte en una
  arista falsa.

## Las páginas escritas

Gitcito planifica un puñado de páginas a partir de los archivos que el
repositorio versiona — primero documentación y manifiestos, luego lo que más se
mueve — y escribe cada página con los archivos que cubre.

**Cada afirmación cita el archivo del que salió**, y una afirmación que ningún
archivo respalda se descarta en lugar de publicarse. Las páginas se escriben en
paralelo y se guardan de una sola vez, así que una ejecución fallida nunca
reemplaza una wiki buena. Te avisa cuando la wiki se escribió en un commit más
antiguo.

## Exportar

**Exportar a docs/** escribe todo el conjunto en `docs/wiki/` como Markdown
enlazado — así se puede commitear, revisar en un PR y leer en tu hosting.

Los archivos con pinta de secreto no se envían nunca.

**Ver también:** [Funciones de IA](ai.md)
