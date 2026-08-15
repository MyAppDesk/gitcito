---
title: Git flow
category: Ramas y cirugía
order: 46
summary: Empieza y termina features, releases y hotfixes sin memorizar qué rama se fusiona dónde.
keywords: gitflow git flow feature release hotfix develop main master prefix versiontag prefijo modelo de ramas empezar terminar start finish tag etiqueta rama
---

# Git flow

El [modelo de ramas git-flow](https://nvie.com/posts/a-successful-git-branching-model/)
son cinco reglas y mucha contabilidad. Las reglas son fáciles; la contabilidad
es lo que la gente falla a las seis de la tarde de un día de release — fusionar
un hotfix en `main` y olvidarse de `develop`, o etiquetar la rama equivocada.

`⌘K` → **Git flow** se encarga de la contabilidad.

![El diálogo de git flow en una rama de release: empezar una rama arriba, terminarla abajo](../../screenshots/gitflow.webp)

## La estructura

| Rama | Contiene |
|--------|-------|
| **Rama publicada** (`main`) | Lo que está en producción. Cada release se etiqueta aquí. |
| **Rama de integración** (`develop`) | Donde se acumula el trabajo terminado entre releases. |
| `feature/*` | Una unidad de trabajo, sacada de develop. |
| `release/*` | Una versión en estabilización, sacada de develop. |
| `hotfix/*` | Un arreglo urgente, sacado de **main** — producción no puede esperar a develop. |

Gitcito lee y escribe las mismas claves de config `gitflow.*` que usa la CLI de
`git flow` (`gitflow.branch.master`, `gitflow.prefix.feature`, …). Un
repositorio en el que alguien ya ejecutó `git flow init` se reconoce al
instante, y un repositorio configurado aquí funciona después con la CLI. Gitcito
ejecuta comandos de git normales de principio a fin — no hace falta tener la CLI
instalada.

**Configurar** escribe esas claves y, si la rama de integración todavía no
existe, la crea a partir de la rama publicada. No se toca nada más. Puedes
cambiar cualquier nombre o prefijo después desde **Editar estructura**.

## Empezar

Elige un tipo, escribe un nombre, pulsa **Empezar**. El diálogo enseña la rama
que va a crear y la rama de la que la va a sacar antes de que te comprometas:

```
feature/search   from develop
hotfix/1.0.1     from main
```

El nombre es lo que escribes tú; el prefijo sale de la estructura.

## Terminar

**Terminar** es la parte que merece automatizarse, porque son varios pasos que
tienen que ocurrir todos:

| Tipo | Qué hace Gitcito |
|------|-------------------|
| Feature | Fusiona en develop con `--no-ff`, borra la rama, te deja en develop |
| Release | Fusiona en main, la etiqueta, fusiona en develop, borra la rama, te deja en develop |
| Hotfix | Fusiona en main, la etiqueta, fusiona en develop, borra la rama, te deja en **main** |

`--no-ff` es deliberado: el commit de fusión es lo que hace visible la rama en
el [grafo](graph.md) después. Sin él, una feature corta se desvanece en una
línea recta y el modelo pierde aquello para lo que servía.

La etiqueta es `<prefijo de etiqueta de versión><nombre>` — `release/1.1.0` pasa
a ser `v1.1.0` con el prefijo por defecto. Desmarca **Etiquetar el release**
para saltártelo, y escribe un mensaje de etiqueta si quieres algo más que el de
por defecto.

### Lo que se niega a hacer

- **Un árbol de trabajo sucio lo detiene.** Haz commit o un [stash](stashes.md)
  primero; terminar fusiona dos ramas y mueve HEAD dos veces, y hacer eso
  alrededor de trabajo sin commitear es como la gente lo pierde.
- **Una fusión con conflictos revierte todo el proceso.** Si la fusión en main
  sale bien pero la de develop entra en conflicto, te quedarías con un release a
  medio terminar. Gitcito devuelve cada rama a donde estaba y reporta el
  conflicto. Fusiona esa rama a mano, resuélvela en el [resolutor de
  conflictos](conflicts.md), y el flujo es tuyo para terminarlo a mano.
- **Nunca hace push.** Terminar es local. Publica main, develop y la etiqueta
  nueva cuando estés listo — mira [sincronizar](syncing.md).

### Deshacer

Un solo **Deshacer** lo devuelve todo a su sitio: las dos ramas vuelven a sus
commits anteriores, la etiqueta se borra y la rama terminada se recrea en su
punta antigua. Esa es toda la razón por la que terminar es seguro de probar.

## Cuándo no usarlo

Git flow encaja con software que tiene releases versionados y una rama de
producción con soporte. Si despliegas desde `main` varias veces al día, las
ramas de release y hotfix son ceremonia que no vas a usar — las [ramas
apiladas](stacks.md) o unas ramas cortas y llanas salidas de `main` encajan
mejor. La mitad de features del modelo sigue funcionando bien por su cuenta.
