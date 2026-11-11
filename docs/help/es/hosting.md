---
title: Hosting y pull requests
category: Sincronizar y muchos repos
order: 56
summary: Crea PRs en cualquier hosting; revísalos y fusiónalos en GitHub y GitLab.
keywords: pull request PR merge request MR GitHub GitLab Bitbucket Azure DevOps revisar review aprobar approve fusionar merge issues incidencias notificaciones
---

# Hosting y pull requests

## Crear

Crea un pull (o merge) request sin salir de la app: desplegables de ramas,
título y cuerpo rellenados a partir de los commits de la rama, un interruptor
de borrador y — en GitHub — revisores, etiquetas y asignados aplicados al
crearlo.

![Creando un pull request](../../screenshots/create-pr.webp)

Funciona en **GitHub, GitLab, Bitbucket y Azure DevOps**. Los PR/MR abiertos de
los cuatro aparecen listados en la barra lateral.

Empieza uno desde la comparación de ramas, desde el grafo, desde el `+` del
panel de PRs, o desde una incidencia (lo que rellena `Closes #N`).

## Pilas en la lista

Los pull requests que se apoyan unos en otros se colapsan en una sola fila con
un icono de pila, la rama en la que aterriza la cadena y cuántos hay. Despliégala
para ver la cadena en orden de lectura —de la hoja hacia la base— con una
flechita bajo cada una que dice en qué se fusiona, así la dirección se ve en vez
de deducirse de cuatro ramas base.

Dos cosas forman ese grupo: el número de pila propio de GitHub, cuando los PR
pertenecen a una [pila nativa](stacks.md), y si no las propias refs: un pull
request cuya base es la cabeza de otro se apoya en él. Esa segunda regla es la
que hace que también funcione en GitLab, Bitbucket y Azure DevOps, y con cadenas
abiertas antes de que nada de esto existiera.

![Una pila en la lista de pull requests](../../screenshots/pr-stack-list.webp)

Cada fila lleva el estado de los **checks** de su cabeza —pasa el ratón para ver
las cuentas— y, en GitHub, también los niveles ya cerrados o fusionados, que una
lista de PR abiertos escondería. Un nivel por encima de uno **cerrado** se marca
como bloqueado: sus checks pueden estar en verde, pero la rama a la que apunta no
va a aterrizar nunca. Las acciones de la fila salen al pasar el ratón, para que
el título conserve el ancho.

Leer los checks cuesta una petición por pull request, y solo al refrescar la
lista.

## Revisar — GitHub y GitLab

| | |
|---|---|
| **Conversación** | Comentarios y estado de la revisión |
| **Checks** | Ejecuciones de CI (GitHub) o trabajos de pipeline (GitLab) con pasa/falla/pendiente y enlaces a los logs |
| **Archivos vistos** | Una lista de comprobación con ✓ por archivo y su progreso |
| **Hilos en línea** | Comentarios de línea agrupados por `file:line`, y las respuestas |
| **Acciones** | Comentar, aprobar, pedir cambios, y merge / squash |

Si alguien hace force push a mitad de la revisión, [qué ha cambiado
desde](range-diff.md) te enseña exactamente qué se ha movido.

Las diferencias de GitLab, dichas claramente: GitLab no tiene una única llamada
de "enviar revisión", así que **aprobar** usa su endpoint de aprobaciones y
**pedir cambios** retira tu aprobación y publica tu comentario. El
**rebase-merge** no se ofrece — GitLab decide entre merge-commit y fast-forward
según la configuración del proyecto, así que el menú de merge muestra solo
merge y squash. Los hilos en línea muestran el archivo y la línea, pero no el
hunk del diff que los rodea, porque la API de GitLab no lo devuelve.
Revisar/fusionar funciona para proyectos en **gitlab.com**; las instancias
autoalojadas aún no están soportadas. Bitbucket y Azure DevOps se siguen
abriendo en el navegador para revisar.

## Incidencias, hitos y releases — GitHub

Explora las incidencias y abre una pestaña completa por incidencia: cuerpo,
comentarios, etiquetas, asignados, hito, campos de Projects v2, cerrar/reabrir,
y **crear una rama para esta incidencia** (con nombre generado por IA). Los
hitos muestran su progreso y sus incidencias. Los releases se pueden explorar
con su página de changelog.

## Notificaciones — GitHub

Tu bandeja entera — peticiones de revisión, menciones, actividad de CI — de
todos los repositorios, con filtros de no leídas/todas y marcar como leída. La
campana de la barra lleva un contador de no leídas, y opcionalmente saltan
notificaciones de escritorio cuando te piden una revisión o cuando termina la
CI.

## Tokens

Tokens por perfil para varias cuentas u organizaciones, guardados en el llavero
del sistema. Gitcito también puede tomar prestado lo que ya tenga tu **helper
de credenciales de git**, así que una organización para la que ya te has
autenticado a menudo no necesita configuración ninguna. Mira [Seguridad y
secretos](security.md).

Cada perfil **vincula su propia cuenta**. En Ajustes → Integraciones, **Iniciar
sesión con git** busca un inicio de sesión que ya esté en el equipo — el
credential helper de git, luego la cuenta activa de **GitHub CLI**, luego la
ventana de inicio de sesión del propio helper — y vincula esa cuenta al perfil.
Nada se comparte implícitamente: un perfil nuevo empieza desconectado, y se
rechaza una cuenta que otro perfil ya vinculó. Para vincular una segunda cuenta
de GitHub, añádela a gh (`gh auth login`), actívala (`gh auth switch`) e inicia
sesión desde el otro perfil — o pega el token de esa cuenta. Git nunca pide
usuario y contraseña en una terminal.

La página indica si la conexión es el token del perfil, su vínculo con el helper
de git o su vínculo con GitHub CLI, y **Desconectar** lo deshace solo para este
perfil: un token se borra (sigue siendo válido en el servicio hasta que lo
revoques allí), un vínculo se quita (el inicio de sesión sigue en gh o en el helper).

La API del servicio — pull requests, issues, CI — y el fetch, pull y push del
propio git por https usan el token o la cuenta vinculada del perfil. La
credencial llega a git solo para ese comando, limitada al host del remoto, y
nunca se escribe en `.git/config`. Un perfil sin ninguno de los dos deja a git
con su propio credential helper. Azure DevOps, GitLab y Bitbucket se vinculan
mediante el credential helper de git — Git Credential Manager guarda varias
cuentas por servicio — o usan un token por perfil. Un vínculo nombra una cuenta
por servicio, así que organizaciones que necesitan cuentas distintas llevan un
perfil cada una.

**Ver también:** [Ramas apiladas](stacks.md) · [Funciones de IA](ai.md)
