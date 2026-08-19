---
title: Funciones de IA
category: IA
order: 80
summary: Opcionales, agnósticas del proveedor, y ancladas a tu código real.
keywords: ia ai inteligencia artificial openai anthropic ollama local llm mensaje de commit explicar review revisión wiki anclado grounded cuentas account clave api suscripción cli claude codex gemini modelos
---

# Funciones de IA

Todas las funciones de IA son **opcionales** y están apagadas hasta que
configuras un proveedor. No se envía nada a ningún sitio hasta que pides algo
concreto.

![Ajustes de IA](../../screenshots/settings-ai.webp)

## Cuentas

Una **cuenta** es una forma de llegar a un modelo: un proveedor, dónde
alcanzarlo y cómo se autentica. Puedes configurar varias y conviven — una clave
del trabajo, otra personal, un modelo local, una CLI en la que ya iniciaste
sesión.

Los preajustes cubren **OpenAI, Anthropic, Google Gemini, OpenRouter, Groq,
Mistral** y **Ollama** (enteramente local), además de cualquier endpoint
compatible con OpenAI.

Anthropic usa su propia API `/v1/messages` en vez de una llamada con forma de
OpenAI, así que los modelos Claude funcionan de verdad en lugar de solo
aparentarlo. A Gemini se llega por el endpoint compatible con OpenAI de Google.

### Usar una suscripción en vez de una clave de API

Elige el proveedor **CLI local** para responder con una CLI de agente ya
instalada y con sesión iniciada en esta máquina — `claude`, `gemini` o `codex`.
Gitcito ejecuta el binario con tu indicación y lee su respuesta; no hay clave de
API que pegar ni token que guardar.

Gitcito solo ejecuta un comando que tú configuraste como cuenta, y siempre con
una lista de argumentos en vez de un shell, así que nada de un diff o del nombre
de una rama puede interpretarse como un comando.

> **Esto no es más privado que una clave de API.** Tus indicaciones siguen
> llegando al mismo proveedor, bajo tu propia cuenta, igual que con una clave.
> Lo que cambia es la facturación y la configuración, no adónde va el texto.

Si el comando no está en tu `PATH`, escribe su ruta completa en la cuenta.

### Qué cuenta responde a qué

En **Qué cuenta responde a qué**, cada función — mensajes de commit, chat,
explicar, revisión de PR, resolución de conflictos, wiki, temas — puede apuntar
a su propia cuenta y modelo. Deja una fila en la predeterminada para seguir a la
cuenta predeterminada. Modelo barato para los mensajes de commit y uno potente
para el chat es el reparto habitual.

### Aviso de actualización

Al actualizar desde una versión anterior a las cuentas, esto se muestra una vez. El proveedor y la clave que tenías pasan a ser la primera cuenta; no hay que reconfigurar nada a mano.

![Aviso de actualización](../../screenshots/ai-accounts-notice.webp)

## Modelos

Las listas de modelos vienen del propio proveedor y se guardan en caché un día;
**Obtener modelos** actualiza una al instante. Bajo la lista, Gitcito dice de
dónde salió: en directo, de caché (con la fecha), o la lista integrada de
reserva y por qué.

La lista se filtra a los modelos que pueden responder a una petición de chat,
así que los de embeddings, voz e imagen se quedan fuera. Toda casilla de modelo
acepta además texto libre, de modo que un modelo en vista previa, un despliegue
privado o una etiqueta de Ollama recién descargada siempre se puede usar aunque
el proveedor no la liste.

Un proveedor al que aún no le has dado clave, o que está inalcanzable, recurre a
una pequeña lista integrada en vez de a un desplegable vacío.

Ningún proveedor publica una lista ordenada ni curada, así que el criterio es de Gitcito: las instantáneas con fecha se pliegan sobre el modelo del que son instantánea (`gpt-4o` cubre `gpt-4o-2024-08-06`), y lo que queda va ordenado de más nuevo a más viejo en vez de alfabéticamente. **Mostrar todos los modelos**, al final de la lista, devuelve todo lo que envió el proveedor.

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
| **Asistente de configuración de IA** | Genera archivos de configuración del asistente (instrucciones, agentes, hooks) para el repositorio — el botón de la varita en la cabecera del panel de chat |

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

## Límites

- Las listas de modelos de reserva se quedan obsoletas entre versiones. Para eso
  está la consulta en vivo; la reserva solo cubre el caso en que consultar no es
  posible.
- Filtrar la lista de un proveedor a modelos aptos para chat se hace por nombre,
  así que un modelo de chat con un nombre inusual puede quedar fuera. Escríbelo
  a mano.
- Una cuenta de CLI no puede informar del uso de tokens salvo que la CLI lo
  haga, así que las cifras de uso y coste en Ajustes contarán de menos esas
  llamadas.
- Las respuestas por CLI son más lentas que una llamada directa a la API: el
  binario arranca una sesión entera por petición.
- Las claves se guardan por cuenta en el llavero de tu sistema. Borrar una
  cuenta borra su clave.

**Ver también:** [Wiki del repositorio](repo-wiki.md) · [Seguridad y secretos](security.md)
