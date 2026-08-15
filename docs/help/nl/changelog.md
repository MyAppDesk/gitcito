---
title: Changeloggenerator
category: Werken met wijzigingen
order: 34
summary: Zet conventional commits tussen twee refs om in een gegroepeerde changelog.
keywords: changelog releasenotes release notes conventional commits genereren CHANGELOG
---

# Changeloggenerator

Geef hem twee refs — standaard **laatste tag → HEAD** — en hij verandert de
commits ertussen in een changelog, gegroepeerd per Conventional Commit-type.

![De changeloggenerator](../../screenshots/changelog-gen.webp)

- **Breaking changes** komen eerst, uit welk type ze ook kwamen.
- Daarna Features, Fixes, Performance, enzovoort.
- Commits die geen enkele conventie volgen belanden onder **Overig** in plaats
  van te verdwijnen — een changelog die stilletjes commits kwijtraakt is erger
  dan een rommelige.

Kopieer het resultaat, of **zet het meteen bovenaan `CHANGELOG.md`**.

> Je boodschappen in [Conventional-stijl](committing.md) schrijven is wat dit
> nuttig maakt. De generator is niet beter dan de onderwerpsregels die hij leest.

**Zie ook:** [Committen](committing.md) · [Hosting & pull requests](hosting.md)
