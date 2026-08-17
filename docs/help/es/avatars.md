---
title: Avatares de autor
category: Hazlo tuyo
order: 103
summary: Fotos de Gravatar cuando existen, un avatar generado cuando no — y una cara en la barra de título que reacciona al repositorio.
keywords: avatar avatares gravatar blobatar autor foto imagen identicon cara sin conexión privacidad correo hash ánimo expresión animación movimiento triste enfadado contento
---

# Avatares de autor

Una lista de commits es un muro de nombres, y los nombres se leen despacio. Una
imagen junto a cada uno convierte «quién escribió esto» en algo que respondes de
un vistazo. Gitcito pone una en cada autor que muestra: en la columna de autor
del grafo, en los detalles del commit junto al autor y a cada coautor, en el
selector de coautores mientras redactas, en el conmutador de perfiles y al lado
de cada perfil en Ajustes.

## De dónde sale la imagen

Dos fuentes, probadas en ese orden:

| Fuente | Cuándo se usa |
|---|---|
| **Gravatar** | El correo del commit tiene cuenta en Gravatar. Se descarga por HTTPS, usando un hash SHA-256 del correo en minúsculas. |
| **Avatar generado** | Todo lo demás — sin Gravatar, sin red, o con la consulta desactivada. Se dibuja localmente a partir del correo, nunca se descarga. |

El avatar generado es una criatura pequeña, no un cuadrado de color: el mismo
correo produce siempre la misma forma y los mismos colores, así que un autor
sigue siendo reconocible entre repositorios y entre reinicios. Dos correos
distintos prácticamente nunca coinciden. Lo dibuja
[blobatar](https://github.com/Alain00/blobatar) (MIT), y no necesita red alguna:
un repositorio lleno de autores sin Gravatar recibe igualmente un juego completo
de caras distinguibles, sin conexión, en el primer pintado.

Como la semilla es el **correo del commit**, un autor que comitea con dos
direcciones obtiene dos avatares. Es deliberado — es la misma señal que da la
columna de autor del grafo, y suele ser así como detectas una cuenta de máquina o
un `user.email` mal configurado. Corrígelo con
[atributos de autor](attributes.md) si las dos direcciones son de verdad la misma
persona.

## La cara de la barra de título

El avatar junto al nombre de tu perfil es el único avatar de Gitcito que
representa **a ti, en este repositorio, ahora mismo** — así que es el único que
reacciona al estado del repositorio. Adopta una de cuatro caras:

| Cara | Cuándo |
|---|---|
| 😠 Enfadada | Quedan archivos en conflicto. |
| 🙁 Apagada | 10 commits o más esperando envío, 25 o más por detrás del remoto, o 25 o más cambios sin confirmar. |
| 🙂 Contenta | Nada local, nada pendiente y un upstream con el que estar sincronizado. |
| 😐 Neutra | Trabajo en curso normal — y antes de leer el primer estado. |

Gana lo peor: un repositorio con conflictos *y* cuarenta commits sin enviar está
enfadado, no apagado. Pasa el ratón por el avatar y la ayuda emergente dice qué
recuento causó la cara — una imagen que cambia sin motivo declarado es un
acertijo, no una señal.

Los umbrales son altos a propósito. Una cara que se apaga con un solo commit sin
enviar está apagada para siempre, y una señal permanente es una señal que
aprendes a no leer. Una rama sin upstream se queda neutra en vez de contenta:
«sincronizado» no es algo que se pueda afirmar de una rama que nadie ha enviado.

**Esto es decoración, no instrumentación.** La barra de estado lleva los
recuentos reales, y es lo que hay que creer. La cara solo dice *algo pasa* de un
vistazo, y lo dice en cuatro pasos.

### Movimiento

El avatar de la barra de título respira y parpadea por su cuenta. Desactívalo en
**Ajustes → Temas → Grafo → Animar el avatar del perfil** — la expresión sigue
reflejando el repositorio, solo deja de moverse. El movimiento también se omite
automáticamente si tu sistema pide movimiento reducido.

Solo se anima este avatar. Un avatar animado tiene que dibujarse como SVG vivo en
lugar de una imagen en caché, lo cual está bien para uno y es un derroche para los
varios cientos que dibuja un grafo al desplazarse.

## Desactivar la consulta

**Ajustes → Temas → Grafo → Mostrar avatares.**

Desactivado significa:

- ninguna petición a `gravatar.com`, nunca — ni diferida, ni en caché con
  reintento;
- los avatares siguen apareciendo, todos generados localmente.

Así que es un interruptor de privacidad, no un «ocultar las imágenes». No hay
ningún ajuste que quite los avatares del todo.

## Los límites

- **Una consulta a Gravatar le dice a gravatar.com que se ha mirado ese correo.**
  El hash no es un secreto: cualquiera con un correo candidato puede calcularlo y
  compararlo. Si la lista de autores de un repositorio es algo que preferirías no
  entregar a un tercero, desactiva la consulta antes de abrirlo.
- **Solo Gravatar.** Los avatares que subiste a GitHub, GitLab o Bitbucket no se
  leen — requerirían una llamada autenticada a la API del host por autor, que es
  mucha red para un adorno.
- **Sin sustituciones.** No puedes fijar una imagen elegida a un autor, ni
  cambiar el estilo generado. El avatar es una función del correo y de nada más.
- **Una foto de Gravatar no tiene expresión.** Si el correo de tu perfil tiene
  una, la barra de título muestra la foto y ninguna cara — una fotografía no
  puede hacerte muecas. Desactiva la consulta si prefieres el blob expresivo.
- **La cara sigue solo al repositorio activo.** En una pestaña que no es un
  repositorio no hay nada a lo que reaccionar, así que se queda neutra.
- **Cuatro caras, no un panel de mandos.** No hay cara para «rebase en curso»,
  «HEAD desacoplada» o «stashes acumulándose»: cuatro poses son todo el
  vocabulario, y gastarlas en distinciones más finas volvería poco fiable
  cualquier lectura.
- **Pequeño es pequeño.** En la columna de autor del grafo el avatar mide 16px,
  que transmite color y silueta pero no detalle. Los detalles del commit dibujan
  al autor a 38px, y ahí sí se ve la cara.

**Véase también:** [Temas y apariencia](themes.md) · [El grafo de commits](graph.md) ·
[Atributos de autor](attributes.md) · [Perfiles](profiles.md)
