---
title: Changelog-Generator
category: Mit Änderungen arbeiten
order: 34
summary: Macht aus Conventional Commits zwischen zwei Refs ein gruppiertes Changelog.
keywords: changelog release notes release-notes conventional commits generieren CHANGELOG
---

# Changelog-Generator

Gib ihm zwei Refs — standardmäßig **neuester Tag → HEAD** — und er macht aus den
Commits dazwischen ein Changelog, gruppiert nach Conventional-Commit-Typ.

![Der Changelog-Generator](../../screenshots/changelog-gen.webp)

- **Breaking Changes** stehen zuerst, egal aus welchem Typ sie kamen.
- Danach Features, Fixes, Performance und so weiter.
- Commits, die keiner Konvention folgen, landen unter **Sonstiges**, statt unter
  den Tisch zu fallen — ein Changelog, das stillschweigend Commits verliert, ist
  schlimmer als ein unaufgeräumtes.

Kopiere das Ergebnis, oder **stell es direkt `CHANGELOG.md` voran**.

> Deine Nachrichten im [Conventional-Stil](committing.md) zu schreiben, ist
> das, was das hier nützlich macht. Der Generator ist nur so gut wie die
> Betreffzeilen, die er liest.

**Siehe auch:** [Committen](committing.md) ·
[Hosting & Pull Requests](hosting.md)
