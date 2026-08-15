---
title: Compartir seguro
category: Seguridad
order: 72
summary: Mueve ajustes, entradas de la caja fuerte o un espacio de trabajo entero entre máquinas.
keywords: compartir seguro secure share exportar export importar import paquete bundle cifrado encrypted ajustes settings espacio de trabajo workspace transferir maquina
---

# Compartir seguro

Poner a punto una máquina nueva suele significar volver a meterlo todo a mano.
Compartir seguro lo empaqueta en un único paquete cifrado.

![Exportar los ajustes de un repositorio como paquete cifrado](../../screenshots/secure-share.webp)

![La misma exportación para un espacio de trabajo entero](../../screenshots/secure-workspace.webp)

## Qué puede entrar

| Sección | Contenido |
|---|---|
| **Ajustes** | Temas, disposición, atajos, preferencias |
| **Caja fuerte** | Secretos globales y por repositorio |
| **Repositorios** | Los repositorios de un espacio de trabajo, emparejados al importar por remoto o por carpeta |

Los secretos solo se incluyen cuando **marcas la casilla**. Un paquete sin esa
marca no contiene credencial alguna.

## Importar

La pantalla de importación enseña lo que hay dentro **antes** de aplicar nada,
sección por sección, y los repositorios se emparejan con los que ya tienes —
primero por URL del remoto, luego por carpeta — de modo que importar no vuelve a
clonar el mundo entero.

**Ver también:** [Caja fuerte](vault.md) · [Seguridad y secretos](security.md)
