---
title: Claves SSH
category: Sincronizar y muchos repos
order: 57
summary: Por qué tu token no hace nada con un remoto git@, y cómo ver qué clave está fallando.
keywords: ssh clave claves key keys agente agent ssh-add ssh-keygen ed25519 publickey permission denied permiso denegado huella fingerprint frase de paso passphrase subir upload github known_hosts
---

# Claves SSH

**Ajustes → Seguridad → Claves SSH.**

## Por qué esto vive al lado de los tokens

Gitcito autentica dos cosas distintas, y es razonable dar por hecho que son una
sola:

| | Se autentica con |
|---|---|
| La **API del host** — repos, PRs, issues, checks de CI | Tu [token](hosting.md) |
| El transporte de git sobre `https://` | Tu token, inyectado en la URL |
| El transporte de git sobre **`git@…`** | **Tu clave SSH, a través del ssh del sistema** |

Un remoto como `git@github.com:me/api.git` no toca el token jamás. Git le pasa
la conexión a `ssh`, que no ha oído hablar en su vida de un token de acceso
personal. Y no es un caso raro — es lo que te encuentras cuando un colega montó
el repositorio, cuando un `.gitmodules` usa URLs `git@`, cuando tu empresa
desactiva la autenticación por HTTPS, o cuando el host es un GitLab
autogestionado.

Cuando eso se tuerce, ssh dice `Permission denied (publickey)` y nada más.
Técnicamente cierto, inútil como consejo.

![Cada clave de ~/.ssh con su tipo, su huella y si el agente la tiene cargada](../../screenshots/ssh-keys.webp)

## Qué te cuenta la sección

Cada clave encontrada en `~/.ssh` muestra su tipo, tamaño, huella y comentario,
más el único dato que explica la mayoría de los fallos repentinos:

**en el agente** / **no está en el agente.** Una clave que el agente no tiene
cargada no puede autenticar nada, y el agente olvida su contenido al reiniciar
salvo que le hayas dicho lo contrario al sistema operativo. El "ayer funcionaba"
suele ser esto.

## Qué puedes hacer aquí

| Acción | Qué ejecuta |
|--------|--------------|
| **Copiar clave pública** | Deja la línea del `.pub` en el portapapeles, lista para pegar en cualquier host |
| **Añadir al agente** | `ssh-add` (con `--apple-use-keychain` en macOS, para que sobreviva a un reinicio) |
| **Subir a GitHub** | `POST /user/keys` con el token de este perfil |
| **Generar clave** | `ssh-keygen -t ed25519`, comentada con tu email de git |
| **Probar conexión** | `ssh -T git@<host>`, traducido a una frase |

**Probar conexión** existe porque la respuesta del propio ssh induce a error:
GitHub te autentica correctamente y *después* sale con un código de fallo,
porque no ofrece shell. Gitcito lee el mensaje en lugar del código de salida, y
enseña debajo la salida en crudo para que puedas comprobar su lectura.

## Los límites, dichos claramente

- **Subir solo funciona con GitHub.** GitLab, Bitbucket y Azure DevOps se
  quedan con *Copiar clave pública* y un enlace directo a su página de ajustes
  de claves. Registrar claves en esos tres no está implementado, y el botón no
  disimula.
- **Generar nunca sobrescribe.** Un nombre que ya exista en `~/.ssh` se rechaza.
  Sobrescribir una clave privada en silencio te revoca el acceso a todo lo que
  confía en ella, y no hay diálogo de confirmación que haga eso recuperable.
- **Gitcito no guarda las frases de paso.** Escribes una al generar o al añadir
  al agente; se le pasa a `ssh-keygen`/`ssh-add` y se descarta. Mantenerla entre
  reinicios es trabajo del llavero del sistema, vía `ssh-add`.
- **No se edita `~/.ssh/config`**, ni hay alias de host, ni selección de clave
  por repositorio. Eso vive en tu configuración de ssh, y Gitcito no toca ese
  archivo.

## Qué no sale nunca de tu máquina

**Gitcito nunca lee, muestra ni transmite una clave privada.** La sección lista
las mitades públicas y las huellas. Lo único que se envía a algún sitio alguna
vez es la clave pública sobre la que pulsas **Subir** explícitamente — y eso va
a GitHub, con tu propio token, después de una confirmación que nombra la huella.

Ver también: [Seguridad y secretos](security.md) · [Hosting y pull requests](hosting.md)
