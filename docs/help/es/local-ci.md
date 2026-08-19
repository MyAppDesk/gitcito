---
title: CI local
category: Sincronizar y muchos repos
order: 58
summary: Ejecuta las GitHub Actions del repo en local con act — antes de hacer push de nada.
keywords: ci local act actions workflow flujo de trabajo runner docker pipeline probar test antes de push before push nektos verdict badge notes per-commit veredicto insignia notas por commit
---

# CI local

El ciclo push–esperar–cruz roja–arreglar–push desperdicia diez minutos por
vuelta. Con [act](https://nektosact.com) los mismos workflows se ejecutan en
contenedores Docker en tu máquina, y Gitcito los dirige: elige un workflow,
pulsa Ejecutar y observa el mismo log que imprimiría la CI — antes de que nada
salga de tu máquina.

![CI local](../../screenshots/local-ci.webp)

## Una integración, no un runtime incluido

Gitcito deliberadamente **no** incluye act ni Docker — una app que arrastra
consigo un runtime de contenedores es lo contrario de un cliente git. Es una
integración opcional: actívala en **Ajustes → Integraciones** (o en el propio
diálogo), y Gitcito detecta qué está instalado y te guía por el resto —
`brew install act`, un daemon de Docker en marcha, listo. Nada se ejecuta hasta
que las tres condiciones se cumplen: activada, act instalado, Docker accesible.

## Qué hace

- Lista todos los workflows bajo `.github/workflows`, por su `name:`.
- **Ejecutar** lanza el workflow con act contra tu **árbol de trabajo** — con
  tus cambios sin commitear incluidos, que es exactamente la gracia: probar
  antes de commitear, no después de hacer push.
- La salida se transmite en directo al diálogo; **Detener** mata la ejecución.
  Un código de salida 0 muestra **Correcto**; cualquier otro, **Falló** con el
  código.

## Veredictos por commit en el grafo

![Veredictos de Local-CI en el grafo](../../screenshots/local-ci-verdicts.webp)

Una ejecución terminada fija su resultado al commit que probó: un pequeño
matraz marca la fila en **verde o rojo** en el grafo, para que veas de un
vistazo qué commits ya han sobrevivido a la CI en local. El veredicto se guarda
como una nota de git bajo `refs/notes/gitcito-ci` — local a tu máquina, nunca
se hace push de él por defecto.

Regla de honestidad: el veredicto solo se fija cuando tu árbol de trabajo
estaba **limpio**. Una ejecución sobre cambios sin commitear probó algo que
ningún commit contiene, así que muestra su resultado en el diálogo pero no
marca nada.

## Límites

- act es una imitación muy buena de los runners de GitHub, no una perfecta: las
  actions que necesitan servicios alojados en GitHub, secretos o imágenes de
  runner exóticas pueden comportarse distinto. Un verde local es una evidencia
  sólida, no una garantía.
- Una ejecución a la vez por repositorio; iniciar otra cancela la primera.
- Solo ejecuciones a nivel de workflow — elegir jobs concretos, matrices o
  eventos es terreno de act; ejecútalo en el [Terminal integrado](terminal.md)
  cuando necesites flags.
- La primera ejecución descarga las imágenes de runner — cuenta con que sea
  lenta esa vez.

**Ver también:** [Hosting y pull requests](hosting.md) · [Terminal integrado](terminal.md)
