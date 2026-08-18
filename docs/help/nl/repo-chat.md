---
title: Repository-chat
category: AI
order: 82
summary: Stel vragen over deze repository, met de bestanden en commits die je als context vastzet — en laat hem git-acties voorstellen die jij goedkeurt voordat ze lopen.
keywords: chat vraag vragen assistent context vastzetten bijlage slepen loslaten commit bestand bewijs onderbouwd ai paneel acties uitvoeren goedkeuren automatisch toestaan fout herstellen toast
---

# Repository-chat

Sommige vragen zijn sneller gesteld dan opgezocht. *Waar gebeurt het vernieuwen
van het token echt? Wat veranderde deze commit, in één zin? Waarom bestaat dit
bestand?* De repository-chat beantwoordt dat voor de geopende repository en laat
de regels zien waarop het antwoord rust.

Hij deelt de rechterkolom met **Details**: de tabbladen bovenaan wisselen ertussen,
zodat de graaf zijn selectie niet kwijtraakt als je iets vraagt.

![Repository-chat met vastgezette context](../../screenshots/repo-chat.webp)

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

Eén nuance: met [actievoorstellen](#acties-uitvoeren-vanuit-de-chat)
ingeschakeld gaan de **namen** van niet-gevolgde bestanden mee in de
repositorystatus — "stage het nieuwe bestand" heeft ze nodig — maar hun inhoud
wordt nog steeds nooit gelezen.

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
| **Git-acties voorstellen in de chat** | Uit maakt de chat weer puur alleen-lezen: geen actiekaarten, geen goedkeuringsmenu |
| **Hoe voorgestelde acties worden uitgevoerd** | De goedkeuringsmodus — zie [Goedkeuringsmodi](#goedkeuringsmodi). Destructieve acties vragen hoe dan ook bevestiging |

Staat AI helemaal uit, dan verdwijnt de chat mee — geen paneel dat een antwoord
aanbiedt dat niemand kan geven.

Het chatmodel is ook te wisselen in de koptekst van het paneel zelf, naast de
naam van de provider — dezelfde instelling, zonder Instellingen te openen.

![Instellingen van de repository-chat](../../screenshots/settings-repo-chat.webp)

## Werken met berichten

Berichten zijn gewone tekst. Selecteer een willekeurig deel en kopieer het, of
klik met de rechtermuisknop op een ballon: **Kopiëren** neemt de selectie,
**Bericht kopiëren** het hele bericht — een antwoord wordt gekopieerd als zijn
Markdown-bron — en als de klik op een link viel, neemt **Link kopiëren** het
adres.

Links openen in je standaardbrowser, nooit binnen Gitcito — Markdown-links in
antwoorden en gewone `https://`-adressen in je eigen berichten.

Wanneer een bericht een afbeelding noemt — een repositorypad zoals
`docs/logo.png`, of een URL die eindigt op een afbeeldingsextensie — toont
zweven boven de vermelding een kleine voorvertoning. Repositorypaden worden uit
je werkboom gelezen; een vermelding die niet naar een leesbare afbeelding
leidt, toont gewoon niets.

![Afbeeldingsvoorbeeld bij zweven](../../screenshots/repo-chat-image-hover.webp)

## Acties uitvoeren vanuit de chat

Vraag om een verandering in plaats van een feit — *stage de
markdown-bestanden, commit dit als fix, zet de buildoutput op de ignorelijst* —
en het antwoord komt met een **actiekaart**: de concrete stappen die de
assistent wil zetten, één rij per actie, met de knoppen **Uitvoeren** en
**Afwijzen**. Niets op de kaart is al gebeurd; het model kan alleen
voorstellen, en elk voorstel wordt tegen de werkmap gecontroleerd voordat jij
het ziet — een actie die een niet-bestaand bestand noemt, wordt afgewezen, niet
getoond.

![Voorgestelde acties in de chat](../../screenshots/repo-chat-actions.webp)

De set acties is dezelfde die de **Uitvoeren**-assistent in de werkbalk
gebruikt: ignore-patronen, stage, unstage, commit, stash, discard, branch,
checkout, tag. Alles daarbuiten — push, pull, reset, rebase, force-operaties —
wordt bewust geweigerd; de chat verwijst je dan naar de gewone UI.

### Goedkeuringsmodi

Het schildmenu onder het invoerveld (ook in **Instellingen → AI →
Repository-chat**) bepaalt hoe een kaart loopt:

| Modus | Voert uit |
|---|---|
| **Altijd vragen** | Niets totdat je op de kaart op **Uitvoeren** drukt |
| **Veilige acties automatisch uitvoeren** | Voorstellen die alleen uit omkeerbaar huishoudwerk bestaan — stage, unstage, ignore, branch, tag — lopen bij aankomst; al het andere wacht op de knop |
| **Alle acties automatisch uitvoeren** | Elk voorstel loopt bij aankomst, behalve destructieve |

Een voorstel dat **niet-vastgelegde wijzigingen zou weggooien, vraagt altijd
eerst**, in elke modus, en de bevestiging noemt de bestanden die verloren
zouden gaan. De kaart meldt wat er echt gebeurde — hoeveel acties liepen, of de
fout die ze stopte — en de assistent hoort de uitkomst, zodat een vervolgvraag
weet of zijn plan is uitgevoerd of afgewezen.

### Fouten oplossen met de assistent

Wanneer een git-operatie mislukt en AI-chat beschikbaar is, krijgt de fouttoast
een sparkle-knop: die opent de chat met de fout in het invoerveld geplakt,
zodat "waarom mislukte dit en wat nu" één klik is. Het concept is bewerkbaar —
er wordt niets verstuurd tot je op Verzenden drukt.

## Wat hij weigert

- **Bestanden die op geheimen lijken worden nooit gelezen**, vastgezet of niet:
  de chip komt terug als overgeslagen, met reden. Vastzetten omzeilt het
  [maskeren van geheimen](security.md) niet.
- **Binaries en bestanden groter dan 512 KB** van buiten de repository worden op
  dezelfde manier overgeslagen. Binnen gelden de gewone regels.
- **Hij schrijft nooit uit zichzelf.** Het model heeft geen gereedschap, alleen
  tekst: een verandering komt als voorstelkaart, loopt alleen onder
  [jouw goedkeuringsregels](#goedkeuringsmodi), en een destructieve stap vraagt
  altijd bevestiging. Met **Git-acties voorstellen in de chat** uit stelt hij
  niet eens voor.
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
