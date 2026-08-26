---
title: Ejecutar y depurar (launch.json)
category: Herramientas del espacio de trabajo
order: 91
summary: Ejecuta tus configuraciones de lanzamiento de VS Code sin salir de Gitcito.
keywords: launch.json ejecutar run depurar debug vscode configuraciones configs tareas tasks preLaunchTask input background segundo plano compound compounds stopAll serverReadyAction sesiones paralelas hot reload hot restart device simulator emulator run target flutter metro expo vite nodemon vitest jest mocha ava wrangler dotnet watch adb simctl avd xcodebuild capacitor
---

# Ejecutar y depurar

Gitcito lee tu `.vscode/launch.json` — el de la raíz y los anidados que haya,
agrupados con separadores — y ejecuta la configuración que elijas en el terminal
integrado.

![El selector de configuraciones de lanzamiento y la barra flotante](../../screenshots/launch-configs.webp)

- Las **variables** de VS Code **se resuelven** (`${workspaceFolder}` y
  compañía).
- El **`preLaunchTask`** de una configuración se ejecuta primero.
- Los valores **`${input:…}`** se preguntan de forma interactiva antes de lanzar
  (`promptString` y `pickString`).
  Un `pickString` muestra sus opciones como un selector real con el valor por
  defecto preseleccionado; un `promptString` marcado `password` se enmascara.
- Las tareas **`isBackground`** (watchers, servidores de desarrollo) se ejecutan
  desacopladas, así que nunca bloquean el lanzamiento.
- Los **compounds** ejecutan cada miembro como su **propia sesión paralela**,
  en un terminal dividido con el nombre del compound — un panel por miembro,
  exactamente como las sesiones de depuración de VS Code. Con `stopAll: true`,
  parar un miembro los para a todos.
  Las tareas que comparten varios miembros se ejecutan **una sola vez**, en su
  propio panel, antes de que arranquen los miembros — un prompt de subir versión
  pregunta una vez, no una por miembro.
  Ese panel se cierra solo si todo va bien y se queda abierto si falla.
- Se respeta **`serverReadyAction`**: cuando la salida de la sesión coincide con
  el patrón configurado, la URL anunciada se abre en tu navegador
  (`openExternally`; `debugWithChrome` / `debugWithEdge` también abren el
  navegador — Gitcito no puede adjuntarle un depurador).

![Un compound ejecutando dos sesiones paralelas](../../screenshots/launch-compound.webp)

![El selector de ${input} con el valor por defecto preseleccionado](../../screenshots/launch-input.webp)

Una barra flotante te da **pausar / reanudar, reiniciar, parar**, y alterna entre
las sesiones en marcha.

Actívalo en **Ajustes → General → Habilitar launch.json**. El botón **LAUNCH**
aparece junto a las pestañas Git / Ficheros.

Un miembro de un compound se muestra como *compound › miembro*, y reiniciarlo
reinicia solo ese miembro.
Si la barra tapa algo que necesitas, arrástrala a un lado por su asa — la
posición se recuerda, y un doble clic en el asa la vuelve a centrar.

Lo que Gitcito deliberadamente **no** hace: ejecuta tus programas en terminales
reales, pero no es un depurador — sin puntos de interrupción, sin inspección de
variables, sin Debug Adapter Protocol. Las configuraciones de solo attach
funcionan cuando llevan un `preLaunchTask` (la tarea es el trabajo); un attach
puro no tiene nada que ejecutar.

## Acciones en caliente — la vía rápida junto a Reiniciar

![Una recarga en caliente enviada desde la barra de depuración](../../screenshots/launch-hot.webp)

La mayoría de los runtimes de desarrollo ya recargan con una tecla: `flutter run`
con **r**, Metro con **r**, nodemon con **rs ⏎**, y Vitest vuelve a ejecutar la
suite con **a**. Reiniciar la configuración de lanzamiento para lograr lo mismo
es el camino lento: mata el proceso, vuelve a ejecutar cada `preLaunchTask` y
tira por la borda el estado de la app.

Por eso Gitcito lee el comando que la configuración lanza de verdad — siguiendo
un `npm run dev` hasta los scripts de tu `package.json` — y pone las teclas de
ese runtime en la barra de depuración. Al pulsar una, la tecla se escribe en la
entrada estándar de la sesión, exactamente como si la hubieras tecleado tú en el
terminal.

| Runtime | Botones | Detrás de ⋯ |
|---------|---------|-------------|
| Flutter (`flutter run`) | Recarga en caliente `r`, reinicio en caliente `R` | debug paint, capa de rendimiento, cambio de plataforma, DevTools |
| Expo | Recargar `r` | menú de desarrollo, depurador |
| Metro / React Native | Recargar `r` | menú de desarrollo, depurador |
| Vite (dev, serve, preview) | Reiniciar el servidor `r ⏎` | abrir el navegador, ver las URL, limpiar la consola |
| nodemon | Reiniciar `rs ⏎` | — |
| Vitest (modo watch) | Ejecutar todas `a`, ejecutar las fallidas `f` | actualizar snapshots |
| Jest (`--watch`) | Ejecutar todas `a`, ejecutar las fallidas `f` | solo los archivos modificados, actualizar snapshots |
| Mocha (`--watch`) | Reejecutar `rs ⏎` | — |
| AVA (`--watch`) | Ejecutar todas `r ⏎`, actualizar snapshots `u ⏎` | — |
| `dotnet watch` | Forzar el reinicio `Ctrl+R` | — |
| Wrangler (`wrangler dev`) | Abrir el navegador `b` | DevTools, local/remoto, limpiar la consola |

Los runtimes que recargan solos no reciben botones: `node --watch`, `ng serve`,
`tsc --watch`, `cargo watch`, `next dev`, webpack-dev-server. Un botón que
envía una tecla que nadie lee es peor que no tener botón, porque parece que ha
funcionado.

**Los límites.** La detección es textual: busca el nombre del programa en la
línea de comandos, así que una configuración que arranca tu servidor a través de
un script envoltorio que Gitcito no puede leer no obtiene nada. Tampoco hay
acuse de recibo: el botón parpadea, y la salida del propio proceso es la
respuesta real. Una sesión pausada o terminada no acepta entrada, así que los
botones se deshabilitan.

**Cuando la suposición falla**, dilo en la propia configuración:

```json
{
  "name": "API (watch)",
  "type": "node-terminal",
  "command": "./scripts/dev.sh",
  "gitcito": { "hotActions": [{ "label": "Reload", "send": "r", "icon": "reload" }] }
}
```

`send` se escribe tal cual — termínalo con `\n` para una CLI que espera Enter.
`icon` es opcional: `reload`, `restart`, `rerun`, `failed`, `snapshot`, `menu`, `debugger`,
`browser`, `clear`, `paint`, `perf`, `platform`, `devtools`, `urls`.
Un array `hotActions` vacío desactiva los botones para esa configuración.

## Destino de ejecución — en qué dispositivo se lanza

![Eligiendo el destino junto a la pestaña LAUNCH](../../screenshots/launch-device.webp)

A una configuración que compila una app móvil hay que decirle dónde ejecutarla.
Esa elección no es solo de Flutter — React Native, Expo, Capacitor y xcodebuild
también aceptan un destino, y cada uno lo escribe distinto — así que Gitcito la
pregunta una vez, junto a la pestaña **LAUNCH**, y escribe la respuesta en la
forma que lee el runtime de esa configuración. El selector solo aparece si
alguna configuración del repositorio admite un dispositivo.

**De dónde sale la lista** — de las herramientas del SDK que tenga la máquina,
consultadas en paralelo:

| Herramienta | Aporta | Se consulta |
|-------------|--------|-------------|
| `flutter devices` / `flutter emulators` | todo, ya normalizado | si la carpeta tiene `pubspec.yaml` |
| `xcrun simctl` | simuladores iOS, arrancados y apagados | en macOS |
| `adb devices` | móviles Android y emuladores ya arrancados | siempre |
| `emulator -list-avds` | emuladores Android aún apagados | siempre |

El mismo simulador lo reportan hasta tres de ellas, así que las entradas se
fusionan por plataforma y nombre; en caso de empate gana la de Flutter, porque su
id es el que espera `flutter run -d`. Las herramientas que no están instaladas se
nombran al final del menú: una lista corta debería explicarse sola.

**Qué hace la elección:**

| Familia | Se escribe como |
|---------|-----------------|
| Flutter | `-d <id>` |
| React Native iOS | `--udid <id>` |
| React Native Android | `--deviceId=<id>` |
| Expo `run:ios` / `run:android` | `--device <id>` |
| Capacitor / Ionic | `--target <id>` |
| xcodebuild | `-destination id=<id>` |
| cualquier otra | solo entorno |

Toda configuración lanzada recibe además `GITCITO_DEVICE_ID`,
`GITCITO_DEVICE_NAME` y `GITCITO_DEVICE_PLATFORM` en su entorno, más
`ANDROID_SERIAL` cuando el destino es un Android real. Eso es lo que permite que
un script envoltorio, una tarea de Gradle o un `adb` suelto apunten al mismo
móvil sin que Gitcito reescriba nada.

**Arrancar un dispositivo apagado.** Todo lo que está bajo *Sin arrancar* se
inicia al elegirlo: `flutter emulators --launch`, `xcrun simctl boot` (y la
ventana del Simulator), o `emulator -avd` desacoplado — así cerrar Gitcito no se
lleva por delante tu emulador de Android.

**Los límites.** Una configuración que ya nombra un dispositivo — un `-d`
explícito, un `--simulator`, el `deviceId` de Dart-Code — se deja intacta: el
selector nunca pisa lo que escribió el autor. Un id que necesitaría comillas cae
al entorno en vez de arriesgar una línea de comandos rota. El menú se filtra por
lo que tus configuraciones pueden alcanzar, así que un repositorio solo-Android
nunca te ofrece un iPhone. Y la lista es una foto fija: conecta un móvil y pulsa
**Actualizar**.

La elección se recuerda por repositorio, y se olvida cuando ese dispositivo deja
de existir.

**Ver también:** [Terminal integrado](terminal.md)
