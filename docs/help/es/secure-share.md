---
title: Compartir seguro
category: Seguridad
order: 72
summary: Mueve secretos, notas o un espacio de trabajo entero entre máquinas — o compañeros — en un solo archivo cifrado.
keywords: compartir seguro secure share exportar export importar import paquete bundle cifrado encrypted espacio de trabajo workspace transferir maquina equipo notas estructura sin backend
---

# Compartir seguro

Poner a punto una máquina nueva — o a un compañero nuevo — suele significar
volver a meterlo todo a mano. Compartir seguro lo empaqueta en un único archivo
`.gitcito` cifrado: las funciones de equipo de Gitcito **no tienen backend**,
así que el archivo *es* el transporte. Envíalo por donde ya envíes archivos; la
contraseña viaja por separado.

![Exportar los ajustes de un repositorio como paquete cifrado](../../screenshots/secure-share.webp)

![La misma exportación para un espacio de trabajo entero](../../screenshots/secure-workspace.webp)

## Qué puede entrar

| Sección | Contenido |
|---|---|
| **Caja fuerte** | Los secretos de la caja fuerte global (las entradas por repositorio se quedan donde están) |
| **Archivos del repositorio** | Archivos de configuración y de secretos sin seguimiento, rematerializados en las mismas rutas relativas al importar |
| **Estructura del espacio de trabajo** | La disposición de pestañas en sí — grupos, colores, orden — con los repositorios referenciados por URL del remoto, nunca por tus rutas locales |
| **Notas de commit** | El `refs/notes/commits` de un repositorio, aplicado al importar sin necesitar acceso de escritura a ningún remoto |

Los secretos solo se incluyen cuando **marcas la casilla**. Un paquete sin esa
marca no contiene credencial alguna. Los ajustes de la aplicación no viajan en
un paquete — tienen su propia exportación en JSON plano en Ajustes.

## Importar

La pantalla de importación enseña lo que hay dentro **antes** de aplicar nada,
sección por sección, y los repositorios se emparejan con los que ya tienes —
primero por URL del remoto, luego por carpeta — de modo que importar no vuelve a
clonar el mundo entero.

Una sección de **estructura del espacio de trabajo** recrea el espacio de
trabajo con los repositorios que ya tienes; los que te faltan se listan con su
remoto para que puedas clonarlos primero y volver a importar — Gitcito nunca
clona aquí por ti. Una sección de **notas de commit** muestra en vista previa lo
que aterrizaría — nuevas, idénticas, distintas o ancladas a commits que no
tienes — y las notas distintas solo se reemplazan cuando marcas
**sobrescribir**; no hay fusión de notas divergentes.

**Ver también:** [Caja fuerte](vault.md) · [Seguridad y secretos](security.md) ·
[Notas de commit](notes.md) ·
[Espacios de trabajo, pestañas y grupos](workspaces.md)
