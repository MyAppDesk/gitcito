---
title: Atributos de archivo
category: Herramientas del espacio de trabajo
order: 96
summary: .gitattributes con interfaz — finales de línea, binarios, changelogs con merge de unión, export-ignore y diffs legibles para Word y PDF.
keywords: gitattributes atributos attributes diff driver textconv merge union binario binary export-ignore eol crlf lf text auto filter clean smudge lfs linguist check-attr finales de linea
---

# Atributos de archivo

`.gitattributes` es el archivo de más valor que hay en git y que casi nadie
escribe. Es la forma que tiene un repositorio de **enseñarle a git cosas sobre
su propio contenido**: qué archivos son binarios, cuáles deberían concatenarse
en vez de entrar en conflicto, cuáles no salen nunca en un archivo comprimido,
qué finales de línea le tocan a cada cual.

Lo importante: se commitea. Una regla que añadas arregla el problema para todo
el que clone, en cualquier sistema operativo, para siempre — al contrario que un
ajuste en tu propia configuración, que te lo arregla a ti y deja que tus
compañeros lo descubran por las malas.

`⌘K` → **Atributos de archivo**.

![Las reglas que ya lleva un repositorio, los preajustes, el comprobador de rutas y los drivers de diff](../../screenshots/attributes.webp)

## Qué hacen las reglas

| Atributo | Arregla |
|-----------|-------|
| `text=auto eol=lf` | Finales de línea que cambian según quién hiciera el checkout del archivo |
| `binary` | Que git intente diffear o fusionar a tres bandas un PSD, un DOCX, un recurso compilado |
| `merge=union` | Un changelog al que todo el mundo añade líneas, y con el que todo el mundo entra en conflicto |
| `-merge` | Archivos donde una fusión a tres bandas produce sinsentidos — lockfiles, código generado |
| `export-ignore` | Configuración de CI y fixtures que se cuelan dentro del tarball de un release |
| `diff=<driver>` | Diffs ilegibles de formatos que *sí* son legibles, si hay un conversor |
| `filter=lfs` | Archivos grandes guardados vía [LFS](lfs-sparse.md) |
| `linguist-vendored` | Código vendorizado que cuenta como tuyo en las estadísticas de lenguajes |

`binary` es la forma corta de `-diff -merge -text`, que son tres respuestas a
"deja de hacer conjeturas sobre este archivo" en una sola palabra.

## Edición

Los preajustes rellenan un patrón y sus atributos; edita el patrón antes de
añadirlo — `CHANGELOG.md` es una sugerencia, no una regla sobre tu proyecto.

**Las ediciones son quirúrgicas.** Añadir una regla para un patrón que ya tiene
una reescribe esa línea donde está, en lugar de añadir al final una segunda
regla que gana por venir después. Los comentarios del archivo sobreviven
intactos, porque el "por qué" que hay junto a una regla suele valer más que la
regla.

Cada guardado es una acción normal de Gitcito: sale su toast, y **Deshacer**
restaura el archivo exactamente como estaba.

**Un repositorio puede tener varios archivos de atributos.** Uno en la raíz, uno
en cualquier subdirectorio, y un `.git/info/attributes` privado que no se
commitea nunca y solo aplica en tu máquina — el sitio adecuado para una regla
que va sobre ti, no sobre el proyecto. Gitcito los lista todos y dice cuál es
cuál.

## ¿Qué se aplica a una ruta?

Las reglas vienen de varios archivos, gana la más específica, y leerlos para
deducir la respuesta es adivinar. **¿Qué se aplica a una ruta?** ejecuta
`git check-attr` y muestra lo que concluye el propio git — la única respuesta
que cuenta.

## Drivers de diff: hacer legible un documento de Word

Un `.docx` es un zip. Un `.pdf` es un grafo de objetos comprimido. Git los
diffea por lo que son — ruido — así que el historial de un documento resulta
ilegible aunque el documento no lo sea.

Un **driver de diff** arregla esto con `textconv`: un comando que convierte el
archivo en texto *solo a efectos del diff*. El archivo de tu árbol de trabajo no
se toca; git se limita a comparar el texto convertido.

Dos mitades, y hacen falta las dos:

1. `diff.<name>.textconv` en la configuración de git — el comando conversor.
2. `*.docx diff=<name>` en `.gitattributes` — a qué archivos aplica.

Los botones de aquí hacen las dos cosas de golpe. Gitcito **no incluye ninguno
de esos conversores** y no disimula al respecto: comprueba tu PATH y ofrece solo
lo que hay realmente instalado, dejando el resto en gris con el binario que
haría falta.

| Driver | Necesita | Te da |
|--------|-------|-----------|
| `word` | `pandoc` | Diffs de prosa de los `.docx` |
| `pdf` | `pdftotext` (poppler) | Diffs de texto de los `.pdf` |
| `excel` | `xlsx2csv` | Diffs por filas de hojas de cálculo |
| `exif` | `exiftool` | Qué cambió en una imagen, cuando los píxeles son opacos |
| `json` | `jq` | Diffs de JSON estables y con las claves ordenadas |

La mitad del conversor vive en **tu** configuración, no en el repositorio — git
no va a ejecutar comandos que te entregue un clon, y esa es una propiedad de
seguridad que merece la pena conservar. Así que un compañero que clone recibirá
la regla `diff=word` y, hasta que instale pandoc, el viejo diff ilegible. Dilo
en tu README.

## Límites que conviene conocer

- **Los filtros clean/smudge no se ofrecen aquí.** Las reglas `filter=<name>` se
  pueden escribir a mano, pero Gitcito no configurará los comandos: un filtro se
  ejecuta en cada checkout de cada archivo que encaje, y uno mal hecho corrompe
  tu árbol de trabajo en silencio.
- **`text=auto` cambia lo que se commitea**, normalizando los finales de línea
  al entrar. En un repositorio ya existente, añádelo y luego ejecuta
  `git add --renormalize .` a conciencia, en un commit propio.
- **Los atributos no se aplican retroactivamente.** Marcar hoy un archivo como
  `binary` no cambia cómo se guardaron sus diffs pasados; cambia cómo lo trata
  git a partir de ahora.
- **Las reglas solo hacen efecto donde el archivo es visible.** Una regla en
  `design/.gitattributes` no dice nada sobre `src/`.
- Gitcito escribe archivos enteros, así que un archivo formateado a mano vuelve
  con su formato — pero una regla que Gitcito reescriba queda reformateada al
  espaciado canónico de git, `pattern attr attr`.

Ver también: [LFS y checkout disperso](lfs-sparse.md) ·
[Bundles y archivos comprimidos](export.md) · [Opciones de merge](merge-options.md) ·
[Hooks](hooks.md)
