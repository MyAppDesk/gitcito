---
title: Eliminar un archivo del historial
category: Ramas y cirugía
order: 48
summary: Saca una credencial filtrada o un binario enorme de todos los commits — y entiende exactamente lo que eso cuesta.
keywords: purgar purge historial history rewrite reescribir filter-branch bfg filter-repo filtrada secreto credencial token eliminar borrar archivo grande blob encoger repositorio backup copia de seguridad pre-purge rotar explorar archivos mas grandes
---

# Eliminar un archivo del historial

`git rm` impide que un archivo aparezca en los *nuevos* commits. No hace nada
con los que ya existen: el blob sigue en la base de datos de objetos, sigue en
todos los clones, sigue a un `git show` de distancia.

Eso importa en dos casos — cuando el archivo era una credencial, y cuando pesaba
400 MB.

`⌘K` → **Eliminar archivo del historial**, o clic derecho sobre el archivo — en
el árbol del proyecto, en la lista de archivos de un commit o en el compositor
de commits. El commit que *borró* un archivo suele ser el sitio donde alguien se
da cuenta de que sigue en el historial, así que la salida está también en ese
menú.

## Encontrar la ruta

Dos maneras de entrar, porque responden a preguntas distintas.

**Escríbela** — relativa al repositorio, sin barra inicial — cuando ya sabes qué
has venido a eliminar.

**Explorar el historial** cuando no lo sabes. Lista todas las rutas que se han
commiteado alguna vez, de más pesada a menos, con cuántas versiones tiene cada
una y si sigue estando bajo seguimiento. Las rutas borradas aparecen marcadas
como tales y suelen ser las que quieres: un archivo que ya no está en el árbol
de trabajo pero sigue en todos los clones es exactamente el caso que un diálogo
de archivos normal no puede mostrarte, porque el archivo no está ahí para
seleccionarlo.

Esa misma lista responde a la otra razón por la que la gente llega aquí — *por
qué ocupa dos gigas este clon* — porque está ordenada por los bytes que ocupan
de verdad los blobs de cada ruta. Elegir una fila la mide al instante.

![Todas las rutas commiteadas alguna vez, de más pesada a menos, con las borradas marcadas](../../screenshots/history-purge-browse.webp)

## Mide antes de aceptar

Pulsa **Medir** (o elige una fila). Todavía no se escribe nada. Obtienes:

| | |
|---|---|
| **Commits reescritos** | Todos los commits desde el primero que contuvo el archivo en adelante |
| **Ramas / etiquetas** | Refs que se van a mover |
| **Ocupado por sus blobs** | Los bytes que ocupan realmente esas versiones |
| **Primer commit** | Donde empieza la reescritura — todo lo que va después recibe un hash nuevo |

![La medición: commits reescritos, refs afectadas, bytes ocupados y el aviso de rotar el secreto igualmente](../../screenshots/history-purge.webp)

Si el recuento es cero, la ruta está mal. Eso suele ser una errata o un prefijo
de directorio, no una ausencia.

## Qué hace la reescritura en realidad

Gitcito copia todas las ramas y etiquetas a
`refs/gitcito/pre-purge/<timestamp>/…`, y luego ejecuta:

```sh
git filter-branch --force \
  --index-filter 'git rm --cached --ignore-unmatch -- <path>' \
  --prune-empty --tag-name-filter cat -- --branches --tags
```

`--index-filter` reescribe el índice directamente en vez de hacer checkout de
cada commit, que es la diferencia entre minutos y horas. Usar
`--branches --tags` en lugar de `--all` es deliberado: `--all` incluiría las
refs de respaldo, y la reescritura se comería su propia red de seguridad.

Los commits que no contenían nada más que el archivo eliminado se descartan
(`--prune-empty`). Las etiquetas se reapuntan a sus commits reescritos.

## La copia de seguridad, y por qué el espacio no vuelve todavía

La purga se puede deshacer, y el precio de eso es que **el espacio en disco no
se recupera hasta que tú lo digas**. Mientras exista la copia de seguridad los
commits antiguos siguen siendo alcanzables, así que git no los va a recolectar.

| Acción | Efecto |
|--------|--------|
| **Restaurar** | Cada rama y cada etiqueta vuelven a su commit anterior a la purga; el archivo vuelve con ellas |
| **Descartar la copia** | Borra las refs de respaldo, expira el reflog, ejecuta `git gc --prune=now` — espacio devuelto, purga ya permanente |

Dos pasos y no uno, porque el primero es la mitad recuperable y el segundo no.

## Rota el secreto de todas formas

**Si una credencial llegó a publicarse alguna vez, reescribir tu historial no
la des-filtra.** Puede que alguien la haya traído con un fetch; los servidores
de las forjas conservan objetos sin referenciar; puede que un log de CI la haya
impreso. La reescritura impide que se siga extendiendo — no deshace la
exposición.

Rota la clave. Y después purga, para que la siguiente persona que clone no se la
encuentre.

## Lo que no hará

- **No hará push.** La reescritura es local. Publicar el resultado significa un
  force push a todas las ramas afectadas, y que todos los demás tengan que
  volver a clonar o hacer un reset duro — la [protección contra force
  push](syncing.md) es donde vive esa decisión.
- **Se niega con un árbol de trabajo sucio** o en mitad de un merge o un rebase.
  Una reescritura mueve HEAD una y otra vez, y hacer eso alrededor de trabajo
  sin commitear es la forma de perderlo.
- **Reescribe por ruta, no por contenido.** Eliminar un secreto que se pegó
  dentro de un archivo de código fuente, en lugar de vivir en un archivo propio,
  requiere un filtro de contenido — eso es terreno de
  `git filter-repo --replace-text`, y Gitcito no lo envuelve.
- **`filter-branch` es lento con historiales muy grandes.** Es lo que viene con
  git en todas partes, y por eso es lo que usa Gitcito. En un repositorio con
  decenas de miles de commits, `git filter-repo` desde la [terminal](terminal.md)
  es la herramienta más rápida.
- **Los clones de los demás no son tu repositorio.** Conservan el historial
  antiguo hasta que vuelvan a clonar.
