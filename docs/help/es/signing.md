---
title: Commits firmados
category: Recuperación y seguridad
order: 61
summary: Firma con GPG, SSH o X.509, con una insignia de verificación por commit.
keywords: firmar firma sign signing gpg ssh x509 verificado verified signature insignia badge confianza trust
---

# Commits firmados

Activa la firma por repositorio (**Ajustes → engranaje del repo**): GPG, SSH o
X.509, con la clave que elijas. Gitcito escribe `commit.gpgsign`, `gpg.format` y
`user.signingkey` para ese repositorio — la misma configuración que lee
cualquier otra herramienta.

| | |
|---|---|
| ![Columna de firma, claro](../../screenshots/signed-commits-light.webp) | ![Columna de firma, oscuro](../../screenshots/signed-commits-dark.webp) |

El grafo gana una **columna de firma** propia y reordenable:

| Insignia | Significa |
|---|---|
| **Verificado** | Firma válida de una clave en la que git confía |
| **Sin verificar** | Firmado, pero la clave es desconocida o no está validada |
| **Caducado** | La firma o su clave han caducado |
| *(nada)* | Sin firmar |

Las etiquetas también se pueden firmar — mira [Etiquetas](tags.md).

**Ver también:** [Seguridad y secretos](security.md)
