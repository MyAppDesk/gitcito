---
title: Clonar
category: Empieza aquí
order: 2
summary: Clona desde una URL o directamente desde tu hosting — y estrecha lo que se descarga cuando el repositorio es enorme.
keywords: clonar clone shallow superficial depth profundidad partial parcial filter blob none single branch rama submodules submódulos recursive ls-remote selector de ramas unshallow monorepo
---

# Clonar

**Nuevo repositorio → Clonar**, o `⌘K` → *Clonar*. Pega una URL, o inicia sesión
en GitHub, GitLab, Bitbucket o Azure DevOps y elige entre tus propios
repositorios — el token del [perfil](profiles.md) elegido se usa para el clon y
después se descarta, nunca se escribe en `.git/config`.

Elige una carpeta padre y un nombre; la línea bajo los campos muestra exactamente
dónde va a aterrizar el repositorio. Una carpeta que ya existe se rechaza en
lugar de fusionarse con ella.

## Avanzado — estrechar el clon

Todo lo que hay bajo **Avanzado** está desactivado por defecto: no lo toques y
obtienes un clon normal y completo. Se gana su sitio en los repositorios donde
"completo" significa veinte minutos y varios gigabytes.

![El diálogo de clonado con Avanzado abierto: parcial, superficial, una sola rama, submódulos y un selector de ramas](../../screenshots/clone-advanced.webp)

| Opción | Qué hace git | Qué cuesta |
|--------|---------------|---------------|
| **Clon parcial** | `--filter=blob:none` | Todo el historial, sin contenido de archivos. Los blobs llegan bajo demanda, así que abrir un archivo antiguo necesita red. |
| **Clon superficial** | `--depth=N` | Solo existen los N commits más recientes. Blame, log, bisect y range-diff se detienen en el corte. |
| **Solo una rama** | `--single-branch` | Las demás ramas se quedan en el remoto hasta que las traigas con fetch. |
| **Clonar submódulos** | `--recurse-submodules` | Cada submódulo también se saca a disco — más tiempo ahora, ningún directorio ausente después. |
| **Rama a la que cambiar** | `--branch <name>` | Empieza en esa rama en lugar de en la predeterminada del remoto. |

**Parcial antes que superficial.** Un clon parcial conserva todos los commits —
el historial sigue siendo consultable, y solo el contenido de los archivos se
descarga de forma perezosa. Un clon superficial descarta historial de verdad:
`git log` termina en el corte y blame no puede ver más allá. Si estás clonando un
monorepo para trabajar en él, el parcial suele ser el que quieres.

Lo superficial se puede deshacer: `git fetch --unshallow` en la
[terminal](terminal.md) rellena el historial de vuelta.

### Elegir la rama

Escribe un nombre de rama, o pulsa **Listar ramas** para preguntarle al remoto
qué tiene (`git ls-remote --heads`) y elegir de un desplegable. Eso es un único
viaje de ida y vuelta por la red, hecho solo cuando pulsas el botón — no se
consulta nada mientras escribes.

Si el listado falla — una URL privada todavía sin token, una errata, sin red — el
campo se queda como una caja de texto normal y el propio clon informa del error
real.

### Dos notas sobre las opciones

- **`--depth` implica `--single-branch`.** Con un clon superficial, dejar *Solo
  una rama* sin marcar es lo que pide de vuelta las demás ramas
  (`--no-single-branch`), y por eso cambia la pista que hay debajo.
- **Clonar una carpeta local** normalmente ignora `--depth` por completo, porque
  git enlaza en duro el almacén de objetos en lugar de descargarlo. Gitcito clona
  a través de una URL `file://` cuando pides una copia superficial de un
  repositorio local, así que la profundidad que pediste es la profundidad que
  obtienes.

## Progreso

La barra informa de lo que informa git: contando, comprimiendo, recibiendo,
resolviendo, sacando a disco. Una etapa que no puede informar de un total muestra
una barra indeterminada en lugar de un porcentaje falso.

El nuevo repositorio se abre en una pestaña, anclado al perfil con el que
clonaste.
