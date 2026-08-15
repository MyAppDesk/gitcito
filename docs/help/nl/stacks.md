---
title: Gestapelde branches
category: Branches & ingrepen
order: 43
summary: Ketens van afhankelijke branches, met een restack die doorcascadeert.
keywords: stack stapel gestapelde branches graphite restack afhankelijk keten ouder parent PR per niveau
---

# Gestapelde branches

Een stapel is een keten van branches waarbij elke branch voortbouwt op de branch
eronder: `main → api → ui`. Drie kleine PR's reviewen is beter dan één enorme.

![Een branchstapel](../../screenshots/branch-stack.webp)

Gitcito toont de stapel van onder naar boven met het aantal commits op elk
niveau, en laat je **per niveau een PR openen**, elk gericht op zijn ouder in
plaats van op `main`.

## Restack

Wanneer een lagere branch verandert — je verwerkte reviewopmerkingen op `api` —
staat elke branch erboven nu op de verkeerde basis. **Restack** rebaset de hele
keten cascadegewijs met `rebase --onto`, zodat een herschrijving van de ouder
geen commits in zijn kinderen dupliceert.

## Waar de verbanden wonen

Ouderverbanden worden opgeslagen in de **git-config**, dus ze reizen mee met de
repository en overleven een nieuwe kloon. Er woont niets in een dienst.

**Zie ook:** [Interactieve rebase](rebase.md) · [Hosting & pull requests](hosting.md)
