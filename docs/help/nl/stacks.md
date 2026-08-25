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

Gitcito tekent de stapel van boven naar beneden, tot aan de trunk waarop hij
landt. Elk niveau toont zijn eigen commits, **waar zijn PR op gaat richten** —
het niveau eronder, en de trunk voor de onderste — en, eenmaal ingediend, zijn
PR-nummer als een klikbaar plaatje.

## Er een bouwen

| Doe dit | En |
|---------|-----|
| **Niveau toevoegen** | Maakt een branch boven op het blad en checkt hem uit. Dit is `gh stack add`, met een keuzeveld in plaats van een verplicht argument. |
| **Erboven toevoegen** op een niveau | Hetzelfde, maar *midden* in de stapel: wat op dat niveau stond wordt naar de nieuwe branch verlegd, dus de ketting houdt zijn volgorde en krijgt er een verdieping bij. Er wordt niets opnieuw afgespeeld — de nieuwe branch ontstaat op de punt van zijn ouder. |
| **Bestaande branch toevoegen** | Een branch die je al hebt komt boven op het blad in de stapel. Handig als je gewoon begon en pas later doorhad dat het een stapel was. |

Elk branchveld werkt met **typen-en-filteren**: typ om te filteren, ↑/↓ en Enter
om te kiezen, en wat je typt telt ook buiten de lijst — een remote-ref als
`origin/main` is dus een prima basis.

## Opnieuw ordenen

De pijlen **↑ / ↓** op een niveau wisselen het met zijn buur. Dat is geen
metadatawijziging: de ketting wordt opnieuw gelegd en afgespeeld, zodat de eigen
commits van elk niveau op hun nieuwe basis landen. De zet is ongedaan te maken
(<kbd>⌘Z</kbd>) — dat speelt de oude volgorde terug, het wekt de oude commits
niet op.

Omdat opnieuw ordenen een reeks rebases is, kan het **conflicteren**, net als een
restack. Gitcito stopt bij het eerste conflict en geeft je de conflictweergave;
de niveaus eronder zijn al verplaatst.

## Ergens anders op richten

**Ouder instellen** op een niveau opent hetzelfde keuzeveld: kies een andere
branch en de link van dat niveau verschuift. De **basis**-regel onderaan doet dat
voor de trunk — verander hem en de hele stapel wordt op de nieuwe trunk gelegd en
afgespeeld.

## Alles pushen

**Alles pushen** pusht elk niveau met `--force-with-lease` en houdt daar op — `gh
stack push`, zonder iets te openen. **Stapel als PR's indienen** doet dezelfde
push en daarna het PR-werk; gebruik **Alles pushen** als je de branches op de
remote wilt maar nog geen review.

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
- Het opruimen na een merge onderin ziet merge- en rebase-merges via de
  afstamming, en **squash**-merges door GitHub te vragen of de PR van de
  branch is geland — met een GitHub-token wordt dus elke mergestijl opgeruimd.
  Op andere hosts, of zonder token, moet je bij een squash-gemergd niveau het
  volgen nog steeds handmatig stoppen. Fetch bovendien eerst — de
  afstammingscontrole leest de trunk zoals die was bij je laatste fetch.
- De stapelsectie in een PR-body wordt bijgehouden tussen verborgen markeringen
  — je eigen beschrijving erboven blijft behouden.
- Opnieuw ordenen en van trunk wisselen **herschrijven geschiedenis** op elk
  niveau dat ze raken. De branches zijn van jou en ongepushte niveaus kosten
  niets, maar een niveau dat al in review is krijgt bij de volgende indiening een
  force-push.
- Een niveau schuift één plek per keer. Twee wissels zijn twee rebases, en
  halverwege stoppen is een leesbare toestand; een sleep die drie plekken verder
  landt niet.

## Waar de verbanden wonen

Ouderverbanden worden opgeslagen in de **git-config** (`git config`), dus ze
reizen mee met de repository en overleven een nieuwe kloon. Er woont niets in
een dienst.

**Zie ook:** [Interactieve rebase](rebase.md) · [Hosting & pull requests](hosting.md)
