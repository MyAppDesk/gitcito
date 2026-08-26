---
title: Taken
category: Werkomgeving & tools
order: 97
summary: Een privélijst per repository, zichtbaar vanaf de zijbalk en de statusbalk.
keywords: todo taak taken lijst checklist vinkje notitie notities herinnering prioriteit
---

# Taken

De helft van de notities die je tijdens het programmeren maakt is één regel lang
en leeft één middag: *die variabele hernoemen vóór de PR*, *het fixture-pad
klopt niet*, *vragen naar de retry-limiet*. Een issue tracker is daarvoor te
zwaar, een kladbestand belandt per ongeluk in een commit, en een geeltje bestaat
niet meer zodra je van repository wisselt.

Taken zijn die lijst, vastgemaakt aan de repository waar je in staat.

![De takenlijst met één taak open, met notities en prioriteit](../../screenshots/todos.webp)

## Waar ze staan

Nergens in je repository. Een taak wordt bewaard bij de instellingen van Gitcito
zelf, met het pad van de repository als sleutel. Dat heeft drie gevolgen die het
weten waard zijn:

- **Er wordt niets gecommit.** Er verschijnt geen bestand in `git status`, dus
  een taak kan nooit meeliften in een commit of een diff.
- **Niemand anders ziet hem.** Dit is een briefje aan jezelf, geen gedeelde
  backlog. Hoort een taak bij het team, dan hoort hij in een issue.
- **Hij volgt de map, niet de branch.** Open dezelfde kloon in twee tabbladen en
  je ziet één lijst. Kloon het project nog eens ergens anders op schijf en je
  krijgt een tweede, aparte lijst.

De branch waar je op stond toen je hem schreef, wordt bewaard als *context* en
staat in het detail. Het is een herinnering aan waar je was, geen filter: taken
verdwijnen niet als je iets anders uitcheckt.

## Er een schrijven

Open de lijst — de ↗-knop in de kop van de sectie **Taken**, de chip in de
statusbalk, of **Taken** in het commandopalet —, typ de regel en druk op
<kbd>Enter</kbd>. De sectie in de zijbalk blijft een lijst om te lezen en af te
vinken; schrijven gebeurt op één plek.

De volgorde is voor je gemaakt: eerst wat openstaat — hoge prioriteit boven
normale, normale boven lage — en binnen een prioriteit het oudste eerst, want
wat het langst genegeerd is, verdient het om gezien te worden. Afgeronde taken
zakken naar onderen, het laatst afgevinkte bovenaan, zodat een misklik met één
zet ongedaan is.

## Ze zien zonder te kijken

![De sectie in de zijbalk en de chip in de statusbalk, in één venster](../../screenshots/todos-markers.webp)

| Markering | Waar | Betekent |
|---|---|---|
| Chip <kbd>☑ 3</kbd> | Statusbalk, links van de branchnaam | Hoeveel er open staan; geel als er een hoge prioriteit tussen zit |
| Teller | De kop van de sectie in de zijbalk | Hetzelfde getal, naast de lijst zelf |

Beide verdwijnen bij nul. Een permanente “0 taken” is meubilair, en
meubilair is precies wat mensen niet meer zien.

## Het detail

Klik op een taak — in de zijbalk, op de chip in de statusbalk, of via **Taken**
in het commandopalet — om de volledige lijst met detailpaneel te openen.

| Veld | Waarvoor het is |
|---|---|
| **Titel** | De ene regel. Wordt ter plekke bewerkt; er is geen opslaanknop. |
| **Notities** | Alles wat niet in de titel paste: waarom het telt, welke bestanden, wanneer het klaar is. |
| **Prioriteit** | Laag, normaal of hoog. Stuurt de sortering en de kleur van de chip. |
| **Aangemaakt / Voltooid** | Wanneer je hem schreef en wanneer je hem afvinkte. |
| **Genoteerd op** | De branch die op dat moment uitgecheckt was. |

Dezelfde weergave heeft het filterveld, de schakelaar **Voltooide tonen** en
**Voltooide wissen**, die afgevinkte taken definitief verwijdert en vooraf
vraagt.

Die schakelaar is dezelfde als **Instellingen → Weergave → Voltooide taken verbergen**: zet je hem uit, dan verdwijnen afgevinkte taken uit deze lijst én uit het zijbalkonderdeel. Er wordt niets verwijderd en de tellingen nemen ze nog steeds mee.

## Wat het bewust niet doet

- **Geen deadlines, geen herinneringen, geen meldingen.** Een takenlijst die
  zeurt is een agenda; deze wacht tot je kijkt.
- **Geen synchronisatie en geen delen.** Hij verlaat je machine niet en zit niet
  in een workspace-export.
- **Geen koppeling met issues of commits.** Verdient een notitie zoveel
  structuur, dan is hij deze lijst ontgroeid — open een [issue](hosting.md).
- **Verwijderen is definitief.** Er is geen ongedaan-maken voor een verwijderde
  taak, want git had hem nooit vastgelegd.

**Zie ook:** [Instellingen per repository](repo-settings.md) ·
[Mission control](mission-control.md)
