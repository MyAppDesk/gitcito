---
title: Repository-chat
category: AI
order: 82
summary: Stel vragen over deze repository, met de bestanden en commits die je als context vastzet.
keywords: chat vraag vragen assistent context vastzetten bijlage slepen loslaten commit bestand bewijs onderbouwd ai paneel
---

# Repository-chat

Sommige vragen zijn sneller gesteld dan opgezocht. *Waar gebeurt het vernieuwen
van het token echt? Wat veranderde deze commit, in één zin? Waarom bestaat dit
bestand?* De repository-chat beantwoordt dat voor de geopende repository en laat
de regels zien waarop het antwoord rust.

Hij deelt de rechterkolom met **Details**: de tabbladen bovenaan wisselen ertussen,
zodat de graaf zijn selectie niet kwijtraakt als je iets vraagt.

## Wat hij leest

Elk antwoord komt in twee rondes tot stand. De eerste kiest een kleine set paden
en letterlijke zoekopdrachten uit de lijst met gevolgde bestanden van de
repository zelf. De tweede antwoordt alleen met de fragmenten die dat oplevert,
en mag ook alleen die citeren: een verzonnen bestand of regel is een
validatiefout, geen aannemelijk klinkend antwoord.

| Wel | Niet |
|---|---|
| Gevolgde bestanden, zoals ze in je werkmap staan | Niet-gevolgde bestanden |
| Diffs in en buiten de stage van gevolgde bestanden | Alles wat een ignore-regel raakt, ook als het gevolgd wordt |
| Branch, voor/achter en de lijst gewijzigde paden | [Bestanden die op geheimen lijken](security.md), binaries, gegenereerde paden |

Omdat hij de werkmap leest, kun je over niet-vastgelegde wijzigingen praten. Het
betekent ook dat die wijzigingen je machine verlaten: de provider die je bij
[AI-functies](ai.md) instelde, krijgt ze.

## Context vastzetten

Het model bepaalt wat het leest. Vastzetten overrulet dat: wat vastzit wordt
**eerst** gelezen en krijgt het grootste deel van het contextbudget.

Vier manieren, allemaal naar dezelfde rij chips boven het invoerveld:

| Doe dit | Levert op |
|---|---|
| Klik op een voorgestelde chip | Het bestand in de viewer, of de commit die in de graaf geselecteerd is |
| Sleep een rij uit het tabblad **Bestanden** | Dat bestand |
| Sleep een rij uit de **commitgraaf** | Die commit — het bericht en de diff als hunks |
| **+** → *Kies een bestand…*, of sleep uit Finder/Verkenner | Elk bestand op schijf, ook buiten de repository |

Chips blijven vastzitten voor vervolgvragen; de `×` haalt er één weg, en het
wissen van het gesprek alle. Acht is het maximum.

Een vastgezette commit levert zijn bericht en maximaal twaalf diff-hunks. Hunks
op een uitgesloten pad vallen uit die diff, niet de hele commit.

## Instellingen

**Instellingen → AI → Repository-chat**:

| Instelling | Doet |
|---|---|
| **Vragen stellen over de repository** | Uit verwijdert het tabblad, de knop en het doel van de sneltoets. De rest van de AI blijft werken |
| **Chatmodel** | Een model alleen voor de chat. Leeg is dat van het profiel — vragen kost minder dan reviewen, een kleiner model volstaat vaak |
| **Alleen vastgelegde inhoud** | Antwoordt vanuit de laatste commit in plaats van je werkmap: niet-vastgelegde bewerkingen verlaten de machine nooit |

Staat AI helemaal uit, dan verdwijnt de chat mee — geen paneel dat een antwoord
aanbiedt dat niemand kan geven.

## Wat hij weigert

- **Bestanden die op geheimen lijken worden nooit gelezen**, vastgezet of niet:
  de chip komt terug als overgeslagen, met reden. Vastzetten omzeilt het
  [maskeren van geheimen](security.md) niet.
- **Binaries en bestanden groter dan 512 KB** van buiten de repository worden op
  dezelfde manier overgeslagen. Binnen gelden de gewone regels.
- **Hij schrijft nooit.** Geen stage, geen commit, geen branchwissel — hij heeft
  geen gereedschap, alleen tekst. Een antwoord dat beweert iets gedaan te hebben,
  beschrijft; het rapporteert niet.
- **Gesprekken leven alleen in het geheugen.** Elke repository houdt zijn eigen
  draad; Gitcito afsluiten gooit ze weg.

## Openen

| Toetsen | Doet |
|---|---|
| De tekstballonknop in de werkbalk | Toont of verbergt het tabblad Chat |
| <kbd>⌘⌥B</kbd> / <kbd>Ctrl+Alt+B</kbd> | Toont of verbergt het hele rechterpaneel |
| <kbd>⌘⏎</kbd> / <kbd>Ctrl+Enter</kbd> | Verstuurt het bericht |

Zie [Toetsenbord & sneltoetsen](keyboard.md) voor de rest, inclusief het
opnieuw toewijzen van de paneelschakelaars.

**Zie ook:** [AI-functies](ai.md) · [Beveiliging & geheimen](security.md) ·
[Repo-wiki](repo-wiki.md)
