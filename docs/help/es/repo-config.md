---
title: Reglas del repositorio (.gitcito.json)
category: Herramientas del espacio de trabajo
order: 98
summary: Las reglas de la casa que viajan con el repositorio — ramas protegidas, ámbitos de commit, lo que necesita un clon y una lista antes de hacer push.
keywords: gitcito.json configuración del repositorio reglas doctor requisitos ramas protegidas ámbitos scopes trailers ticket enlaces al gestor lista de comprobación onboarding hooksPath node submódulos lfs env example
---

# Reglas del repositorio (`.gitcito.json`)

Todo proyecto arrastra reglas que nadie puede deducir leyendo el código. *Nunca
hagas push directo a `release/*`.* *Los ámbitos de commit son `api`, `web` e
`infra`, y ninguno más.* *Necesitas Node 20, los submódulos inicializados y un
`.env` copiado de `.env.example` antes de que nada arranque.* Esas reglas viven
en un README que nadie relee, en un fallo de CI o en quien lleva más tiempo aquí.

`.gitcito.json` es donde el repositorio las escribe para que la herramienta
pueda actuar sobre ellas. Está en la raíz del repositorio, se versiona como
cualquier otro archivo y por tanto viaja con el clon: quien abra el proyecto
recibe las mismas reglas, y quien acaba de llegar las tiene el primer día en
lugar de en su primer push rechazado.

El archivo es totalmente opcional. Un repositorio sin él se comporta exactamente
igual que siempre.

![La pestaña Config del repositorio, con las filas del doctor y las secciones de reglas](../../screenshots/repo-config.webp)

## Dónde se edita

El engranaje junto a las herramientas de la barra → **Config**. Ese editor
escribe el archivo en tu copia de trabajo; no se guarda en ningún otro sitio,
así que **haz commit** para compartir las reglas con el equipo.

Si el repositorio no tiene ninguno, **Leer el repositorio** propone uno a partir
de lo que ya hay: un `.nvmrc` o `engines.node`, un `.gitmodules`, `filter=lfs` en
`.gitattributes`, un `.env.example` sin `.env` al lado, las ramas que ya
proteges localmente y los ámbitos que han usado los últimos 500 asuntos de
commit. No se escribe nada hasta que guardas. Desde el terminal,
`gitcito config init` hace lo mismo (ver [la línea de comandos](cli.md)).

## Qué puede decir el archivo

```json
{
  "version": 1,
  "protect": ["main", "release/*"],
  "links": {
    "tickets": [
      { "match": "\\b[A-Z][A-Z0-9]+-\\d+\\b", "url": "https://tracker.example.com/browse/$0", "label": "Jira" }
    ]
  },
  "commit": {
    "scopes": ["api", "web", "infra"],
    "ticketFromBranch": true,
    "trailers": ["Refs: {ticket}"]
  },
  "requires": {
    "node": ">=20",
    "hooksPath": ".husky",
    "submodules": true,
    "lfs": true,
    "files": [{ "path": ".env", "from": ".env.example", "why": "URL base de la API y un token de desarrollo" }]
  },
  "checklist": {
    "push": ["Pasar la suite de integración contra staging"]
  }
}
```

| Campo | Qué hace |
|---|---|
| `version` | Debe ser `1`. Un archivo de un esquema más nuevo se ignora entero, en lugar de adivinarlo. |
| `protect` | Nombres de rama, con `*` para cualquier texto. Se **suman** a las ramas que proteges localmente — ver [ramas protegidas](repo-settings.md). |
| `links.tickets` | Una expresión regular y una plantilla de URL. `$0` es la coincidencia completa, `$1`…`$9` sus grupos. Las coincidencias en asuntos y cuerpos de commit se vuelven enlaces. |
| `commit.scopes` | Los ámbitos que ofrece el compositor, en lugar de un campo libre. Declararlos también convierte un ámbito desconocido de consejo de estilo en error en `gitcito commit-check`. |
| `commit.ticketFromBranch` | Rellena la clave del ticket desde el nombre de la rama (`feature/ABC-123-cosa` → `ABC-123`) — pero solo en un compositor vacío, nunca sobre lo que estás escribiendo. |
| `commit.trailers` | Líneas que se añaden al cuerpo del commit. `{ticket}` y `{branch}` se rellenan; una línea cuyo marcador no tiene con qué rellenarse se descarta en vez de escribirse a medias. |
| `requires.*` | Lo que necesita un clon que funcione. Cada entrada se convierte en una fila del doctor, más abajo. |
| `checklist.push` | Texto libre que se muestra una vez por sesión, antes del primer push. |

## El doctor

`requires` es la parte que responde a *«lo he clonado y no arranca»*. Gitcito lo
comprueba al abrir el repositorio y muestra un chip con un estetoscopio en la
barra de estado cuando algo falla. Al pulsarlo se abre la pestaña Config en las
filas del doctor; **Comprobar de nuevo** las vuelve a ejecutar.

| Comprobación | Pasa cuando | Se repara con |
|---|---|---|
| `node` | El `node` de tu PATH cumple la especificación | — |
| `submodules` | Ningún submódulo está sin inicializar | `git submodule update --init --recursive` |
| `lfs` | git-lfs está instalado y los archivos rastreados son contenido real, no texto de puntero | `git lfs pull` |
| `hooksPath` | `core.hooksPath` coincide con la ruta declarada | asignar `core.hooksPath` |
| `files` | El archivo existe | copiarlo desde `from`, si existe |

Dos límites deliberados. Un **aviso** nunca significa «roto»: significa que el
doctor no pudo determinar algo (una especificación de Node que no sabe leer pasa
en vez de inventar un fallo sobre el que no puedes actuar), y los avisos no
hacen fallar a `gitcito doctor` en CI. Y una reparación nunca es algo que
proporcione el archivo: el conjunto de arriba es todo el conjunto, cerrado en
tiempo de compilación. La configuración le pasa un valor —una ruta que copiar,
un valor para `core.hooksPath`— y nunca un comando.

Copiar un archivo nunca sobrescribe: que el archivo falte es justamente la razón
por la que esa fila está ahí.

## Commits

Con `commit.scopes` declarados, el botón de ámbito del compositor ofrece esa
lista en lugar de un campo libre — la diferencia entre `feat(renderer)` y
`feat(rendererr)`. `ticketFromBranch` y `trailers` rellenan las partes mecánicas
de un mensaje, y `links.tickets` devuelve las claves convertidas en enlaces allí
donde se muestre un commit.

Las mismas reglas se aplican fuera de la ventana: `gitcito commit-check` lee este
archivo, así que un hook `commit-msg` y la CI exigen exactamente lo que el
compositor sugiere. Ver [la línea de comandos](cli.md) y
[hacer commits](committing.md).

## La lista antes del push

`checklist.push` se muestra como una confirmación antes del primer push de la
sesión, una línea por elemento. Es el sitio para lo que de verdad es un juicio
humano —*¿alguien ha avisado a soporte?*— porque Gitcito **nunca lo comprueba
por ti**. Son recordatorios, no barreras: los lees y haces push, o cancelas. Se
muestra una vez por repositorio y sesión, porque un diálogo en cada push es un
diálogo que nadie lee.

## Por qué no puede hacerte daño

El archivo llega con el repositorio, es decir, llega de quien haya escrito el
repositorio. Se trata como contenido no fiable, igual que un mensaje de commit:

- **Nada de lo que contiene se ejecuta.** No hay ningún campo que guarde un
  comando, y las reparaciones del doctor son una lista fija.
- **Solo puede añadir restricciones.** `protect` se une a tu lista local: un
  repositorio puede proteger más de lo que tú elegiste, nunca convencerte de
  dejar de proteger algo. Ningún campo desactiva una salvaguarda.
- **Las rutas no pueden salir del repositorio.** Se rechazan rutas absolutas,
  `..`, `~`, letras de unidad y cualquier cosa que toque `.git`, y se vuelve a
  comprobar en el punto en que una cadena se convierte en una ruta real.
- **Los enlaces deben ser `http(s)`.** No se entrega nada más al abridor de URL
  del sistema.
- **Todo tiene tope** —longitud de listas, de cadenas, de patrones— para que un
  repositorio hostil no pueda pegar un muro de texto en un diálogo ni mil chips
  en un panel.

Un campo malo se descarta, no es fatal. El resto del archivo se sigue aplicando,
y lo descartado se lista bajo **Ignorado por Gitcito** en la pestaña Config con
el motivo. La única excepción es un JSON inválido o una `version` desconocida,
donde no hay nada que salvar.

## Lo que deliberadamente no hace

- **Ni comandos, ni scripts, ni hooks.** Para eso están los
  [hooks](hooks.md), y son una decisión que tomas por clon.
- **Ni reglas por rama ni por persona.** Un archivo, un conjunto de reglas.
- **No sustituye a la CI.** La lista es texto; el doctor comprueba el entorno, no
  tu trabajo.
- **No puede debilitar nada.** Todas las salvaguardas de Gitcito siguen siendo
  tuyas.

**Ver también:** [Ajustes por repositorio](repo-settings.md) ·
[La línea de comandos](cli.md) · [Hacer commits](committing.md) ·
[Hooks y .gitignore](hooks.md)
