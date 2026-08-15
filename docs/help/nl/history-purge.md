---
title: Een bestand uit de geschiedenis verwijderen
category: Branches & ingrepen
order: 48
summary: Haal een gelekte credential of een enorme binary uit elke commit — en begrijp precies wat dat kost.
keywords: purge geschiedenis herschrijven rewrite filter-branch bfg filter-repo gelekt secret geheim credential token bestand verwijderen grote blob repository krimpen back-up pre-purge roteren bladeren grootste bestanden
---

# Een bestand uit de geschiedenis verwijderen

`git rm` zorgt dat een bestand niet meer in *nieuwe* commits opduikt. Aan de
commits die er al zijn doet het niets: de blob zit nog in de objectdatabase, nog
in elke kloon, nog altijd één `git show` van je vandaan.

Dat telt op twee momenten — toen het bestand een credential was, en toen het
400 MB was.

`⌘K` → **Bestand uit geschiedenis verwijderen**, of rechtsklik het bestand — in
de projectboom, in de bestandenlijst van een commit, of in de commitopsteller. De
commit die een bestand *verwijderde* is meestal waar iemand doorheeft dat het nog
in de geschiedenis zit, dus de uitweg zit ook in dat menu.

## Het pad vinden

Twee ingangen, want ze beantwoorden verschillende vragen.

**Typ het** — relatief aan de repository, zonder schuine streep vooraan —
wanneer je al weet wat je kwam verwijderen.

**Blader door de geschiedenis** wanneer dat niet zo is. Het somt elk pad op dat
ooit gecommit is, zwaarste eerst, met hoeveel versies elk heeft en of het nog
getrackt wordt. Verwijderde paden zijn als zodanig gemarkeerd en zijn meestal de
paden die je zoekt: een bestand dat weg is uit de werkboom maar nog in elke kloon
zit, is precies het geval dat een gewoon bestandsvenster je niet kan tonen, want
het bestand is er niet om te kiezen.

Dezelfde lijst beantwoordt de andere reden waarom mensen hier komen — *waarom is
deze kloon twee gigabyte* — want hij is gesorteerd op het aantal bytes dat de
blobs van elk pad werkelijk innemen. Een rij aanklikken meet het meteen.

![Elk pad dat ooit gecommit is, zwaarste eerst, met de verwijderde gemarkeerd](../../screenshots/history-purge-browse.webp)

## Meten voor je akkoord gaat

Druk op **Meten** (of kies een rij). Er wordt nog niets geschreven. Je krijgt:

| | |
|---|---|
| **Herschreven commits** | Elke commit vanaf de eerste die het bestand bevatte |
| **Branches / tags** | Refs die gaan verschuiven |
| **Vastgehouden door zijn blobs** | Bytes die die versies werkelijk innemen |
| **Eerste commit** | Waar de herschrijving begint — alles erna krijgt een nieuwe hash |

![De meting: herschreven commits, geraakte refs, vastgehouden bytes, en de waarschuwing om het geheim toch te roteren](../../screenshots/history-purge.webp)

Is het aantal nul, dan klopt het pad niet. Dat is meestal een spelfout of een
mapprefix, geen afwezigheid.

## Wat de herschrijving werkelijk doet

Gitcito kopieert elke branch en tag naar
`refs/gitcito/pre-purge/<timestamp>/…`, en draait dan:

```sh
git filter-branch --force \
  --index-filter 'git rm --cached --ignore-unmatch -- <path>' \
  --prune-empty --tag-name-filter cat -- --branches --tags
```

`--index-filter` herschrijft de index rechtstreeks in plaats van elke commit uit
te checken, en dat is het verschil tussen minuten en uren. `--branches --tags` in
plaats van `--all` is met opzet: `--all` zou de back-uprefs meenemen, en dan zou
de herschrijving haar eigen vangnet opeten.

Commits die niets anders bevatten dan het verwijderde bestand vallen weg
(`--prune-empty`). Tags worden opnieuw naar hun herschreven commits gewezen.

## De back-up, en waarom de ruimte nog niet terugkomt

De purge is terug te draaien, en de prijs daarvan is dat **de schijfruimte pas
wordt teruggegeven als jij dat zegt**. Zolang de back-up bestaat zijn de oude
commits nog bereikbaar, dus git ruimt ze niet op.

| Actie | Effect |
|--------|--------|
| **Herstellen** | Elke branch en tag keert terug naar zijn commit van vóór de purge; het bestand komt met ze mee terug |
| **Back-up weggooien** | Verwijdert de back-uprefs, laat de reflog verlopen, draait `git gc --prune=now` — ruimte terug, purge nu definitief |

Twee stappen in plaats van één, want de eerste is de herstelbare helft en de
tweede niet.

## Roteer het geheim toch

**Als een credential ooit gepusht is, maakt je geschiedenis herschrijven het lek
niet ongedaan.** Iemand kan het gefetcht hebben; forge-servers houden objecten
zonder verwijzing nog een tijd vast; een CI-log kan het afgedrukt hebben. De
herschrijving stopt de verdere verspreiding — ze draait de blootstelling niet
terug.

Roteer de sleutel. Purge daarna, zodat de volgende die kloont hem niet vindt.

## Wat het niet zal doen

- **Het pusht niet.** Herschrijven is lokaal. Het resultaat publiceren betekent
  een force push naar elke geraakte branch, en iedereen moet opnieuw klonen of
  hard resetten — de [force-push-bewaking](syncing.md) is waar die beslissing
  woont.
- **Het weigert bij een vuile werkboom** of midden in een merge/rebase. Een
  herschrijving verzet HEAD keer op keer, en dat rond niet-gecommit werk doen is
  hoe dat werk verdwijnt.
- **Het herschrijft op pad, niet op inhoud.** Een geheim verwijderen dat in een
  bronbestand geplakt is in plaats van in een eigen bestand te wonen vraagt een
  inhoudsfilter — dat is het terrein van `git filter-repo --replace-text`, en
  Gitcito zet daar geen schil omheen.
- **`filter-branch` is traag bij zeer grote geschiedenissen.** Het is wat overal
  met git meekomt, en daarom gebruikt Gitcito het. Bij een repository met
  tienduizenden commits is `git filter-repo` in de [terminal](terminal.md) de
  snellere tool.
- **De klonen van anderen zijn niet jouw repository.** Zij houden de oude
  geschiedenis tot ze opnieuw klonen.
