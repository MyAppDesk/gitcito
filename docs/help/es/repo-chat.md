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

**Una segunda mirada.** La primera pasada tiene que adivinar qué archivos
importan solo por su nombre, que es justo la conjetura que falla en «¿desde
dónde se llama esto?». Por eso una respuesta puede preguntar de vuelta en lugar
de adivinar: puede nombrar más rutas, más búsquedas literales o hashes de
commits del historial reciente, y la pregunta se repite con lo que eso traiga.
Ocurre como mucho dos veces —cada ronda es otra llamada al modelo que esperas— y
en la última debe responder con lo que tenga. No verás nada de esto salvo una
espera algo más larga y una respuesta mejor.

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
| **Proponer acciones de archivos y Git en el chat** | Desactivado vuelve el chat de solo lectura otra vez: sin tarjetas de acciones ni desplegable de aprobación |
| **Modo de solo lectura de archivos** | Activado bloquea crear, editar, reemplazar y eliminar archivos, pero mantiene disponibles las acciones Git. Está activado de forma predeterminada |
| **Cómo se ejecutan las acciones propuestas** | El modo de aprobación — consulta [Modos de aprobación](#modos-de-aprobación). Las acciones destructivas confirman de todos modos |
| **Permitir que el chat proponga acciones remotas** | Desactivado de forma predeterminada. Activado añade fetch, pull, push, abrir un pull request y enviar una pila a lo que el chat puede proponer |

Con la IA desactivada por completo, el chat desaparece con ella: no queda un
panel ofreciendo respuestas que nadie puede dar.

El modelo del chat también se cambia desde la cabecera del propio panel, junto
al nombre del proveedor: es el mismo ajuste, sin abrir los Ajustes.

El botón de la varita junto al título del panel abre el **asistente de
configuración de IA** — un flujo guiado que genera archivos de configuración
del asistente (instrucciones, agentes, hooks) para este repositorio. Consulta
[Funciones de IA](ai.md).

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
respuesta llega con una **tarjeta de acciones**. Una conversación vacía ofrece
algunas peticiones de ejemplo como fichas bajo la introducción; al pulsar una
se rellena el cuadro de texto para que puedas editarla antes de enviarla. La
tarjeta enumera los pasos concretos que el asistente quiere dar, una fila por
acción, con los botones **Ejecutar** e **Ignorar**. Nada de lo que hay en la tarjeta ha ocurrido todavía; el modelo
solo puede proponer, y cada propuesta se comprueba contra la copia de trabajo
antes de que llegues a verla — una acción que nombre un archivo inexistente se
rechaza, no se muestra.

![Chat vacío con peticiones de ejemplo](../../screenshots/repo-chat-empty.webp)

![Acciones propuestas en el chat](../../screenshots/repo-chat-actions.webp)

El chat del repositorio puede proponer ediciones exactas, crear o reemplazar
archivos completos y eliminarlos, y después acciones Git: patrones de ignorado,
preparar, quitar de preparado, commit, stash, descartar, rama, cambiar de rama,
etiqueta y —porque se le muestran la lista de ramas y los commits recientes—
merge, rebase, revert y cherry-pick. Gitcito calcula localmente el diff
desplegable. Los archivos existentes deben proceder de la evidencia leída; se
rechazan destinos inseguros, secretos, ignorados, generados, binarios, obsoletos,
demasiado grandes o enlazados mediante symlink. Reset, reescribir el historial,
borrar ramas y toda operación forzada siguen solo en su interfaz dedicada.

Un merge o un rebase pueden pararse en un conflicto. Si ocurre, la ejecución se
detiene ahí, la tarjeta marca esa fila como fallida y conserva la cuenta de lo
ya ejecutado, y el aviso de conflicto toma el relevo igual que si la operación
se hubiera lanzado desde la barra.

Todo el lote se vuelve a comprobar antes de la primera escritura y se revierte
si falla un paso. Antes de un commit, Gitcito comprueba que haya cambios
preparados. La tarjeta marca cada acción completada, fallida u omitida y conserva
los resultados parciales. Después, una llamada separada sin acciones resume el
resultado real.

**También puede escribir `.gitcito.json`.** Al chat se le da la forma del
[archivo de configuración del repositorio](repo-config.md), así que *añade
enlaces de tickets para JIRA-1234* o *protege las ramas de release* se convierte
en una acción de archivo escrita contra el esquema real, no en claves plausibles
que el cargador rechazaría. Requiere las acciones de archivo activadas — el
mismo interruptor de **Modo de solo lectura de archivos**.

**Las filas que piden un dibujo lo tienen.** Un resumen de una línea basta para
«prepara dos archivos» y se queda muy corto para «abre cuatro pull requests
sobre una pila», así que las filas que describen una forma la dibujan: la rama
que publica un push y cuánto va por delante, las dos referencias de un merge o
un rebase, los commits que un revert o un cherry-pick repetirían con su asunto,
el pull request tal como quedará, y una pila como una escalera con la base de
cada nivel y si el envío lo abriría, lo reapuntaría o lo dejaría igual.

### Acciones que salen de tu equipo

Obtener, actualizar, publicar, abrir un pull request y enviar una pila están
**desactivados de forma predeterminada**, tras **Permitir que el chat proponga
acciones remotas**. Publicar trabajo merece una decisión explícita, y con el
ajuste desactivado ni siquiera se le dice al modelo que esas acciones existen:
no puede proponer una y ser rechazado, que es el fallo que enseña a la gente a
activar cosas sin leerlas.

Con el ajuste activado:

| Acción | Qué hace |
|---|---|
| **Obtener** / **Actualizar** | El mismo fetch y pull de la barra; el modo de pull (merge, solo avance rápido, rebase) forma parte de la propuesta |
| **Publicar** | Publica una rama en un remoto. **Nunca con force**: un push forzado no existe en el vocabulario de una propuesta, así que no se puede proponer |
| **Abrir PR** | Abre un pull request, borrador o no, contra el origin del repositorio. La tarjeta conserva el enlace después |
| **Enviar pila** | El envío completo de la [pila de PRs](stacks.md): publicar cada nivel, abrir o reapuntar un pull request por nivel, escribir la sección de navegación y registrar la pila en GitHub |

![Un plan del chat que publica y abre un pull request](../../screenshots/repo-chat-remote-actions.webp)

Un push propuesto pasa antes las mismas comprobaciones que el push de la barra:
la confirmación de rama protegida, el aviso de publicar
[archivos que parecen credenciales](security.md) y la lista de comprobación
previa al push del repositorio. Son diálogos, así que se responden antes de que
el plan empiece, no desde dentro.

### Deshacer un plan

Un plan se aprueba como un lote, así que se deshace como un lote. Antes de la
primera acción que pueda cambiar algo, Gitcito anota dónde estaba la rama y toma
una instantánea de la copia de trabajo; la tarjeta terminada ofrece entonces
**Deshacer el plan**. Devuelve la rama a ese commit y restaura el árbol, lo que
tira lo que el plan produjo, así que confirma primero y nombra el commit al que
vuelve. Los pull requests que abrió siguen abiertos: un remoto no es algo que
una instantánea local pueda retirar.

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
| <kbd>Enter</kbd> | Envía el mensaje |
| <kbd>Shift+Enter</kbd> | Inserta una nueva línea |

Consulta [Teclado y atajos](keyboard.md) para el resto, incluido cómo reasignar
los interruptores de panel.

**Ver también:** [Funciones de IA](ai.md) · [Seguridad y secretos](security.md) ·
[Wiki del repositorio](repo-wiki.md)
