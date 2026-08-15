---
title: Previsualizar un pull request
category: Sincronizar y muchos repos
order: 57
summary: Ejecuta el pull request de otra persona en tu máquina sin hacer ningún commit — en cualquier host, incluidos los PR desde forks.
keywords: previsualizar preview pull request merge request PR MR fork checkout local probar refs/pull refs/merge-requests pull-requests remoto rama
---

# Previsualizar un pull request

Revisar un diff en el navegador te dice si el código se lee bien. No te dice si
la aplicación sigue arrancando. Para averiguar eso tienes que ejecutar la rama —
y ahí es donde la gente se atasca, porque un pull request desde un fork vive en
un repositorio que nunca has clonado, y a menudo en uno al que no puedes hacer
push.

Previsualizar en local resuelve eso con un dato que casi nadie necesita
aprender: las forjas publican la cabeza de cada pull request como una ref de git
normal **en el repositorio de destino**. El fork no tiene por qué ser
alcanzable, no necesitas un token de API, y no se añade ningún segundo remoto.
Un fetch, y el código está en tu disco.

![Previsualizar en local: elige el remoto, el pull request y cómo aplicarlo](../../screenshots/pr-preview.webp)

| Host | Dónde vive la cabeza del PR |
|------|-------------------------|
| GitHub, GitHub Enterprise, Gitea, Forgejo, Gogs | `refs/pull/<n>/head` |
| GitLab (en la nube y autoalojado) | `refs/merge-requests/<n>/head` |
| Bitbucket Cloud, Bitbucket Server | `refs/pull-requests/<n>/from` |
| Azure DevOps | `refs/pull/<n>/merge` |

Gitcito sondea las cuatro en un solo `ls-remote`, así que una forja desconocida o
autoalojada funciona mientras siga una de estas convenciones.

## Cómo abrirlo

- La lista de pull requests de la barra lateral — el botón de flecha en
  cualquier entrada. Esto funciona con todos los hosts, a diferencia de la vista
  de detalle, que es solo para GitHub.
- La paleta de comandos: **Previsualizar pull request en local**.
- Dentro de la vista de detalle de un pull request, junto al botón de "abrir en
  el navegador".

## Qué tienes que darle

**Remoto** — el repositorio *contra* el que se abrió el pull request,
normalmente `origin`. No el fork.

**Pull request** — el número, o una URL pegada del navegador. `7`, `#7` y
`https://github.com/owner/repo/pull/7` valen todos; y también las formas de URL
de GitLab, Bitbucket y Azure DevOps. Pulsa **Buscar** y Gitcito te dice qué ref
ha resuelto y a qué commit apunta, antes de traerse nada.

**Rama remota** — la segunda pestaña, para cuando no hay ninguna ref de PR que
encontrar: un host que no las publica, o una rama que simplemente quieres
probar. Da el nombre de la rama tal como existe en el remoto.

## Las dos formas de aplicarlo

Ninguna escribe un commit. Es deliberado — una previsualización de la que no
puedes marcharte no es una previsualización.

| Modo | Qué pasa | Cómo lo deshaces |
|------|--------------|-----------------|
| **Una rama local** | La ref se trae a su propia rama (`pr/7` por defecto) y se hace checkout. Tus otras ramas quedan intactas. | Deshacer vuelve a la rama en la que estabas y borra la rama de previsualización. |
| **Una fusión sin commit** | La ref se fusiona en la rama actual con `--no-commit --no-ff`, dejando el árbol combinado preparado para que puedas compilarlo y probarlo. | Deshacer aborta la fusión. |

Previsualizar dos veces el mismo pull request reutiliza la misma rama,
moviéndola a la nueva cabeza — muy útil cuando el autor publica un arreglo
mientras tú lo estás probando. Si esa rama ya existe, Gitcito lo dice y pregunta
antes de resetearla, porque cualquier commit que viviera solo ahí se perdería.

## Lo que no va a hacer

- **No puede inventarse una ref que el host no publica.** Algunas
  configuraciones autoalojadas desactivan las refs de PR; algunas forjas nunca
  las tuvieron. Recibes un claro "no hay ref para #n" y la pestaña de rama
  remota como salida.
- **No se trae etiquetas.** Una previsualización no debería arrastrar el espacio
  de nombres de etiquetas de otra persona hasta tu repositorio.
- **El modo de fusión necesita un árbol de trabajo limpio.** Git se niega a
  fusionar sobre trabajo sin commit; haz [stash](stashes.md) primero.
- **Una previsualización no es una revisión.** Pone el código en tu máquina — no
  aprueba, ni comenta, ni fusiona nada. Eso es
  [hosting y pull requests](hosting.md).
- **Los forks privados siguen siendo privados.** La ref del PR la sirve el
  repositorio de destino, así que el acceso depende de tus credenciales para
  *ese* remoto — mira [seguridad](security.md).

## Limpiar después

Una rama de previsualización es una rama normal: bórrala desde la barra lateral
cuando termines, o pulsa deshacer justo después de la previsualización. Una
fusión de previsualización que quedó sin commit se puede descartar con deshacer,
o resolver y confirmar con un commit si al final decides que la quieres — momento
en el que deja de ser una previsualización y se convierte en
[una fusión](merging.md).
