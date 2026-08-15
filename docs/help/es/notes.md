---
title: Notas de commit
category: Leer el historial
order: 26
summary: Adjunta texto a un commit que ya está publicado — sin cambiar el commit.
keywords: notas notes git notes anotar comentario commit refs/notes revisión ticket amend reescribir push notes fetch notes publicar traer
---

# Notas de commit

Un mensaje de commit se escribe una vez y luego queda congelado: cambiarlo
reescribe el commit, le da un hash nuevo y rompe a todo el que ya tenga el
antiguo. Eso está bien una hora después de hacer el commit, y es imposible una
semana más tarde.

`git notes` es la salida. Una nota se guarda **al lado** del commit, bajo
`refs/notes/commits`, y adjuntar una deja el commit idéntico byte a byte. Así que
funciona sobre historial que ya está publicado — que es justo cuando más ganas
tienes de añadir algo.

Uso típico: la revisión que lo aprobó, el ticket que cerró, por qué se revirtió,
en qué release salió.

## Escribir una

Selecciona un commit. Bajo el mensaje hay una sección **Nota**: *Añadir una
nota*, escribe, **Guardar nota**. Varias líneas valen.

![Escribir una nota bajo el mensaje de un commit publicado y guardarla](../../screenshots/clip-commit-note.webp)

Guardar una nota es una acción normal de Gitcito — lanza un aviso, y **Deshacer**
devuelve el texto anterior, incluida la restauración de una nota que hayas
quitado.

Vaciar el texto y guardar elimina la nota; no existe tal cosa como una nota
vacía.

## Encontrar una

Las notas son invisibles en un log normal, que es la razón principal por la que
nadie las descubre nunca. Gitcito marca los commits que llevan una con un iconito
de nota en la columna de mensaje del grafo, de forma que la anotación se puede
encontrar sin saber que está ahí.

Desde la línea de comandos, `git log --notes` las imprime bajo cada mensaje.

## Compartirlas

**Esta es la parte que sorprende a todo el mundo: un `git push` normal no publica
las notas, y un `git fetch` normal no se las trae.** Viven fuera de `refs/heads`
y `refs/tags`, así que los refspecs por defecto se las saltan por completo. Las
notas escritas en tu portátil se quedan en tu portátil hasta que alguien las
mueva explícitamente.

Herramientas → **Nota** → *Publicar notas* / *Traer notas*, por remoto. Ejecutan:

```sh
git push <remote> refs/notes/*
git fetch <remote> +refs/notes/*:refs/notes/*
```

Algunos hosts además necesitan que las notas estén habilitadas o permitidas de su
lado; un rechazo ahí es política del host, no un límite de Gitcito.

## Límites

- **Una sola ref de notas.** Gitcito lee y escribe la de por defecto,
  `refs/notes/commits`. Los espacios de nombres personalizados
  (`git notes --ref=review`) no están expuestos — un repositorio que los use no
  verá aquí esas notas.
- **Sin fusión de notas divergentes.** Si dos personas anotan el mismo commit y
  ambas publican, git rechaza la segunda subida. Resolver eso pasa por
  `git notes merge` en la [terminal](terminal.md).
- **Las notas no se guardan en la copia de seguridad de una purga** ni en las
  [instantáneas](recovery.md). Son refs corrientes y sobreviven a las operaciones
  normales, pero un repositorio reclonado desde cero empieza sin ellas.

Ver también: [Hacer commits](committing.md) · [El grafo de commits](graph.md)
