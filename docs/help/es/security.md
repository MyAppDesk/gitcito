---
title: Seguridad y secretos
category: Seguridad
order: 70
summary: Enmascarado, guardas, el llavero — y lo que Gitcito se niega a hacer.
keywords: seguridad security secretos secrets enmascarar masking llavero keychain safeStorage tokens rama protegida protected branch archivo grande large file guarda privacidad
---

# Seguridad y secretos

Gitcito **no tiene backend**. Las únicas llamadas de red van a tu hosting de Git
y, si lo activas, a tu proveedor de IA.

![Ajustes de seguridad](../../screenshots/settings-security.webp)

## Enmascarado de secretos

Los valores de `.env*`, `*.pem`, `*.key`, `id_rsa`, `credentials.*` y
compañía se pintan como `KEY=••••••` en las vistas de diff, archivo y blame,
para que compartir pantalla o hacer una captura no los filtre.

Es **solo visual**: nunca cambia el archivo y nunca cambia lo que preparas. Un
botón con forma de ojo los revela por vista. `.env.example`, `.sample` y
`.template` se tratan como plantillas, no como secretos.

![Un .env pintado con todos los valores enmascarados, y el botón para revelarlos](../../screenshots/secret-masking.webp)

## Guardas antes de que hagas daño

| Guarda | Cuándo |
|---|---|
| **Archivo de secretos** | Al commitear algo que parece una credencial — con un *Ignorar y dejar de seguir* de un clic |
| **Archivo grande** | Al commitear un blob desmesurado (el umbral está en Ajustes → Seguridad) |
| **Rama protegida** | Al commitear directamente a `main`/`master`, o al hacerle force push |
| **Secretos con seguimiento** | Al publicar un repositorio que *sigue* un archivo de secretos — se avisa una vez por sesión |

## El llavero del sistema

Los tokens y las entradas de la [caja fuerte](vault.md) se cifran con el llavero
de tu sistema operativo (`safeStorage` de Electron), nunca con una clave metida
en el archivo de ajustes.

**Nada toca el llavero hasta que tú lo dices.** Antes de que pueda aparecer el
diálogo de permisos del propio sistema, Gitcito te explica qué se va a guardar,
qué no puede hacer (una app solo puede releer la entrada que ella misma creó —
tus otras contraseñas quedan fuera de su alcance), y que decir que no está bien:
los tokens viven entonces en memoria solo durante la sesión, la caja fuerte se
queda cerrada, y puedes activarlo más tarde en **Ajustes → Seguridad → Llavero
del sistema**.

Una instalación recién hecha hace **cero** llamadas al llavero hasta que algo
necesita guardarse de verdad.

## Compartir sin riesgo

[Compartir seguro](secure-share.md) exporta ajustes, entradas de la caja fuerte
o espacios de trabajo enteros como un **paquete cifrado** — los secretos solo se
incluyen si marcas la casilla.

**Ver también:** [Caja fuerte](vault.md) · [Compartir seguro](secure-share.md)
