---
title: Funciones de IA
category: IA
order: 80
summary: Opcionales, agnósticas del proveedor, y ancladas a tu código real.
keywords: ia ai inteligencia artificial openai anthropic ollama local llm mensaje de commit explicar review revisión wiki anclado grounded
---

# Funciones de IA

Todas las funciones de IA son **opcionales** y están apagadas hasta que
configuras un proveedor. No se envía nada a ningún sitio hasta que pides algo
concreto.

![Ajustes de IA](../../screenshots/settings-ai.webp)

## Proveedores

Preajustes para **OpenAI, Anthropic, OpenRouter, Groq, Mistral y Ollama**
(enteramente local), o cualquier endpoint compatible con OpenAI. Los modelos se
consultan en vivo, y puedes añadir instrucciones propias.

> Solo OpenAI está bien probado en combate. Los demás usan una forma de llamada
> compatible con OpenAI y deberían funcionar — pero no están verificados.

## Qué puede hacer

| Función | Qué obtienes |
|---|---|
| **Mensaje de commit** | Resumen (y cuerpo opcional) a partir de tu diff preparado, en el estilo que elijas |
| **Explicar este archivo** | Explicación en lenguaje llano en un panel lateral — Normal, Conciso, ELI5… incluso Pirata |
| **Explicar al pasar el ratón** | Mantén <kbd>⇧</kbd> y apunta a un identificador para una explicación de una línea, más las líneas de las que la sacó |
| **Resolución de conflictos** | Propone una fusión en la salida editable — nunca la aplica sola |
| **Revisión de PR** | Resume un diff y señala riesgos, cada uno anclado a un `path:line` real |
| **Descripción de PR** · **nombres de rama** | Redactados a partir de los commits y el diff de la rama |
| **Temas** · **paletas del grafo** | Generados desde un prompt |
| **Preparación inteligente** | Sugerencias de qué pertenece a este commit |

## Anclada, no adivinando

La revisión ve el diff como **hunks etiquetados** y solo puede citar esas
etiquetas; después Gitcito resuelve cada etiqueta a un archivo y una línea
reales. Un modelo que se invente una ubicación es **rechazado y se le vuelve a
preguntar**, así que los hallazgos siempre apuntan a código que existe.

Explicar al pasar el ratón lee solo una ventana numerada alrededor del token —
en un diff, solo los hunks visibles en pantalla — así que cuando una definición
vive en otra parte lo dice en lugar de inventársela. Las respuestas se cachean
por versión de archivo.

**Los archivos de secretos enmascarados no se envían nunca.** Tampoco los
archivos que cubren las reglas de enmascarado de secretos.

**Ver también:** [Wiki del repositorio](repo-wiki.md) · [Seguridad y secretos](security.md)
