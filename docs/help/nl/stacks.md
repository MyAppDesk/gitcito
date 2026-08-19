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

De actie is **idempotent**: druk erop na elke restack, elk nieuw niveau of
elke gemergde PR en ze convergeert — niets wordt gedupliceerd, alleen wat
wegdreef wordt aangeraakt.

Wanneer de onderste PR is **gemergd**, ruimt dezelfde knop erachter op: het
kind van het gemergde niveau wordt omgehangen naar de trunk, het niveau wordt
niet langer gevolgd, zijn lokale branch verwijderd (veilig — de trunk bevat
hem aantoonbaar), de keten gerestackt en elke overgebleven PR omgehangen.
Merge van onder naar boven, druk op Indienen, herhaal.

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
- Het opruimen na een merge onderin ziet merge- en rebase-merges, geen
  **squash**-merges: een gesquashte patch is een nieuwe commit die git niet
  naar de branch kan herleiden, dus bij een squash-gemergd niveau moet je het
  volgen handmatig stoppen. Fetch bovendien eerst — het opruimen leest de
  trunk zoals die was bij je laatste fetch.
- De stapelsectie in een PR-body wordt bijgehouden tussen verborgen markeringen
  — je eigen beschrijving erboven blijft behouden.

## Waar de verbanden wonen

Ouderverbanden worden opgeslagen in de **git-config** (`git config`), dus ze
reizen mee met de repository en overleven een nieuwe kloon. Er woont niets in
een dienst.

**Zie ook:** [Interactieve rebase](rebase.md) · [Hosting & pull requests](hosting.md)
