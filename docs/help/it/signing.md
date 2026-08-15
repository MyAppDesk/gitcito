---
title: Commit firmati
category: Recupero e protezione
order: 61
summary: Firma GPG, SSH o X.509, con un badge di verifica per commit.
keywords: firma firmare signing gpg ssh x509 verificato signature badge fiducia
---

# Commit firmati

Attiva la firma per singolo repository (**Impostazioni → ingranaggio del repo**):
GPG, SSH o X.509, con la chiave che scegli. Gitcito scrive `commit.gpgsign`,
`gpg.format` e `user.signingkey` per quel repository — la stessa configurazione
che legge qualsiasi altro strumento.

| | |
|---|---|
| ![Colonna delle firme, tema chiaro](../../screenshots/signed-commits-light.webp) | ![Colonna delle firme, tema scuro](../../screenshots/signed-commits-dark.webp) |

Il grafo guadagna una **colonna delle firme** dedicata e riordinabile:

| Badge | Significa |
|---|---|
| **Verificata** | Firma valida da una chiave di cui git si fida |
| **Non verificata** | Firmato, ma la chiave è sconosciuta o non convalidata |
| **Scaduta** | La firma o la sua chiave sono scadute |
| *(niente)* | Non firmato |

Anche i tag possono essere firmati — vedi [Tag](tags.md).

**Vedi anche:** [Sicurezza e segreti](security.md)
