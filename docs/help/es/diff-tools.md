---
title: Herramientas externas de diff y merge
category: Ramas y cirugía
order: 43
summary: Entrega un archivo a Kaleidoscope, Beyond Compare, Meld o lo que ya uses — Gitcito lee la propia lista de herramientas de git.
keywords: difftool mergetool diff merge externo herramienta kaleidoscope beyond compare meld kdiff3 p4merge araxis opendiff filemerge vimdiff winmerge diff.tool merge.tool orig copia de seguridad backup
---

# Herramientas externas de diff y merge

El [visor de diffs](diffs.md) y el [resolutor de tres paneles](conflicts.md) de
Gitcito cubren casi todos los días. Algunos no: un archivo generado de 4.000
líneas, una fusión donde necesitas ver cuatro columnas a la vez, o sencillamente
la herramienta que llevas usando una década y lees más rápido que cualquier otra.

**Ajustes → General → Herramientas externas de diff y merge.**

## Es la lista de git, no la nuestra

Gitcito no mantiene ninguna tabla propia. Los desplegables son
`git difftool --tool-help` y `git mergetool --tool-help`, y por eso:

- Las herramientas que git ya encontró en tu máquina aparecen primero; las que
  conoce pero no encuentra van después, marcadas como *no instalada*.
- **Una herramienta propia funciona sin soporte extra.** Si tienes

  ```sh
  git config --global difftool.mine.cmd 'mycompare "$LOCAL" "$REMOTE"'
  ```

  entonces `mine` aparece en el desplegable como cualquier herramienta integrada.
- Tus elecciones se escriben en **`diff.tool` y `merge.tool` de tu configuración
  global de git** — las mismas claves que lee tu terminal. Configúralo aquí y
  `git difftool` en la línea de comandos se comporta igual. Configúralo allí y
  Gitcito lo recoge.

Git conoce de fábrica unas treinta herramientas, entre ellas Kaleidoscope, Beyond
Compare, Meld, KDiff3, P4Merge, Araxis, DiffMerge, WinMerge, FileMerge, VS Code y
la familia vim.

## Dónde aparecen las acciones

| Superficie | Acción |
|---------|--------|
| Un archivo modificado en el [compositor de commits](committing.md) | **Diff en \<herramienta\>** — el árbol de trabajo contra el índice |
| El [resolutor de conflictos](conflicts.md) | **Merge en \<herramienta\>** — la fusión a tres bandas completa |

Ambas entradas solo aparecen cuando hay una herramienta realmente configurada; un
`git difftool` sin configurar simplemente daría error, y un botón inerte es peor
que ningún botón.

## Qué pasa mientras la herramienta está abierta

Gitcito espera a que se cierre. Es deliberado — `git mergetool` solo prepara el
archivo resuelto *después* de que la herramienta salga, así que hay un resultado
real que informar — y por eso el botón muestra un spinner en lugar de volver de
inmediato.

El resto de la app sigue respondiendo: esto se ejecuta fuera del bloqueo por
repositorio que serializa las operaciones normales de git, así que una
herramienta de merge que dejas abierta durante la comida no congela la pestaña
que hay detrás.

Cuando una fusión externa sale bien, git prepara el archivo por su cuenta y
Gitcito cierra el resolutor y refresca. Si cierras la herramienta sin guardar,
git lo dice y no cambia nada.

## El archivo `.orig`

`git mergetool` deja por defecto una copia de seguridad `<file>.orig` junto al
archivo resuelto — comportamiento de git, no de Gitcito. El interruptor de
Ajustes escribe `mergetool.keepBackup`; desactívalo y un archivo resuelto no deja
nada detrás.

## Límites

- **Solo diffs del árbol de trabajo.** La entrada del compositor compara lo que
  tienes ahora contra el índice. Comparar dos commits históricos por fuera no
  está cableado — usa el [visor de diffs](diffs.md) integrado o la
  [comparación](merging.md) para eso.
- **Un archivo cada vez.** No hay ninguna pasada de "diff de todos los archivos
  modificados".
- **Gitcito nunca instala nada.** Una herramienta marcada como *no instalada*
  sigue siendo seleccionable, porque git puede encontrarla después de que la
  instales — pero fallará hasta que lo hagas.
