---
title: Ayudante de credenciales
category: Seguridad
order: 73
summary: El almacén de contraseñas de git — el tercero — y por qué https te las vuelve a pedir.
keywords: credential helper ayudante credenciales contraseña password https vuelve a pedir osxkeychain wincred manager libsecret store cache git-credentials texto plano plaintext olvidar forget revocado token 401
---

# Ayudante de credenciales

Gitcito maneja tres tipos distintos de secreto, y es razonable que la gente
asuma que son uno solo:

| | Lo guarda |
|---|---|
| Tokens de API del hosting — PRs, issues, checks de CI | Gitcito, en tu [llavero del sistema](security.md) |
| Transporte `git@…` | Tu [clave SSH](ssh-keys.md), a través del agente ssh del sistema |
| **Transporte `https://`** | **El ayudante de credenciales del propio git** |

El tercero no le parece una funcionalidad a nadie hasta que falla, y entonces
produce las dos quejas más habituales de git: *¿por qué me lo vuelve a pedir?* y
*¿por qué sigue mandando el token que revoqué?*

`⌘K` → **Ayudante de credenciales**.

![El ayudante configurado, las reglas por host y el aviso de archivo en texto plano](../../screenshots/credentials.webp)

## Qué estás viendo

Cada `credential.helper` configurado, con el ámbito del que viene — `system`,
`global` y luego este repositorio. **Los ayudantes se apilan**: git pregunta a
cada uno por turno, y uno a nivel de repositorio no sustituye a uno global.

Cada uno se comprueba contra tu máquina:

| Marca | Significa |
|------|-------|
| **listo** | El programa del ayudante existe y se ejecutará |
| **no instalado** | Configurado, pero el programa no está — cada petición acaba en teclearla otra vez |
| **contraseñas en un archivo plano** | El ayudante `store` (mira abajo) |

**Reglas para hosts concretos** lista las secciones `credential.<url>.*`. Estas
ganan al ajuste llano para las URLs que encajan, y suelen ser la respuesta a
«por qué este host en concreto se comporta distinto».

## Elegir uno

| Ayudante | Dónde va la contraseña |
|--------|------------------------|
| `osxkeychain` | El llavero de macOS — cifrado, por usuario |
| `manager` | Git Credential Manager (Windows, multiplataforma) |
| `wincred` | El Administrador de credenciales de Windows |
| `libsecret` | El servicio de secretos de Linux (GNOME Keyring, KWallet) |
| `cache` | Memoria, durante 15 minutos. Nada en disco |
| `store` | **Un archivo plano en tu carpeta personal. Sin cifrar** |

Gitcito ofrece lo que de verdad está instalado en esta máquina, marca el que
encaja con tu sistema operativo y desactiva el resto.

**El ámbito importa.** *Para todos los repositorios* escribe en tu configuración
global, que es lo que casi siempre quieres; *solo para este repositorio* es para
ese repo raro que se autentica contra otra cosa.

## El ayudante `store` y `~/.git-credentials`

`store` escribe líneas `https://usuario:contraseña@host` en `~/.git-credentials`,
en texto plano, sin cifrado de ningún tipo. Cualquier cosa que se ejecute como
tú puede leerlo: un script, el postinstall de una dependencia, lo que sea.

Si ese archivo existe, esta página lo dice y cuenta las entradas. Nunca las
muestra — el recuento es justo el objetivo, y leer el contenido para enseñarlo
sería cometer el mismo error.

Si te encuentras uno y no era tu intención: elige aquí un ayudante de verdad,
luego borra el archivo y vuelve a autenticarte una vez.

## Olvidar una credencial guardada

Cuando un token se revoca o se rota, el ayudante sigue entregando el viejo y
cada push falla con un 401 que no nombra nada. **Olvidar** le pide al ayudante
configurado que borre su entrada para ese host — `git credential reject`, que es
la vía documentada del propio git.

Por el camino no se lee nada: Gitcito nunca llama a `git credential fill`, el
comando que imprimiría una contraseña viva por la salida estándar.

El siguiente push te pregunta una vez, y el ayudante guarda la nueva respuesta.

## Límites que conviene conocer

- **Este es el almacén de git, no el de Gitcito.** Cambiarlo cambia también lo
  que hace tu terminal — que es justo la gracia, y conviene saberlo antes de
  tocarlo.
- **Los ayudantes de nivel de sistema se muestran, pero no se editan.** Viven en
  una configuración que solo un administrador puede escribir.
- **Gitcito no puede listar lo que guarda un ayudante.** Ninguna API de
  credenciales expone eso sin entregar los secretos, así que el diálogo informa
  de la configuración y borra cuando se lo pides, y nada más.
- **Un token que le diste a Gitcito es otra cosa.** Revocar uno no toca el otro;
  mira [seguridad](security.md) para la parte del llavero.

Ver también: [Seguridad](security.md) · [Claves SSH](ssh-keys.md) ·
[Sincronizar](syncing.md)
