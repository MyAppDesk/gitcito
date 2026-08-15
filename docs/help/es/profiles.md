---
title: Perfiles
category: Hazlo tuyo
order: 101
summary: Identidades y tokens separados para el trabajo y para todo lo demás.
keywords: perfil perfiles profile identidad identity git user email tokens cuentas accounts cambiar switch
---

# Perfiles

Un perfil agrupa una **identidad de Git** (nombre y correo) con sus **tokens de
integración**. Cambia de perfil y cambian los dos a la vez — los commits llevan
la autoría correcta y las llamadas a la API usan la cuenta adecuada.

Útil cuando la misma máquina lleva repositorios de trabajo y personales, o
cuando tienes dos cuentas de GitHub.

![Un perfil: la identidad de git a un lado, sus tokens de integración al otro](../../screenshots/settings-profiles.webp)

## Vinculación por repositorio

Un repositorio se puede **vincular a un perfil**, de modo que un fetch en segundo
plano sobre él siempre se autentique con la cuenta correcta — incluso mientras
estás mirando un repositorio que pertenece a la otra.

Los tokens viven en el [llavero del sistema](security.md), nunca en el fichero de
ajustes.

**Ver también:** [Seguridad y secretos](security.md) · [Hosting](hosting.md)
