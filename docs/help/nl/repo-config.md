---
title: Repositoryregels (.gitcito.json)
category: Werkomgeving & tools
order: 98
summary: De huisregels die met de repository meereizen — beschermde branches, commit-scopes, wat een kloon nodig heeft en een lijst vóór het pushen.
keywords: gitcito.json repository configuratie regels doctor vereisten beschermde branches scopes trailers ticket trackerlinks checklist onboarding hooksPath node submodules lfs env example
---

# Repositoryregels (`.gitcito.json`)

Elk project draagt regels met zich mee die je niet uit de code kunt afleiden.
*Nooit rechtstreeks naar `release/*` pushen.* *Commit-scopes zijn `api`, `web` en
`infra`, en verder niets.* *Je hebt Node 20 nodig, uitgecheckte submodules en een
`.env` gekopieerd van `.env.example` voordat er iets draait.* Die regels staan in
een README die niemand herleest, in een CI-fout, of bij degene die hier het
langst zit.

`.gitcito.json` is waar een repository ze opschrijft zodat de tool ernaar kan
handelen. Het bestand staat in de hoofdmap van de repository, wordt net als elk
ander bestand gecommit en reist dus mee met de kloon: iedereen die het project
opent krijgt dezelfde regels, en een nieuwkomer krijgt ze op dag één in plaats
van bij de eerste geweigerde push.

Het bestand is volledig optioneel. Een repository zonder gedraagt zich precies
zoals altijd.

Je hoeft het niet met de hand te schrijven: de [repository-chat](repo-chat.md)
krijgt het schema van dit bestand, dus *voeg ticketlinks toe voor JIRA-1234* of
*bescherm de release-branches* komt terug als een beoordeelbare bestandsactie.

![Het tabblad Config van de repository, met de doctor-regels en de regelsecties](../../screenshots/repo-config.webp)

## Waar je het bewerkt

Het tandwiel naast het gereedschap in de werkbalk → **Config**. Die editor
schrijft het bestand naar je working tree; het wordt nergens anders bewaard, dus
**commit het** om de regels met het team te delen.

Heeft de repository er nog geen, dan stelt **Lees de repository** er een voor op
basis van wat er al is: een `.nvmrc` of `engines.node`, een `.gitmodules`,
`filter=lfs` in `.gitattributes`, een `.env.example` zonder `.env` ernaast, de
branches die je lokaal al beschermt, en de scopes die de laatste 500
commit-onderwerpen gebruiken. Er wordt niets geschreven tot je opslaat. Vanaf de
terminal doet `gitcito config init` hetzelfde (zie [de opdrachtregel](cli.md)).

## Wat het bestand kan zeggen

```json
{
  "version": 1,
  "protect": ["main", "release/*"],
  "links": {
    "tickets": [
      { "match": "\\b[A-Z][A-Z0-9]+-\\d+\\b", "url": "https://tracker.example.com/browse/$0", "label": "Jira" }
    ]
  },
  "commit": {
    "scopes": ["api", "web", "infra"],
    "ticketFromBranch": true,
    "trailers": ["Refs: {ticket}"]
  },
  "requires": {
    "node": ">=20",
    "hooksPath": ".husky",
    "submodules": true,
    "lfs": true,
    "files": [{ "path": ".env", "from": ".env.example", "why": "API-basis-URL en een dev-token" }]
  },
  "checklist": {
    "push": ["Draai de integratiesuite tegen staging"]
  }
}
```

| Veld | Wat het doet |
|---|---|
| `version` | Moet `1` zijn. Een bestand uit een nieuwer schema wordt in zijn geheel genegeerd in plaats van geraden. |
| `protect` | Branchnamen, waarbij `*` op elke reeks tekens past. Wordt **toegevoegd** aan de branches die je lokaal beschermt — zie [beschermde branches](repo-settings.md). |
| `links.tickets` | Een reguliere expressie en een URL-sjabloon. `$0` is de hele match, `$1`…`$9` zijn groepen. Matches in commit-onderwerpen en -teksten worden links. |
| `commit.scopes` | De scopes die de composer aanbiedt, in plaats van een vrij tekstveld. Ze declareren maakt van een onbekende scope in `gitcito commit-check` bovendien een fout in plaats van stijladvies. |
| `commit.ticketFromBranch` | Vult de ticketsleutel in vanuit de branchnaam (`feature/ABC-123-iets` → `ABC-123`) — maar alleen in een lege composer, nooit over iets dat je aan het typen bent. |
| `commit.trailers` | Regels die aan de commit-tekst worden toegevoegd. `{ticket}` en `{branch}` worden ingevuld; een regel waarvan de plaatshouder niets te vullen heeft wordt weggelaten in plaats van halfslachtig geschreven. |
| `requires.*` | Wat een werkende kloon nodig heeft. Elke regel wordt hieronder een doctor-rij. |
| `checklist.push` | Vrije tekst, één keer per sessie getoond vóór de eerste push. |

## De doctor

`requires` is het deel dat antwoord geeft op *"ik heb het gekloond en het draait
niet"*. Gitcito controleert het bij het openen van de repository en toont een
stethoscoop-chip in de statusbalk als er iets mis is. Klikken opent het tabblad
Config bij de doctor-rijen; **Opnieuw controleren** draait ze nog eens.

| Controle | Slaagt wanneer | Herstel via |
|---|---|---|
| `node` | De `node` in je PATH voldoet aan de specificatie | — |
| `submodules` | Geen enkele submodule mist een checkout | `git submodule update --init --recursive` |
| `lfs` | git-lfs is geïnstalleerd en getrackte bestanden zijn echte inhoud, geen pointertekst | `git lfs pull` |
| `hooksPath` | `core.hooksPath` komt overeen met het opgegeven pad | `core.hooksPath` instellen |
| `files` | Het bestand bestaat | het kopiëren vanaf `from`, als dat bestaat |

Twee bewuste grenzen. Een **waarschuwing** betekent nooit "kapot" — het betekent
dat de doctor iets niet kon vaststellen (een onleesbare Node-specificatie slaagt
in plaats van een fout te verzinnen waar je niets mee kunt), en waarschuwingen
laten `gitcito doctor` in CI niet falen. En een herstelactie komt nooit uit het
bestand: de set hierboven is de hele set, gesloten bij het compileren. De
configuratie geeft er een waarde aan — een pad om te kopiëren, een waarde voor
`core.hooksPath` — en nooit een commando.

Kopiëren overschrijft nooit: dat het bestand ontbreekt is precies de reden dat
die rij er staat.

## Commits

Met `commit.scopes` gedeclareerd biedt de scope-knop van de composer die lijst in
plaats van een vrij tekstveld — het verschil tussen `feat(renderer)` en
`feat(rendererr)`. `ticketFromBranch` en `trailers` vullen de mechanische delen
van een bericht in, en `links.tickets` maakt van de sleutels weer links overal
waar een commit wordt getoond.

Dezelfde regels gelden buiten het venster: `gitcito commit-check` leest dit
bestand, zodat een `commit-msg`-hook en CI precies afdwingen wat de composer
voorstelt. Zie [de opdrachtregel](cli.md) en [committen](committing.md).

## De pushlijst

`checklist.push` verschijnt als bevestiging vóór de eerste push van een sessie,
één regel per item. Het is de plek voor wat echt een afweging is — *heeft iemand
support ingelicht?* — want Gitcito **controleert ze nooit voor je**. Het zijn
herinneringen, geen poorten: lezen en pushen, of annuleren. Eén keer per
repository per sessie, want een dialoog bij elke push is een dialoog die niemand
leest.

## Waarom het je geen kwaad kan doen

Het bestand komt met de repository mee, en dus van wie de repository schreef. Het
wordt behandeld als niet-vertrouwde inhoud, niet anders dan een commit-bericht:

- **Er draait niets uit.** Er is geen veld dat een commando bevat, en de
  herstelacties van de doctor zijn een vaste lijst.
- **Het kan alleen beperkingen toevoegen.** `protect` is een unie met je lokale
  lijst — een repository kan méér beschermen dan jij koos, je nooit ompraten om
  iets níet te beschermen. Geen enkel veld zet een waarborg uit.
- **Paden kunnen de repository niet verlaten.** Absolute paden, `..`, `~`,
  stationsletters en alles wat `.git` raakt worden geweigerd, en nogmaals
  gecontroleerd op het punt waar een string een echt pad wordt.
- **Links moeten `http(s)` zijn.** Niets anders wordt aan de URL-opener van het
  systeem gegeven.
- **Alles heeft een limiet** — lengte van lijsten, strings en patronen — zodat een
  vijandige repository geen muur van tekst in een dialoog en geen duizend chips
  in een paneel kan plakken.

Een fout veld wordt weggelaten, niet fataal. De rest van het bestand geldt nog
steeds, en wat is weggelaten staat met reden onder **Genegeerd door Gitcito** in
het tabblad Config. De enige uitzondering is ongeldige JSON of een onbekende
`version`, waar niets te redden valt.

## Wat het bewust niet doet

- **Geen commando's, geen scripts, geen hooks.** Daar zijn [hooks](hooks.md)
  voor, en die zijn een beslissing per kloon.
- **Geen regels per branch of per persoon.** Eén bestand, één set regels.
- **Het vervangt CI niet.** De lijst is tekst; de doctor controleert de omgeving,
  niet je werk.
- **Het kan niets verzwakken.** Elke waarborg van Gitcito blijft van jou.

**Zie ook:** [Instellingen per repository](repo-settings.md) ·
[De opdrachtregel](cli.md) · [Committen](committing.md) ·
[Hooks & .gitignore](hooks.md)
