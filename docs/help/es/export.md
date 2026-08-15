---
title: Bundles y archivos
category: Sincronizar y muchos repos
order: 58
summary: Un repositorio como un único fichero del que git puede clonar, o un árbol como un zip que nadie necesita git para abrir.
keywords: bundle git bundle archivo archive zip tarball tar gz exportar export aislado offline usb correo transferir export-ignore gitattributes clonar desde fichero rango
---

# Bundles y archivos

Dos maneras de meter un repositorio en un solo fichero. Parecen
intercambiables y no lo son, y elegir la equivocada es la razón entera por la que
existe esta página.

| | Un **bundle** | Un **archivo** |
|---|---|---|
| Contiene | Historial: commits, ramas, etiquetas | Los ficheros en un commit concreto |
| Se abre con | `git clone` / `git fetch` — *es* un remoto | Cualquier herramienta de descompresión |
| Después | Puedes volver a hacer fetch, fusionar, seguir trabajando | Nada. Es una instantánea |
| Sirve para | Llevar trabajo a una máquina sin red | "Mándame el código en v2.1" |

`⌘K` → **Empaquetar el repositorio** o **Exportar un archivo**.

![Empaquetar un repositorio en un solo fichero, con la opción de rango preparada](../../screenshots/export.webp)

## Bundles

Un bundle es la respuesta de git a un hueco que ninguna red cruza: una máquina
aislada, un USB, un adjunto de correo, un portátil en un avión. El que lo recibe
ejecuta `git clone work.bundle myrepo` y obtiene un repositorio de verdad, con tu
historial y tus ramas, que hace fetch de ese fichero como si fuera un servidor.

Tres alcances:

| Alcance | Qué viaja | Tamaño |
|-------|--------------|------|
| **Todo** | Cada rama y etiqueta, historial completo | El repositorio entero |
| **Una rama o etiqueta** | Esa ref y todo lo que alcanza | Normalmente casi todo |
| **Un rango de commits** | Solo lo que hay entre los dos extremos | Pequeño |

**Un bundle de rango es un parche de historial, no un repositorio.** Registra el
extremo lejano como *prerrequisito*: git se niega a abrirlo en un repositorio que
no tenga ya ese commit, porque no habría nada a lo que enganchar los commits
nuevos. Ese es el comportamiento correcto y una sorpresa la primera vez. Usa un
rango cuando el otro lado ya tiene tu trabajo hasta cierto punto — la etiqueta
que recibió por última vez, el commit desde el que os ramificasteis los dos.

### Recibir uno

**Importar un bundle…** lee el fichero, lista lo que contiene, y dice de entrada
si este repositorio puede usarlo — si faltan prerrequisitos, te dice cuántos en
vez de fallar más tarde con la redacción propia de git.

Las refs importadas aterrizan bajo **`bundle/…`**, en el espacio de nombres de
seguimiento de remotos. Nada local se mueve: ninguna rama avanza en
fast-forward, ningún trabajo se sobrescribe. Después fusionas, haces rebase o
haces checkout de `bundle/main` en tus propios términos, exactamente igual que
con una rama de cualquier otro remoto.

Para arrancar un repositorio *nuevo* desde un bundle, clona del fichero en un
terminal: `git clone work.bundle myrepo`. Gitcito importa dentro de un
repositorio abierto; no clona desde un fichero.

## Archivos

`git archive` escribe el árbol de un commit como un zip o un tarball. Sin
`.git`, sin historial, sin manera de hacer fetch de él — que es justo el punto
cuando el destinatario debería recibir código fuente, no un repositorio.

| Opción | Qué hace |
|--------|-------------|
| Referencia | Rama, etiqueta o commit a exportar. Una etiqueta es la respuesta habitual |
| Formato | `zip`, `tar.gz` o `tar` |
| Envolver en un directorio | Añade una carpeta de primer nivel, para que al descomprimir no se desparramen ficheros por todos lados |
| Solo esta ruta | Exporta un subdirectorio en vez del árbol entero |

### export-ignore es la razón para usar esto

Un repositorio puede marcar rutas en `.gitattributes`:

```
.github/     export-ignore
test/        export-ignore
*.psd        export-ignore
```

Esas rutas **quedan fuera de todos los archivos** aunque sigan en el
repositorio. Así es como un proyecto publica un tarball de release sin su
configuración de CI, sus fixtures y sus 200 MB de ficheros de diseño, con la
regla viviendo en el repositorio y no en el script de release de alguien.

## Límites que conviene conocer

- **Un bundle es una copia completa** salvo que uses un rango. Empaquetar un
  repositorio de 2 GB escribe un fichero de 2 GB, y tarda lo mismo que un clonado.
- **Los bundles vacíos los rechaza git**, no Gitcito: un rango sin nada entre sus
  extremos produce un error en vez de un fichero inútil.
- **Importar no fusiona.** Las refs llegan bajo `bundle/…` y se quedan ahí hasta
  que hagas algo con ellas.
- **Un archivo no tiene historial**, así que no se puede convertir de vuelta en
  un repositorio. Si el destinatario va a necesitar hacer commits, mándale un
  bundle.
- **`export-ignore` solo afecta a los archivos.** No oculta nada de un clonado,
  de un bundle ni del historial — para eso, mira
  [eliminar un fichero del historial](history-purge.md).

Ver también: [Sincronizar](syncing.md) · [Compartir de forma segura](secure-share.md) ·
[Eliminar un fichero del historial](history-purge.md)
