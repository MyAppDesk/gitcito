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

Los botones de aquí hacen las dos cosas de golpe. Para Word, Excel, JSON y `.strings`,
Gitcito **incluye el conversor él mismo** — el mismo análisis de documentos que
usan sus vistas previas, expuesto como un pequeño comando `gitcito-textconv`
dentro de la app — así que esos cuatro funcionan sin instalar nada. El resto
sigue necesitando una herramienta real en tu PATH: Gitcito lo comprueba y deja
en gris lo que falta, en vez de escribir un driver que falla al primer diff.

| Driver | Necesita | Te da |
|--------|-------|-----------|
| `word` | nada — viene con Gitcito | Diffs de prosa de los `.docx` |
| `excel` | nada — viene con Gitcito | Diffs por filas (CSV por hoja) de los `.xlsx`/`.xls` |
| `json` | nada — viene con Gitcito | Diffs de JSON estables y con las claves ordenadas |
| `strings` | nada — viene con Gitcito | Diffs por líneas de un `.strings` en UTF-16, que git llama binario |
| `pdf` | `pdftotext` (poppler) | Diffs de texto de los `.pdf` |
| `exif` | `exiftool` | Qué cambió en una imagen, cuando los píxeles son opacos |

### El que muerde en proyectos iOS

`Localizable.strings` va en UTF-16 durante casi toda la historia de Xcode, y
UTF-16 está lleno de bytes NUL, así que git lo llama binario y no muestra
**nada**:

```
diff --git a/Localizable.strings b/Localizable.strings
Binary files a/Localizable.strings and b/Localizable.strings differ
```

Y es justo el archivo donde más importa ver qué cadena movió alguien. El driver
`strings` lo descodifica solo para el diff — leyendo la marca de orden de bytes
en vez de suponerla, así que un `.strings` moderno en UTF-8 pasa intacto en vez
de convertirse en galimatías.

Los String Catalogs (`.xcstrings`, Xcode 15 en adelante) son JSON, y el driver
`json` los cubre: ordena las claves, así que una traducción añadida arriba deja
de reescribir el archivo entero en el diff.

Los límites del conversor incluido, dichos sin rodeos: `.doc` (el viejo formato
binario de Word) no se entiende, solo `.docx`; el PDF no está cubierto —
Gitcito previsualiza los PDF con el visor del navegador y no tiene extractor de
texto que reutilizar —; y cada diff de un documento paga un breve coste de
arranque del conversor. Con `git config diff.<name>.cachetextconv true`, git
cachea la salida por blob.

La mitad del conversor vive en **tu** configuración, no en el repositorio — git
no va a ejecutar comandos que te entregue un clon, y esa es una propiedad de
seguridad que merece la pena conservar. Los drivers incluidos, además, apuntan
a *tu* ruta de instalación de Gitcito, así que un compañero que clone recibirá
la regla `diff=word` y, hasta que conecte su propio conversor (Gitcito u otro),
el viejo diff ilegible. Dilo en tu README.

## Filtros clean/smudge — con una prueba en seco primero

Un **filtro** reescribe el contenido al entrar y salir del repositorio: `clean`
se ejecuta al hacer stage (árbol de trabajo → repo), `smudge` en el checkout
(repo → árbol de trabajo). Así funciona git-lfs, y así eliminan los equipos las
credenciales o el ruido generado de lo que se commitea.

También es la cosa más peligrosa a la que puede apuntar `.gitattributes`: un
filtro se ejecuta en **cada checkout de cada archivo que encaje**, y uno mal
hecho corrompe tu árbol de trabajo en silencio. Por eso Gitcito se niega a ser
aquí un simple cuadro de texto. Configurar un
filtro pasa por una **prueba en seco** contra archivos reales de tu repositorio
que encajen con el patrón:

1. El comando `clean` se ejecuta sobre una copia de cada archivo que encaje
   (hasta cinco) — nada del repositorio ni de su configuración se toca.
2. Si se da un comando `smudge`, se ejecuta sobre la salida limpia y el
   resultado se compara byte a byte con el original — la **comprobación de ida
   y vuelta**. Un filtro que no completa la ida y vuelta significa que un
   checkout no restaurará lo que tenías.
3. Solo tras una prueba en seco con exactamente los valores que vas a guardar
   se activa el botón de guardar. Una prueba en seco fallida — error del
   comando, ningún archivo que encaje, o una ida y vuelta que difiere — aún se
   puede guardar, pero solo a través de una advertencia explícita que dice qué
   se puede perder.

Guardar escribe `filter.<name>.clean/smudge` en tu configuración **local** de
git y la regla `filter=<name>` en el archivo de atributos, y deja una entrada
de deshacer que restaura lo que la configuración tuviera antes. El interruptor
**required** establece `filter.<name>.required`, con el que git hace fallar la
operación en vez de dejar pasar los archivos en silencio cuando el filtro se
rompe.

Los límites, dichos sin rodeos: la prueba en seco muestrea hasta cinco archivos
que encajen, de como mucho 5 MB cada uno, con un límite de 10 segundos por
comando — un filtro que se porta bien con la muestra puede portarse mal con un
archivo que la muestra no vio. Los comandos viven en *tu* configuración, así
que un compañero que clone recibe la regla `filter=<name>` pero no los
comandos; sin ellos (y sin **required**) sus archivos pasan sin cambios.

## Límites que conviene conocer

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
