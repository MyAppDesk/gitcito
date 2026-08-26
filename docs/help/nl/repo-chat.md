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

**Een tweede blik.** De eerste ronde moet alleen aan namen raden welke bestanden
ertoe doen — precies de gok die misgaat bij "waar wordt dit aangeroepen". Een
antwoord mag daarom terugvragen in plaats van raden: het kan meer paden, meer
letterlijke zoekopdrachten of commit-hashes uit de recente historie noemen,
waarna de vraag opnieuw wordt gesteld met wat dat oplevert. Dat gebeurt hooguit
twee keer — elke ronde is weer een modelaanroep waar je op wacht — en in de
laatste moet het antwoorden met wat het heeft. Je merkt er niets van behalve een
iets langere wachttijd en een beter antwoord.

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
| **Bestands- en Git-acties voorstellen in de chat** | Uit maakt de chat weer puur alleen-lezen: geen actiekaarten, geen goedkeuringsmenu |
| **Alleen-lezenmodus voor bestanden** | Aan blokkeert bestanden maken, bewerken, vervangen en verwijderen, maar Git-acties blijven beschikbaar. Standaard ingeschakeld |
| **Hoe voorgestelde acties worden uitgevoerd** | De goedkeuringsmodus — zie [Goedkeuringsmodi](#goedkeuringsmodi). Destructieve acties vragen hoe dan ook bevestiging |
| **Chat mag externe acties voorstellen** | Standaard uit. Aan voegt fetch, pull, push, een pull request openen en een stack indienen toe |

Staat AI helemaal uit, dan verdwijnt de chat mee — geen paneel dat een antwoord
aanbiedt dat niemand kan geven.

Het chatmodel is ook te wisselen in de koptekst van het paneel zelf, naast de
naam van de provider — dezelfde instelling, zonder Instellingen te openen.

De toverstafknop naast de paneeltitel opent de **AI-configuratiewizard** — een
begeleide flow die assistentconfiguratiebestanden (instructies, agents, hooks)
voor deze repository genereert. Zie [AI-functies](ai.md).

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
en het antwoord komt met een **actiekaart**. Een leeg gesprek biedt onder de
introductie een paar voorbeeldverzoeken als chips aan; erop klikken vult het
invoerveld, zodat je het verzoek kunt bewerken voor je het verstuurt. De kaart
somt de concrete stappen op die de
assistent wil zetten, één rij per actie, met de knoppen **Uitvoeren** en
**Afwijzen**. Niets op de kaart is al gebeurd; het model kan alleen
voorstellen, en elk voorstel wordt tegen de werkmap gecontroleerd voordat jij
het ziet — een actie die een niet-bestaand bestand noemt, wordt afgewezen, niet
getoond.

![Leeg gesprek met voorbeeldverzoeken](../../screenshots/repo-chat-empty.webp)

![Voorgestelde acties in de chat](../../screenshots/repo-chat-actions.webp)

Repository-chat kan exacte bewerkingen, het aanmaken of volledig vervangen van
bestanden en verwijderen voorstellen, gevolgd door Git-acties: ignore-patronen,
stagen, unstagen, committen, stashen, weggooien, branch, wisselen, tag en —
omdat de branchlijst en de recente commits worden getoond — merge, rebase,
revert en cherry-pick. Gitcito berekent de uitklapbare diff lokaal. Bestaande
bestanden moeten uit gelezen bewijs komen; onveilige, geheime, genegeerde,
gegenereerde, binaire, verouderde, te grote en via symlink bereikte doelen
worden geweigerd. Reset, historie herschrijven, branches verwijderen en elke
force-operatie blijven in hun eigen scherm.

Een merge of rebase kan op een conflict stranden. Dan stopt de run daar, markeert
de kaart die regel als mislukt en houdt het aantal al uitgevoerde acties bij, en
neemt de conflictbanner het over, net als bij dezelfde operatie vanuit de
werkbalk.

De hele bestandsbatch wordt voor de eerste schrijfactie opnieuw gecontroleerd en
bij een fout teruggedraaid. Voor een commit controleert Gitcito ook of er iets is
gestaged. De kaart markeert voltooide, mislukte en overgeslagen acties en bewaart
gedeeltelijke resultaten. Daarna vat een afzonderlijke aanroep zonder acties het
werkelijke resultaat samen.

**Hij kan ook `.gitcito.json` schrijven.** De chat krijgt de vorm van het
[eigen configuratiebestand van de repository](repo-config.md), dus *voeg
ticketlinks toe voor JIRA-1234* of *bescherm de release-branches* wordt een
bestandsactie tegen het echte schema in plaats van plausibel ogende sleutels die
de loader zou weigeren. Bestandsacties moeten aanstaan — dezelfde schakelaar
voor de alleen-lezen modus.

**Regels die om een plaatje vragen, krijgen er een.** Eén regel samenvatting
volstaat voor "stage twee bestanden" en bij lange na niet voor "open vier pull
requests op een stack": regels die vorm beschrijven, tekenen die vorm — de
branch die een push publiceert en hoever die voorloopt, de twee refs van een
merge of rebase, de commits die een revert of cherry-pick met hun onderwerp zou
herhalen, de pull request zoals die eruit komt te zien, en een stack als ladder
met de basis van elk niveau en wat het indienen daar zou doen: openen, herrichten
of laten staan.

### Acties die de machine verlaten

Ophalen, pullen, pushen, een pull request openen en een stack indienen staan
**standaard uit**, achter **Chat mag externe acties voorstellen**. Werk
publiceren verdient een bewuste keuze, en met de instelling uit hoort het model
niet eens dat die acties bestaan: het kan er geen voorstellen en geweigerd
worden — de fout die mensen leert dingen ongelezen aan te zetten.

Met de instelling aan:

| Actie | Doet |
|---|---|
| **Ophalen** / **Pullen** | Dezelfde fetch en pull als in de werkbalk; de pull-modus (merge, alleen fast-forward, rebase) hoort bij het voorstel |
| **Pushen** | Publiceert één branch naar één remote. **Nooit geforceerd**: een force push zit niet in het vocabulaire van een voorstel en kan dus niet worden voorgesteld |
| **PR openen** | Opent één pull request, concept of niet, tegen de origin van de repository. De kaart bewaart de link |
| **Stack indienen** | De volledige [stacked-PR-indiening](stacks.md): elk niveau pushen, per niveau een pull request openen of herrichten, de navigatiesectie schrijven, de GitHub-stack registreren |

![Een chatplan dat pusht en een pull request opent](../../screenshots/repo-chat-remote-actions.webp)

Een voorgestelde push doorloopt eerst dezelfde waarborgen als die van de
werkbalk: de bevestiging voor beschermde branches, de waarschuwing over het
publiceren van [bestanden die op inloggegevens lijken](security.md) en de
pre-push-checklist van de repository. Dat zijn dialogen, dus ze worden beantwoord
voordat het plan start, niet van binnenuit.

### Een plan ongedaan maken

Een plan wordt als geheel goedgekeurd en dus als geheel teruggedraaid. Vóór de
eerste actie die iets kan wijzigen legt Gitcito vast waar de branch stond en
maakt het een momentopname van de werkboom; de afgeronde kaart biedt dan **Plan
ongedaan maken**. Dat zet de branch terug naar die commit en herstelt de boom,
waarmee alles wat het plan opleverde vervalt — dus wordt eerst bevestigd, met de
commit erbij. Geopende pull requests blijven open: een remote kan een lokale
momentopname niet terughalen.

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
| <kbd>Enter</kbd> | Verstuurt het bericht |
| <kbd>Shift+Enter</kbd> | Voegt een nieuwe regel in |

Zie [Toetsenbord & sneltoetsen](keyboard.md) voor de rest, inclusief het
opnieuw toewijzen van de paneelschakelaars.

**Zie ook:** [AI-functies](ai.md) · [Beveiliging & geheimen](security.md) ·
[Repo-wiki](repo-wiki.md)
