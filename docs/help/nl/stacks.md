---
title: Gestapelde branches
category: Branches & ingrepen
order: 43
summary: Ketens van afhankelijke branches — cascaderende restack en geketende PR's met één klik.
keywords: stack stapel gestapelde branches graphite restack afhankelijk keten ouder parent PR per niveau submit indienen autopilot automatische piloot retarget basis omhangen
---

# Gestapelde branches

Een stapel is een keten van branches waarbij elke branch voortbouwt op de branch
eronder: `main → api → ui`. Drie kleine PR's reviewen is beter dan één enorme.

![Een branchstapel](../../screenshots/branch-stack.webp)

Gitcito toont de stapel van onder naar boven met het aantal commits op elk
niveau. Elk niveau met een open PR draagt zijn nummer als chip — klik erop om de
PR te openen.

## Dien de stapel in als geketende PR's

**Stapel indienen als PR's** doet met één klik waar stacking-tools geld voor
vragen:

1. Pusht elk niveau met `--force-with-lease` (verse branches verdragen het,
   gerestackte hebben het nodig).
2. Opent een PR voor elk niveau dat er nog geen heeft — elk **gebaseerd op zijn
   ouderbranch**, niet op `main`, zodat elke review alleen zijn eigen commits
   toont. Titel en beschrijving komen uit de commits van het niveau zelf.
3. Hangt elke bestaande PR waarvan de basis is weggedreven om naar de juiste
   basis.
4. Schrijft een **stapelnavigatiesectie** in de body van elke PR, zodat een
   reviewer op elk willekeurig niveau de hele keten kan zien en waar deze PR
   erin zit.

De actie is **idempotent**: druk erop na elke restack of elk nieuw niveau en ze
convergeert — niets wordt gedupliceerd, alleen wat wegdreef wordt aangeraakt.

## Restack

Wanneer een lagere branch verandert — je verwerkte reviewopmerkingen op `api` —
staat elke branch erboven nu op de verkeerde basis. **Restack** rebaset de hele
keten cascadegewijs met `rebase --onto`, zodat een herschrijving van de ouder
geen commits in zijn kinderen dupliceert. Druk na een restack opnieuw op
**Indienen**: het force-pusht de herschreven niveaus en de PR's worden ter
plekke bijgewerkt.

## Beperkingen

- Indienen is voorlopig **alleen voor GitHub** (aanmaken werkt op alle vier de
  hosts, maar het omhangen van de basis en het bijwerken van de body vereisen
  de GitHub-API).
- Nadat de onderste PR is gemergd, ziet git nog steeds de oude keten: **stop
  het volgen** van het gemergde niveau (of zet de ouder van zijn kind op de
  trunk), restack, dien in. Het opruimen na een merge onderin is nog niet
  geautomatiseerd.
- De stapelsectie in een PR-body wordt bijgehouden tussen verborgen markeringen
  — je eigen beschrijving erboven blijft behouden.

## Waar de verbanden wonen

Ouderverbanden worden opgeslagen in de **git-config** (`git config`), dus ze
reizen mee met de repository en overleven een nieuwe kloon. Er woont niets in
een dienst.

**Zie ook:** [Interactieve rebase](rebase.md) · [Hosting & pull requests](hosting.md)
