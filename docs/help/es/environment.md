---
title: Comprobación del entorno
category: Empieza aquí
order: 6
summary: De qué depende Gitcito fuera de su propia instalación — git, LFS, la terminal nativa, el credential helper de git, la CLI de GitHub y la vigilancia de archivos — comprobado en un solo lugar.
keywords: entorno environment doctor diagnóstico comprobación git versión lfs node-pty terminal shell básico credential helper store gh github cli scopes workflow inotify max_user_watches
---

# Comprobación del entorno

Algunos fallos no tienen nada que ver con el repositorio. Vienen de la máquina:
un git demasiado viejo para el inicio de sesión por perfil, una terminal que cayó
en silencio al modo básico, un inicio de sesión de la CLI de GitHub que no puede
subir archivos de workflow. Cada uno aparece más tarde como un error vago, en
medio de otra cosa. **Ajustes → Entorno** (también *Settings: Environment* en la
paleta de comandos) los comprueba de antemano.

El [doctor del repositorio](repo-settings.md) responde otra pregunta: si *este
repositorio* puede compilar aquí, según lo que pide su `.gitcito.json`. La
comprobación del entorno cubre la propia app y es igual para cualquier
repositorio.

![Comprobaciones del entorno en Ajustes](../../screenshots/settings-environment.webp)

## Qué comprueba

| Fila | Verde significa | Amarillo o rojo significa |
|------|-----------------|---------------------------|
| **Git** | git 2.31 o posterior está en el `PATH` | Anterior a 2.31: la cuenta de un [perfil](profiles.md) no puede autenticarse para fetch y push. Ausente: nada funciona hasta instalar git |
| **Git LFS** | `git lfs` está instalado | No está instalado. Solo lo necesitan los repositorios que guardan archivos en LFS |
| **Terminal** | Se cargó la terminal nativa | La [terminal](terminal.md) funciona en modo básico: sin colores, sin redimensionar, sin programas a pantalla completa |
| **Credential helper** | git tiene un helper para contraseñas HTTPS — global o para hosts concretos (lo que configura `gh auth setup-git`) | Sin helper, así que git fuera de Gitcito pregunta cada vez. O `store`, que las guarda en texto plano. Ver [Credential helper](credentials.md) |
| **CLI de GitHub** | `gh` tiene sesión con el scope `workflow` | Con sesión pero sin él: GitHub rechaza cualquier push que cambie `.github/workflows` |
| **Vigilancia de archivos** (Linux) | El límite de inotify es al menos 65.536 | Un límite menor se agota con unos pocos repositorios grandes abiertos, y las carpetas nuevas dejan de refrescar el estado |

Una fila que no aplica se omite: la CLI de GitHub si no está instalada o sin
sesión, y la vigilancia de archivos en macOS y Windows.

## Arreglar lo que encuentra

Donde hay arreglo, la fila lo muestra como un comando con botón de copiar. Por
ejemplo, `gh auth refresh -h github.com -s workflow` añade el scope que falta, y
una línea `sysctl` sube el límite de inotify. **La página nunca ejecuta nada por
sí misma.** Algunos arreglos necesitan `sudo` o cambian la configuración global,
y te toca leerlos antes de ejecutarlos. Después, pulsa **Comprobar de nuevo**.

## Límites

- Comprueba lo que la app ve desde su propio proceso. Un perfil de shell que
  cambia el `PATH` solo dentro de tu terminal puede hacer que ambos discrepen.
- La fila de la CLI de GitHub refleja la sesión propia de `gh`, no las cuentas
  conectadas en **Ajustes → Integraciones**. Son credenciales distintas. Si allí
  falta el scope `workflow`, se nota como un push rechazado.
- Informa de lo que está instalado. No instala ni actualiza nada.
