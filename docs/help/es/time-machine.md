---
title: Máquina del tiempo
category: Repositorio e historial
order: 13
summary: Arrastra un deslizador y mira cómo cambia el repositorio entero, commit a commit.
keywords: maquina del tiempo time machine historial deslizador slider pasado arbol explorar rebobinar version antigua
---

# Máquina del tiempo

Leer un commit antiguo suele implicar hacerle checkout, lo que implica guardar en
un stash lo que estabas haciendo. Esto no.

Arrastra el deslizador y el **árbol de archivos se redibuja por cada commit**:
aparecen carpetas, los archivos se mueven entre ellas, los archivos borrados
vuelven. Elige un archivo y lo lees tal y como estaba en ese commit.

Todo se lee de la base de datos de objetos (`git ls-tree`, `git show`). **Sin
checkout, HEAD no se mueve nunca, tu trabajo sin commitear queda intacto** —
puedes recorrer un año de historial en mitad de un cambio.

![El árbol tal y como estaba en un commit anterior, con un archivo abierto al lado](../../screenshots/time-machine.webp)

![Arrastrando el deslizador: el árbol se reconstruye commit a commit](../../screenshots/clip-time-machine.webp)

## Controles

| Tecla | Acción |
|---|---|
| <kbd>←</kbd> <kbd>→</kbd> | Un commit |
| <kbd>⇧</kbd> + <kbd>←</kbd> <kbd>→</kbd> | Diez commits |
| <kbd>Home</kbd> / <kbd>End</kbd> | El más antiguo / el más reciente |

Las flechas a ambos lados del deslizador hacen lo mismo. Los archivos que tocó
el commit actual se resaltan en el árbol, con un contador en la cabecera.

## La selección sobrevive al tiempo

Elige un archivo y retrocede más allá del commit que lo creó: el panel dice que
ahí no existe, y **mantiene tu selección**. Avanza y el archivo vuelve con su
contenido antiguo. De eso se trata — lo que mueves es el repositorio, no tu
cursor.

**Abrir esta versión** entrega el archivo a la vista de archivo normal en ese
commit.

**Ver también:** [Timelapse](timelapse.md) · [Blame e historial](blame.md)
