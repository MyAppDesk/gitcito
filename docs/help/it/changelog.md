---
title: Generatore di changelog
category: Lavorare con le modifiche
order: 34
summary: Trasforma i conventional commit fra due ref in un changelog raggruppato.
keywords: changelog note di rilascio release notes conventional commits genera CHANGELOG
---

# Generatore di changelog

Dagli due ref — di default usa **ultimo tag → HEAD** — e trasforma i commit
compresi fra i due in un changelog, raggruppato per tipo di Conventional Commit.

![Il generatore di changelog](../../screenshots/changelog-gen.webp)

- Le **breaking change** vengono in cima, da qualunque tipo provengano.
- Poi Funzionalità, Correzioni, Prestazioni e così via.
- I commit che non seguono alcuna convenzione finiscono sotto **Altro** invece di
  sparire: un changelog che perde commit in silenzio è peggio di uno disordinato.

Copia il risultato, oppure **anteponilo direttamente a `CHANGELOG.md`**.

> È scrivere i messaggi in [stile Conventional](committing.md) che rende utile
> tutto questo. Il generatore vale quanto valgono i soggetti che legge.

**Vedi anche:** [Fare commit](committing.md) · [Hosting e pull request](hosting.md)
