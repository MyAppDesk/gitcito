---
title: Licencias de código abierto
category: Hazlo tuyo
order: 104
summary: Lee la licencia de cada paquete de terceros que incluye esta compilación de Gitcito.
keywords: licencias licenses atribución avisos código abierto open source MIT Apache BSD terceros dependencias créditos acerca de
---

# Licencias de código abierto

Gitcito está construido sobre noventa y tantos paquetes de código abierto, y casi
todos piden lo mismo a cambio: que su aviso viaje con el binario. MIT, BSD y
Apache lo dicen en su propio texto. Esta página es donde vive ese aviso, para que
la obligación la cumpla la app y no un archivo que alguien tiene que acordarse de
copiar.

También es la respuesta honesta a «qué se está ejecutando realmente en mi
máquina».

## Cómo abrirla

Haz clic en el **número de versión** de la barra de estado — eso abre
**Novedades** — y luego en **Licencias** en su cabecera. O abre la paleta de
comandos y busca *Licencias de código abierto*. Se abre en su propia pestaña,
como Novedades.

![La pestaña de licencias](../../screenshots/licenses.webp)

| Columna | Qué es |
|---------|--------|
| Nombre | El paquete tal como se publica en npm |
| Versión | La versión exacta que resolvió esta compilación |
| Insignia | El identificador SPDX del manifiesto del paquete |

Selecciona una fila para leer el texto completo de la licencia que trae el
paquete. El icono de enlace abre la página del proyecto en el navegador. El
filtro busca en el nombre del paquete y en el identificador de licencia, así que
escribir `Apache` reduce la lista a los paquetes con licencia Apache.

## Qué cubre y qué no

La lista se genera al compilar a partir del **árbol de dependencias de
producción** — todo lo que acaba dentro de la app empaquetada, incluidas
dependencias transitivas que nunca pediste directamente — más el propio Electron.
Las herramientas de compilación que nunca se distribuyen se dejan fuera a
propósito.

Dos límites que conviene conocer:

- **Algunos paquetes no traen archivo de licencia.** Declaran un identificador en
  su manifiesto y nada más. Esas filas lo dicen en lugar de inventar un texto,
  porque una licencia que no puedes leer no es una licencia en la que puedas
  confiar.
- **El identificador es lo que el paquete afirma.** Gitcito lo muestra; no lo
  audita. Si el manifiesto de un paquete está mal, esta página se equivoca con él.

La licencia del propio Gitcito es MIT, y la insignia de la esquina superior
derecha la abre en GitHub.

**Ver también:** [Idiomas y escritura de derecha a izquierda](languages.md) · [Temas y apariencia](themes.md)
