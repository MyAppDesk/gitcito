---
title: Idiomas y escritura de derecha a izquierda
category: Hazlo tuyo
order: 102
summary: Elige el idioma de la interfaz por bandera y endónimo, con la interfaz reflejada para árabe y hebreo.
keywords: idioma idiomas lengua language languages locale locales i18n internacionalización internationalization traducción traducir translation translate rtl derecha-a-izquierda right-to-left árabe arabic hebreo hebrew espejo reflejar mirror dirección direction bandera flag endónimo endonym inglés english español spanish alemán german francés french portugués portuguese italiano italian neerlandés dutch polaco polish turco turkish ruso russian ucraniano ukrainian chino chinese japonés japanese coreano korean
---

# Idiomas y escritura de derecha a izquierda

La interfaz de Gitcito está traducida. El idioma es un
ajuste de Gitcito, no del sistema operativo — quien tenga macOS en inglés pero
prefiera leer en japonés lo cambia aquí, y a quien tenga el sistema en hebreo
pero quiera la app en inglés nadie le lleva la contraria.

**Ajustes → General → Idioma.**

![El selector de idioma](../../screenshots/languages.webp)

## Qué viene incluido

| | | | |
|---|---|---|---|
| English | Español | Deutsch | Français |
| Português (Brasil) | Italiano | Nederlands | Polski |
| Türkçe | Русский | Українська | 简体中文 |
| 日本語 | 한국어 | العربية | עברית |

Cada fila del selector está escrita en su propio idioma. Quien busca coreano
está rastreando 한국어, no la palabra "coreano" en un idioma del que está
intentando salir.

### Sobre las banderas

Una bandera nombra un país; una locale nombra un idioma. Las dos cosas no
encajan de verdad — el árabe es lengua oficial en más de veinte estados, y el
portugués está en dos continentes. Los iconos siguen la misma convención que
usa el selector de idioma de cualquier sistema operativo: la región principal
de la locale. Están ahí para *reconocerse de un vistazo*, no para afirmar nada
sobre a quién pertenece un idioma.

Están dibujados como vectores en lugar de emoji a propósito. Windows no trae
ningún emoji de bandera — `🇩🇪` se ve allí como una caja con las letras "DE"
dentro.

## De derecha a izquierda

El árabe y el hebreo reflejan la interfaz entera: la barra lateral se va a la
derecha, los paneles y las barras de herramientas se invierten, y los iconos
que apuntan a algún sitio apuntan al contrario.

El cambio es inmediato y no hace falta reiniciar.

![Gitcito en árabe, con la interfaz reflejada](../../screenshots/rtl.webp)

### Lo que deliberadamente no se refleja

Hay contenido que va de izquierda a derecha leas el idioma que leas.
Reflejarlo sería directamente incorrecto, así que esto se queda como está:

| Se queda LTR | Por qué |
|-----------|-----|
| El grafo de commits | Las posiciones de los carriles se calculan en píxeles; un contenedor reflejado no cuadraría con las líneas dibujadas |
| Diffs y contenido de archivos | El código es LTR, y un diff reflejado no hay quien lo lea |
| El blame y la salida de conflictos | Por lo mismo — ese texto es código fuente, no prosa |
| El terminal integrado | Dibuja su propia rejilla; la salida de git es LTR |
| Rutas, SHAs, refs y comandos | `refs/heads/main` se lee en una sola dirección |

Cada uno de ellos está aislado para que un fragmento de árabe *dentro* de uno
—un nombre de rama, un mensaje de commit, un nombre de archivo— no pueda
reordenar el texto de alrededor.

### Los límites

Esto es honesto sobre dónde se queda:

- **Gitcito nunca cambia la dirección de los mensajes de commit, los nombres de
  rama ni el contenido de los archivos.** Se muestran tal como los escribió su
  autor. Un mensaje de commit en hebreo dentro de una lista aislada como LTR se
  ve en hebreo, pero la fila que lo rodea no se da la vuelta por él.
- **Las superficies de terceros conservan su propia dirección** — el terminal
  es xterm, y las vistas previas de Markdown renderizan el documento tal como
  está escrito.
- **Los nombres de archivo con direcciones mezcladas son difíciles.** Una ruta
  con una carpeta en árabe dentro de un árbol en inglés se aísla en lugar de
  reordenarse, que es lo correcto, pero aun así puede sorprender la primera vez.

## Este manual también está traducido

No solo los botones. Cada página que estás leyendo existe en todos los idiomas
que muestra la lista de arriba — las explicaciones, las tablas de qué hace cada
opción, las secciones que cuentan qué se niega a hacer una función. Cambiar el idioma de la interfaz
cambia también el manual, tanto en la app como en la web.

Una traducción puede estar incompleta. Si una página aún no está traducida,
recibes la inglesa en lugar de una página que falta, y la barra lateral mantiene
la misma forma en todos los idiomas, de modo que una captura o una instrucción
siguen cuadrando con lo que ves.

En la web cada página lleva un selector de idioma que te deja en la misma página
que estabas leyendo, porque cambiar de idioma no es lo mismo que empezar de
cero.

**Qué está traducido por máquina, y qué cuesta eso.** El inglés y el español se
escribieron a mano. El resto lo tradujo un modelo contra un glosario y luego lo
revisó un script: cada página, cada enlace, cada ruta de imagen, cada bloque de
código byte a byte contra el inglés. Eso pilla la estructura rota. No pilla una
frase correcta pero envarada. Si una página se lee mal en tu idioma, eso es un
fallo que merece la pena reportar.

## Añadir un idioma

Los diccionarios son un archivo por locale bajo `src/renderer/src/i18n/`, y el
archivo en inglés es la referencia contra la que se comprueban los tipos de
todos los demás — una clave que falta es un error de compilación, no un
silencioso volver al inglés. La batería de tests también comprueba que cada
`{placeholder}` que interpola una cadena sobrevive a la traducción, de modo que
una frase no puede perder por el camino el sha de su commit.

El manual funciona igual: `docs/help/` contiene las páginas en inglés y
`docs/help/<locale>/` contiene cada traducción, un archivo por página con el
mismo nombre. `npm run lint:docs` comprueba que cada página traducida tiene un
original en inglés, que su front matter está completo y que sus enlaces e
imágenes resuelven desde un directorio más abajo.

Las contribuciones son bienvenidas — una página cada vez está bien, y corregir
una traducción torpe es tan útil como añadir la que falta.

**Ver también:** [Temas y apariencia](themes.md) · [Perfiles](profiles.md)
