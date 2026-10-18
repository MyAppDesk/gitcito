---
title: Ajustes por repositorio
category: Herramientas del espacio de trabajo
order: 94
summary: Ramas protegidas, la imagen de la pestaña, información, analíticas, historial y el registro de operaciones.
keywords: ajustes del repo repo settings ramas protegidas protected branches imagen de la pestaña tab image icono logo analíticas analytics registro de operaciones operation log historial información engranaje gear
---

# Ajustes por repositorio

El engranaje que hay junto a las herramientas de la barra abre los ajustes que
pertenecen a **este** repositorio, no a la aplicación.

![Ajustes por repositorio](../../screenshots/repo-settings.webp)

| Pestaña | Qué contiene |
|---|---|
| **General** | Ramas protegidas (un multiselector de ramas, guardado en la config de git), la imagen de la pestaña, firma |
| **Config** | Las [reglas que este repositorio trae consigo](repo-config.md) en `.gitcito.json`, y el doctor que las comprueba |
| **Info** | Notas y campos libres sobre este repositorio, guardados en local |
| **Caja fuerte** | Las entradas de la [caja fuerte](vault.md) de este repositorio |
| **Métricas** | El [panel de historial](insights.md) |
| **Analíticas** | Lo que has hecho en este repositorio, contado en local |
| **Historial** · **Logs** | El registro de operaciones: cada comando de git que Gitcito ejecutó, con su salida |

El registro de operaciones es el sincero: cuando algo se comporta de forma rara,
muestra el comando exacto y el error exacto, para que un informe de fallo lleve
hechos en vez de adjetivos.

## Imagen de la pestaña

Con diez pestañas abiertas, los nombres que empiezan igual —`api`,
`api-gateway`, `api-docs`— cuesta distinguirlos. Una imagen pequeña en la
pestaña se encuentra antes que un texto.

En **General**, pulsa en el campo de la imagen. Lista las imágenes del propio
repositorio —PNG, JPEG, GIF, WebP, SVG, ICO, BMP y AVIF—, cada una con su
miniatura y primero las que se llaman como un logo o un icono. Escribe para
filtrar (`logo dark` encuentra `assets/logo-dark.png`), muévete con las flechas
y pulsa Intro para elegir; o escribe la ruta a mano. La ruta se guarda
**relativa a la raíz del repositorio**, así que la imagen sigue al repositorio
esté donde esté su carpeta.

Qué enseña la pestaña es una opción de toda la app, en **Ajustes → General →
Las pestañas de repositorio muestran**:

| Opción | La pestaña muestra |
|---|---|
| **Imagen y nombre** (por defecto) | La imagen en lugar del icono de carpeta, y el nombre |
| **Solo nombre** | El icono de carpeta y el nombre, como si no hubiera imagen |
| **Solo imagen** | Solo la imagen; el nombre pasa a su tooltip |

Límites que conviene saber:

- La lista recoge los archivos que git ve —versionados y sin versionar, no los
  ignorados— y como mucho 40 a la vez; escribe para llegar al resto. Una imagen
  ignorada se puede escribir a mano igualmente.
- Las imágenes de más de 1 MB, o las que no se pueden leer, salen atenuadas y no
  se pueden elegir: un icono de 20 píxeles no necesita más.
- Un repositorio **sin** imagen siempre muestra su nombre, elijas la opción que
  elijas: una pestaña vacía no habría forma de identificarla.
- Si la ruta está **rota** —el archivo se borró, se renombró, no es una imagen o
  es demasiado grande— la pestaña vuelve al nombre sin avisar, y esta pestaña de
  ajustes muestra un aviso bajo la ruta. Nada más se queja.
- La imagen se lee una vez por sesión. Si sustituyes el archivo con el mismo
  nombre, vuelve a abrir esta pestaña de ajustes para recargarla.
- El ajuste vive en la configuración de Gitcito de esta máquina, no en el
  repositorio, así que tus compañeros no lo heredan.

**Ver también:** [Seguridad y secretos](security.md) · [Métricas](insights.md)
