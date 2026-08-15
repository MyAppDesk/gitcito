---
title: Hooks & .gitignore
category: Werkomgeving & tools
order: 92
summary: Beheer git-hooks, en negeer bestanden zonder handmatig te bewerken.
keywords: hooks pre-commit husky core.hooksPath gitignore negeren ignore untrack
---

# Hooks & .gitignore

## Hooks

Somt elke hook in de repository op, laat zien welke echt zijn en welke nog
`.sample` heten, en laat je ze inschakelen, uitschakelen, bewerken of aanmaken.

![De hookbeheerder](../../screenshots/hooks.webp)

Gitcito detecteert een eigen **`core.hooksPath`** (husky en consorten) en een
config voor een **pre-commit-framework**, en vertelt je wanneer de hooks ergens
anders wonen dan in `.git/hooks` — anders zou je een bestand bewerken dat git
nooit draait.

> Hooks draaien bij commits van Gitcito precies zoals bij `git commit`. Een hook
> die faalt blokkeert de commit, en zijn uitvoer komt terug in de foutmelding.

## Slimme .gitignore

Rechtsklik een bestand → **Negeren**, en kies:

| Keuze | Schrijft |
|---|---|
| Dit bestand | `path/to/file.log` |
| Alle `*.ext` | `*.log` |
| De hele map | `path/to/folder/` |

![De .gitignore-kiezer](../../screenshots/gitignore-chooser.webp)

De regel gaat naar de `.gitignore` van de **dichtstbijzijnde map**, of naar de
repositoryroot, met een live voorbeeld van de regel voor je je eraan verbindt.
Bestanden die al getrackt worden krijgen in hetzelfde venster een **Negeren &
untracken**.

**Zie ook:** [Beveiliging & geheimen](security.md) · [Stagen](staging.md)
