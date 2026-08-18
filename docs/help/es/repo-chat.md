---
title: Chat del repositorio
category: IA
order: 82
summary: Pregunta sobre este repositorio, con los archivos y commits que fijes como contexto — y deja que proponga acciones de git que apruebas antes de ejecutarse.
keywords: chat preguntar pregunta asistente contexto adjuntar fijar arrastrar soltar commit archivo evidencia anclado ia panel acciones ejecutar aprobar aprobación automática permitir corregir error aviso
---

# Chat del repositorio

Hay preguntas que se responden antes preguntando que buscando. *¿Dónde ocurre
realmente el refresco del token? ¿Qué cambió este commit, en una frase? ¿Por qué
existe este archivo?* El chat del repositorio responde sobre el repositorio
abierto y muestra las líneas en las que se basó.

Comparte la columna derecha con **Detalles**: las pestañas de arriba alternan
entre ambos, así el grafo no pierde su selección cuando preguntas algo.

![El chat del repositorio con contexto fijado](../../screenshots/repo-chat.webp)

## Qué lee

Cada respuesta se construye en dos pasadas. La primera elige un conjunto pequeño
de rutas y búsquedas literales dentro de la lista de archivos rastreados del
propio repositorio. La segunda responde usando solo los fragmentos que esa
pasada trae, y solo puede citar esos fragmentos: un archivo o una línea
inventados son un error de validación, no una respuesta plausible.

| Incluido | Excluido |
|---|---|
| Archivos rastreados, tal como están en tu copia de trabajo | Archivos sin rastrear |
| Diffs preparados y sin preparar de archivos rastreados | Todo lo que coincida con una regla de ignorados, aunque esté rastreado |
| Rama, adelanto/retraso y la lista de rutas cambiadas | [Archivos que parecen secretos](security.md), binarios, rutas generadas |

Que use la copia de trabajo significa que puedes preguntar por cambios sin
confirmar. También significa que esos cambios salen de tu equipo al preguntar:
los recibe el proveedor configurado en [Funciones de IA](ai.md).

Un matiz: con las [propuestas de acciones](#ejecutar-acciones-desde-el-chat)
activadas, los **nombres** de los archivos sin rastrear sí se incluyen en el
estado del repositorio — «prepara el archivo nuevo» los necesita — pero su
contenido sigue sin leerse nunca.

## Fijar contexto

El modelo decide qué leer. Fijar es cómo lo anulas: lo fijado se lee **primero**
y se lleva la parte mayor del presupuesto de contexto.

Cuatro formas de fijar, todas al mismo grupo de fichas sobre el cuadro de texto:

| Haz esto | Obtienes |
|---|---|
| Pulsa una ficha sugerida | El archivo abierto en el visor, o el commit seleccionado en el grafo |
| Arrastra una fila de la pestaña **Archivos** | Ese archivo |
| Arrastra una fila del **grafo de commits** | Ese commit: su mensaje y su diff por fragmentos |
| **+** → *Elegir un archivo…*, o arrastra desde el Finder/Explorador | Cualquier archivo del disco, incluso fuera del repositorio |

Las fichas siguen fijadas para las preguntas de seguimiento; la `×` de una ficha
la quita, y borrar la conversación las quita todas. El tope son ocho.

Un commit fijado aporta su mensaje y hasta doce fragmentos de diff. Los
fragmentos que tocan una ruta excluida se descartan de ese diff, no el commit
entero.

## Ajustes

**Ajustes → IA → Chat del repositorio**:

| Ajuste | Qué hace |
|---|---|
| **Haz preguntas sobre el repositorio** | Desactivado quita la pestaña, el botón de la barra y el destino del atajo. El resto de la IA sigue funcionando |
| **Modelo del chat** | Un modelo solo para el chat. Vacío significa el del perfil: preguntar cuesta menos que revisar, y suele bastar uno más pequeño |
| **Solo contenido confirmado** | Responde con el último commit en vez de la copia de trabajo: los cambios sin confirmar nunca salen del equipo |
| **Proponer acciones de git en el chat** | Desactivado vuelve el chat de solo lectura otra vez: sin tarjetas de acciones ni desplegable de aprobación |
| **Cómo se ejecutan las acciones propuestas** | El modo de aprobación — consulta [Modos de aprobación](#modos-de-aprobación). Las acciones destructivas confirman de todos modos |

Con la IA desactivada por completo, el chat desaparece con ella: no queda un
panel ofreciendo respuestas que nadie puede dar.

El modelo del chat también se cambia desde la cabecera del propio panel, junto
al nombre del proveedor: es el mismo ajuste, sin abrir los Ajustes.

![Ajustes del chat del repositorio](../../screenshots/settings-repo-chat.webp)

## Trabajar con los mensajes

Los mensajes son texto normal. Selecciona cualquier parte y cópiala, o haz clic
derecho en una burbuja: **Copiar** toma la selección, **Copiar mensaje** el
mensaje completo — una respuesta se copia como su fuente Markdown — y, si el
clic cayó sobre un enlace, **Copiar enlace** toma su dirección.

Los enlaces se abren en tu navegador predeterminado, nunca dentro de Gitcito —
tanto los enlaces Markdown de las respuestas como las direcciones `https://`
escritas en tus propios mensajes.

Cuando un mensaje menciona una imagen — una ruta del repositorio como
`docs/logo.png`, o una URL que termina en una extensión de imagen — pasar el
cursor sobre la mención muestra una pequeña vista previa. Las rutas del
repositorio se leen de tu árbol de trabajo; una mención que no corresponde a
una imagen legible simplemente no muestra nada.

![Vista previa de imagen al pasar el cursor](../../screenshots/repo-chat-image-hover.webp)

## Ejecutar acciones desde el chat

Pide un cambio en vez de un dato — *prepara los archivos markdown, haz commit
de esto como un fix, pon la salida del build en la lista de ignorados* — y la
respuesta llega con una **tarjeta de acciones**: los pasos concretos que el
asistente quiere dar, una fila por acción, con los botones **Ejecutar** e
**Ignorar**. Nada de lo que hay en la tarjeta ha ocurrido todavía; el modelo
solo puede proponer, y cada propuesta se comprueba contra la copia de trabajo
antes de que llegues a verla — una acción que nombre un archivo inexistente se
rechaza, no se muestra.

![Acciones propuestas en el chat](../../screenshots/repo-chat-actions.webp)

El conjunto de acciones es el mismo que usa el asistente **Ejecutar** de la
barra de herramientas: patrones de ignorados, preparar, quitar de preparados,
commit, stash, descartar, rama, checkout, etiqueta. Todo lo que quede fuera —
push, pull, reset, rebase, operaciones forzadas — se rechaza por diseño; el
chat te dirá que uses la interfaz dedicada en su lugar.

### Modos de aprobación

El desplegable con el escudo bajo el cuadro de texto (también en **Ajustes →
IA → Chat del repositorio**) decide cómo se ejecuta una tarjeta:

| Modo | Ejecuta |
|---|---|
| **Preguntar siempre** | Nada hasta que pulsas **Ejecutar** en la tarjeta |
| **Ejecutar las acciones seguras automáticamente** | Las propuestas hechas solo de tareas reversibles — preparar, quitar de preparados, ignorar, rama, etiqueta — se ejecutan al llegar; lo demás espera al botón |
| **Ejecutar todas las acciones automáticamente** | Toda propuesta se ejecuta al llegar, salvo las destructivas |

Una propuesta que **descartaría cambios sin confirmar siempre pregunta
primero**, en todos los modos, y la confirmación nombra los archivos que se
perderían. La tarjeta informa de lo que ocurrió realmente — cuántas acciones se
ejecutaron, o el error que las detuvo — y el asistente conoce el resultado, así
que una pregunta de seguimiento sabe si su plan se ejecutó o se descartó.

### Corregir errores con el asistente

Cuando una operación de git falla y el chat de IA está disponible, el aviso de
error gana un botón con destellos: abre el chat con el fallo pegado en el
cuadro de texto, así «por qué falló esto y qué hago ahora» es un solo clic. El
borrador es editable — no se envía nada hasta que pulsas Enviar.

## Qué se niega a hacer

- **Los archivos que parecen secretos nunca se leen**, estén fijados o no: la
  ficha vuelve marcada como omitida, con el motivo. Fijar no es una forma de
  saltarse el [enmascarado de secretos](security.md).
- **Los binarios y los archivos de más de 512 KB** de fuera del repositorio se
  omiten igual. Dentro del repositorio rigen las reglas habituales.
- **Nunca escribe por su cuenta.** El modelo no tiene herramientas, solo texto:
  un cambio llega como tarjeta de propuesta, se ejecuta solo bajo [tus reglas
  de aprobación](#modos-de-aprobación), y un paso destructivo siempre confirma.
  Con **Proponer acciones de git en el chat** desactivado, ni siquiera propone.
- **Las conversaciones viven solo en memoria.** Cada repositorio mantiene su hilo
  aparte; al salir de Gitcito se descartan.

## Cómo abrirlo

| Teclas | Qué hace |
|---|---|
| El botón de bocadillo en la barra de herramientas | Alterna la pestaña Chat |
| <kbd>⌘⌥B</kbd> / <kbd>Ctrl+Alt+B</kbd> | Alterna todo el panel derecho |
| <kbd>⌘⏎</kbd> / <kbd>Ctrl+Enter</kbd> | Envía el mensaje |

Consulta [Teclado y atajos](keyboard.md) para el resto, incluido cómo reasignar
los interruptores de panel.

**Ver también:** [Funciones de IA](ai.md) · [Seguridad y secretos](security.md) ·
[Wiki del repositorio](repo-wiki.md)
