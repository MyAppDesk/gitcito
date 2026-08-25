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

Gitcito tekent hem als een **route**: bovenaan een startbranch, daaronder één stop
per niveau. De PR van elke stop richt zich op de stop erboven, en de eerste landt op
de startbranch. Een stop toont zijn eigen commits, of hij een restack nodig heeft
en, eenmaal ingediend, zijn PR-nummer.

## De route bewerken

| Bediening | Wat het doet |
|-----------|--------------|
| Het veld **Start** | Waar de stapel landt. Verander het en de hele ketting wordt op de nieuwe branch gelegd en afgespeeld. |
| Het veld van een **stop** | Wisselt welke branch die positie inneemt. De branch die de route verlaat wordt alleen losgekoppeld, nooit verwijderd. |
| **↑ / ↓** | Verplaatst een stop één plek. |
| **✕** | Haalt de stop van de route; zijn buren sluiten aan. |
| **Stop toevoegen** | Kies een branch die je al hebt en hij komt bovenaan de route — of typ een naam die nog niet bestaat: hij wordt op de punt van de laatste stop gemaakt en uitgecheckt. |
| De pijlknop | Checkt die stop uit. |

Elk veld werkt met typen-en-filteren: typ om te filteren, ↑/↓ en Enter om te kiezen,
en wat je typt telt ook buiten de lijst — een remote-ref als `origin/main` is dus
een prima startbranch.

Onderhuids zijn al die bewerkingen *dezelfde* operatie: de hele route, in één keer
teruggegeven. Daarom is één handeling één keer ongedaan maken (<kbd>⌘Z</kbd>) in
plaats van een spoor van half toegepaste links.

## Wat een routewijziging kost

Alles wat de volgorde verandert — een wissel, een verplaatsing, een andere start —
**speelt** de ketting **opnieuw af**: de eigen commits van elke stop worden op hun
nieuwe basis gerebaset. Het kan dus **conflicteren**, net als een restack. Gitcito
stopt bij het eerste conflict en geeft je de conflictweergave; de stops ervoor zijn
al verplaatst.

Ongedaan maken speelt de vorige route terug. Het wekt de oude commits niet op, want
de nieuwe zijn hetzelfde werk met andere ouders.

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
- Een stop wordt **gerebased**, dus de branch waarop de stapel landt is nooit
  óók een stop, en een **beschermde** branch evenmin (`main` en `master`, tenzij
  je de lijst wijzigt). Allebei worden geweigerd in plaats van stilletjes gedeelde
  geschiedenis te herschrijven.
- Voor er iets geopend wordt vraagt het indienen aan de remote welke branches er
  echt zijn aangekomen, en noemt de ontbrekende. GitHub antwoordt op een
  ontbrekende head met een kaal "Validation Failed", waar niemand iets aan heeft.

## Waar de verbanden wonen

Ouderverbanden worden opgeslagen in de **git-config** (`git config`), dus ze
reizen mee met de repository en overleven een nieuwe kloon. Er woont niets in
een dienst.

**Zie ook:** [Interactieve rebase](rebase.md) · [Hosting & pull requests](hosting.md)
