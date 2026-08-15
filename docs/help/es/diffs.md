---
title: Diffs y vistas previas
category: Leer cambios
order: 20
summary: Vista partida, resaltado por palabras, diffs de imágenes y vistas previas de archivos.
keywords: diff partido split lado a lado side-by-side palabra word level espacios whitespace imagen vista previa preview markdown docx pdf
---

# Diffs y vistas previas

## Leer un diff

| Interruptor | Qué hace |
|---|---|
| **Unificado ↔ partido** | Lado a lado cuando quieres comparar, apilado cuando quieres leer |
| **Por palabras** | Resalta solo los tokens que cambiaron dentro de una línea editada — rojo en la vieja, verde en la nueva |
| **Ignorar espacios** | Oculta los reindentados para que salga a la superficie el cambio de verdad |
| <kbd>⌘F</kbd> | Buscar dentro del diff, con salto al siguiente/anterior |

![Diff partido con resaltado por palabras](../../screenshots/split-diff.webp)

Sobre cada diff está el [resumen semántico](semantic-diff.md) — qué cambió,
símbolo a símbolo, en lugar de línea a línea.

## Diffs de imágenes

Las imágenes modificadas reciben una comparación de verdad: una al lado de la
otra, o un tirador para deslizar entre el antes y el después.

![Diff de imagen](../../screenshots/image-diff.webp)

## Vista previa de cualquier cosa

El modo **Vista previa** renderiza el archivo en vez de mostrar su código
fuente: Markdown, Word (`.docx`), Excel (`.xlsx`), PDF, vídeo, audio, imágenes,
y código con resaltado de sintaxis para todo lo demás.

![Vista previa de Markdown](../../screenshots/markdown-preview.webp)

## Pestaña Archivos

La pestaña **Archivos** de la barra lateral izquierda explora el árbol de
trabajo en sí, con distintivos de estado en las carpetas (añadido / modificado /
borrado) que agregan lo que hay dentro de ellas.

![La pestaña de archivos con una vista previa](../../screenshots/file-tree.webp)

![Distintivos de carpeta que suman lo que cambió dentro de cada una](../../screenshots/tree-badges.webp)

**Ver también:** [Diff semántico](semantic-diff.md) · [Preparación](staging.md)
