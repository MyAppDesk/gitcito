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

**Er gebeurt niets tot je op Toepassen drukt.** Een branch kiezen, een stop
verplaatsen, hem van de route halen — het bewerkt allemaal een lijst op het
scherm. De echte operatie rebaset branches en checkt ze uit, en dat hoort een
verkennende klik niet te doen. Als de route klopt, voert **Route toepassen** hem
uit als één ongedaan te maken stap; **Weggooien** zet de tekening terug op wat de
repository zegt.

De route staat in merge-volgorde: de bovenste branch gaat samen in die eronder,
tot aan de branch waarop de stapel landt.

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
nieuwe basis gerebaset. Het kan dus **conflicteren**, net als een restack. Twee stops die dezelfde regels raken wisselen niet zonder
mens, en dan **gebeurt er niets**: de hele bewerking wordt teruggedraaid —
punten, ouderlinks en de halve rebase — en Gitcito noemt de twee stops die
botsen. Een aangetikt keuzemenu hoort je niet midden in een rebase achter te
laten.

**Restack** is de andere helft van de afspraak: dat is een rebase die je bij naam
vroeg, dus die stopt wél bij het conflict en geeft je de conflictweergave — ook
de manier om de geweigerde volgorde alsnog te krijgen: los het daar op,
verplaats dan de stop.

Ongedaan maken speelt de vorige route terug. Het wekt de oude commits niet op, want
de nieuwe zijn hetzelfde werk met andere ouders.

## Alles pushen

**Alles pushen** pusht elk niveau met `--force-with-lease` en houdt daar op — `gh
stack push`, zonder iets te openen. **Stapel als PR's indienen** doet dezelfde
push en daarna het PR-werk; gebruik **Alles pushen** als je de branches op de
remote wilt maar nog geen review.

## Dien de stapel in als geketende PR's

**Indienen** vraagt eerst: hoeveel pull requests het opent, hoeveel het opnieuw
richt, op welke remote, en per stuk de regel `branch → basis` — PR's openen is
openbaar en lastig terug te draaien. Aan het eind zegt een melding hoeveel er
zijn geopend en hoeveel opnieuw gericht. De navigatiesectie in elke tekst is wat
de ketting zichtbaar maakt op GitHub, dat geen begrip van stapels heeft.

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

### Op GitHub wordt het ook een echte stapel

Geketende bases zijn wat elke host begrijpt, en op GitLab, Bitbucket en Azure
DevOps is dat alles. GitHub kan meer: sinds de preview van stacked pull requests
is een stapel een object op de server. Zodra de pull requests bestaan meldt
Gitcito ze als stapel aan — van onder naar boven — en krijg je de stapelkaart in
de PR-UI, een cascading rebase aan de serverkant, en een merge op de bovenste PR
die elk niveau eronder mee laat landen.

Zit de repository niet in die preview, of kan het token geen stapels beheren, dan
wordt de aanroep geruisloos overgeslagen: de ketting en de navigatiesectie staan
op zichzelf, net als bij de andere hosts.

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
  De branch waarop de stapel landt wordt ook gecontroleerd: bestaat hij alleen
  lokaal, dan biedt het indienen aan hem te pushen en door te gaan.

## Waar de verbanden wonen

Ouderverbanden worden opgeslagen in de **git-config** (`git config`), dus ze
reizen mee met de repository en overleven een nieuwe kloon. Er woont niets in
een dienst.

**Zie ook:** [Interactieve rebase](rebase.md) · [Hosting & pull requests](hosting.md)
