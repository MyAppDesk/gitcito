---
title: Repositories
category: Synchroniseren & meerdere repo's
order: 52
summary: Elke repository die Gitcito kent, open of niet, in één doorzoekbare lijst.
keywords: repositories register alle repos favorieten ster recent scannen map bladeren vinden openen beheren repositorybeheer kleur sectie tint markeren workspaces uit mappen boom genereren bulkimport registry favourites starred recent scan folder workspaces
---

# Repositories

[Mission control](mission-control.md) beantwoordt "welke van mijn open
repositories heeft mij nodig?". Het kent alleen de tabbladen van de actieve
workspace. Repositories beantwoordt een andere vraag: **waar is die repo, en
is hij überhaupt ergens open?** Het dekt alles wat Gitcito ooit heeft
gezien. Elke workspace, elk tabblad, en wat het vindt door mappen te
scannen die jij aanwijst.

![De pagina Repositories: gekleurde secties voor open, favoriete, recente en
workspace-repositories, elke rij met naam, eigenaar, branch en
werkstatus](../../screenshots/repositories.webp)

## De secties

Een repository kan in **meer dan één sectie** staan. Met opzet: elke sectie
is een volledig antwoord op haar eigen vraag, geen plakje van één lijst.

| Sectie | Wat erin zit |
|---|---|
| Open repositories | Elk tabblad in de actieve workspace op dit moment |
| Favorieten | Gesterde repositories, over elke workspace heen |
| Recente | Alles wat je hebt geopend, nieuwste eerst. **Zonder limiet**, in tegenstelling tot de lijst van 8 in de launcher |
| Eén per opgeslagen workspace | De tabbladen van die workspace, zodat je naar een andere kunt springen zonder eerst over te schakelen |
| Alle repositories | Elke repository die het register kent, open of niet |

De balk boven de lijst is één strook: **Alles inklappen** en **Alles
uitklappen**, dan een zoekveld dat de rest van de breedte neemt, dan de
schakelaar voor het WIP-overzicht.

Zoeken filtert rijen in alle secties tegelijk, en **verbergt de secties die
niets raken** zodat de resultaten niet onder een kolom lege koppen begraven
raken. Het raakt de naam van een repository, het alias, de eigenaar of elk
deel van het pad. Als nergens iets past, zegt de pagina dat in plaats van
leeg te worden.

Met het vak leeg wordt elke sectie getoond, ook als die niets bevat:
"Favorieten 0" vertelt je dat de sectie bestaat en leeg is, en dat is het
waard om te weten. Dat is pas ruis als je al zoekt.

### Sectiekleuren

Secties komen **al gekleurd** binnen. Elke kop krijgt een eigen tint uit het
standaardpalet, inclusief een nieuwe workspace op het moment dat die
verschijnt. Het gaat om oriëntatie, niet om versiering: met een
workspace-sectie per project en vijf ingebouwde secties erboven zegt een
lange lijst op een gegeven moment niet meer waar je bent, en een tint maakt
een kop herkenbaar voordat je hem hebt gelezen.

Om er een te wijzigen, gebruik je het **⋮** op de kop: **Kleur wijzigen…**
opent dezelfde [kleurkiezer](workspaces.md) als voor groepstabbladen en
mappen, tien vaste stalen plus een vrije hex-waarde. **Kleur herstellen**
verschijnt zodra je een sectie hebt overschreven, en zet hem terug op de
toegewezen standaard.

Drie dingen die je wilt weten:

- De toewijzing is **stabiel, niet willekeurig**. Dezelfde secties krijgen
  bij elke start dezelfde kleuren, en een workspace toevoegen kleurt de
  secties erboven nooit om. Alleen de kleuren die jij wijzigt worden
  bewaard.
- De kleur is **lokaal op deze pagina**. Hier de sectie van een workspace
  kleuren zegt niets over die workspace elders in Gitcito. De tabkleur is
  een aparte instelling.
- De kleur wordt **afgemengd** tot een laag percentage van het vlak in
  plaats van op volle sterkte, zodat een verzadigde keuze in lichte en
  donkere thema's een leesbare achtergrond blijft. Een heel bleke kleur
  oogt daardoor bijna neutraal.

Bij meer dan tien secties herhaalt het palet zich, dus twee koppen kunnen
dezelfde tint delen.

## Wat een repository bekend maakt

Er staat hier een rij zodra Gitcito hem ooit heeft **geopend**, of hem
heeft gevonden onder een **scanmap**. Niets wordt geïndexeerd alleen omdat
het ergens op schijf bestaat waar je Gitcito nooit over hebt verteld.

Deze pagina openen indexeert ook wat je nu **in een tabblad open** hebt,
zo krijgen repositories die bij het opstarten worden hersteld een rij
zonder dat je ze opnieuw hoeft te openen. Het dekt alleen open tabbladen,
en het gebeurt bij het eerste bezoek van elke sessie, niet één keer voor
altijd. Een repository die je **Forget** blijft vergeten, tenzij je hem
opnieuw opent.

Scanmappen stel je in bij Instellingen:

- **Diepte** is hoeveel mapniveaus de scan onder de wortel afdaalt
  (standaard 3, maximum 10).
- Scannen **stopt bij een repository**. Een meegeleverde checkout of een
  submodule in een repo wordt niet als eigen rij geïndexeerd.
- Het gaat nooit puntmappen in, en slaat `node_modules` en vergelijkbare
  dependency-mappen over.
- Het **leest alleen mapnamen**: een `.git`-map vinden is wat iets hier
  tot repository maakt. Naam, eigenaar en branch komen uit bestanden in
  `.git` (`HEAD`, de config), nooit door `git` te draaien.

## Rijen

Rijen liggen in kolommen: ster, naam (houdt rekening met het alias als je
het hebt hernoemd), eigenaar (uit de URL van de origin-remote),
branch-chip, WIP-overzicht en acties. De kolommen gelden **voor de hele
pagina**, niet per sectie, zodat een naam in de laatste sectie onder een
naam in de eerste staat en de lijst als tabel leest, niet als stapel.

De acties aan het eind staan in rust zichtbaar, ze verschijnen niet pas bij
hover: **openen in een tabblad**, en een **⋮** dat hetzelfde
[contextmenu van de repository](repo-menu.md) opent als een
rechtermuisklik. Dat is het menu dat overal in Gitcito geldt, hier
uitgebreid met twee items die alleen deze pagina heeft:

| Actie | Wat het doet |
|---|---|
| Ster / ster weg | Zet de repository in Favorieten of haalt hem eruit |
| Locate… | Wijst een verplaatste of hernoemde map opnieuw. Alias, profielbinding en ster blijven. Had de bestemming al eigen instellingen, **wint de bestemming** |
| Forget | Haalt het item uit deze lijst. **Raakt de map op schijf nooit aan** |

Een repository waarvan de map niet meer bestaat toont als **ontbreekt**,
met **Locate…** en **Forget** inline in plaats van de gewone rij-acties.

De ster is een favorietenschakelaar, geen meerkeuzevakje. Batchwerk loopt
hier per sectie, niet per selectie. Zie hieronder.

## Een mappenboom in workspaces veranderen

Je code-map codeert de groepering die je wilt al. Als `~/Code` `client-a`,
`client-b` en `personal` bevat, zijn dat contexten waartussen je wisselt, en
een [workspace](workspaces.md) is precies dat, met een eigen tabstrook.

**Scanmap toevoegen…** biedt aan ze te bouwen. Nadat de scan heeft
geïndexeerd, somt een dialoog de mappen **direct in** degene die je koos,
met hoeveel repositories elk houdt. Vink aan wat je wilt. Elke wordt een
workspace met **één tabblad per repository**.

| Rij | Betekenis |
|---|---|
| Een mapnaam en een aantal | Standaard aangevinkt. Wordt een workspace |
| "{n} nieuw, voegt samen in …" | Er bestaat al een workspace voor deze map. Alleen de nieuwe repositories komen erbij |
| "Al in een werkruimte" | Niets te doen, grijs in plaats van verborgen |
| De naam van de wortel zelf | Repositories die los in de gekozen map liggen, niet in een submap. Standaard niet aangevinkt |

Een repository wordt onder de **eerste map onder de wortel** gezet, hoe
diep die ook zit: `~/Code/client-a/nested/app` gaat naar `client-a`. Mappen
zonder repositories worden niet aangeboden.

**Er wordt niets aangemaakt tot je bevestigt**, en annuleren laat de
indexering van de scan staan. De repositories zijn hoe dan ook bekend, en
dat deed deze knop al eerder.

### Later opnieuw scannen

Veilig te herhalen. Een tweede scan **voegt toe en verwijdert nooit**:

- Nieuwe repositories worden aan de bijbehorende workspace gehangen.
- Repositories die je zelf verplaatste, hernoemde of weghaalde blijven zoals
  je ze achterliet.
- Een workspace die je **hernoemde** wordt nog herkend. Gitcito onthoudt de
  map waar hij vandaan kwam, dus hij voegt samen in plaats van een
  duplicaat te maken.
- Een van schijf verwijderde repository houdt zijn tabblad en toont als
  ontbrekend.

Gegenereerde workspaces zijn gewone. Hernoem, herschik, herkleur of
verwijder ze als elke andere. Niets aan hen blijft bijzonder.

## Alles sluiten wat open is

De kop **Open repositories** draagt een sluitknop. **Repository sluiten**
als er één open is, **Alle tabbladen sluiten** als er meerdere open zijn.
Hij is uitgeschakeld als er niets open is.

Hij sluit de tabbladen die repositories houden en **laat paginatabbladen
met rust**, zodat de pagina Repositories waarop je staat zichzelf niet
sluit. Niets op schijf wordt aangeraakt, en er wordt niets gecommit,
gestasht of weggegooid. Een tabblad is alleen een weergave.

Meerdere sluiten vraagt eerst, en zegt hoeveel. Eentje sluiten niet: dat is
een goedkope fout, ongedaan met de gewone sneltoets om het gesloten tabblad
weer te openen. De gesloten tabbladen gaan op dezelfde stapel van tien die
een enkele close gebruikt, en openen opnieuw in de volgorde waarin ze in de
strook zaten. Meer dan tien tegelijk kunnen niet allemaal terug.

## Een hele sectie fetchen en pullen

Elke sectiekop draagt een **fetch**-knop en een gesplitste **pull**-knop.
Ze werken op elke repository in die sectie, en slaan over waarvan de map
**ontbreekt**. De repositories hoeven niet open te zijn. Een sectie met
repo's die je deze sessie nooit hebt geopend werkt hetzelfde.

Beide lopen **na elkaar**, niet parallel, zodat een sectie van veertig
repositories niet veertig git-processen tegelijk start. De statusbalk toont
welke repository wordt bewerkt en hoe ver de run is, en de hele batch
eindigt met **één** toast, niet één per repository. Als sommige mislukken,
zegt de toast hoeveel lukten en hoeveel niet. De run stopt niet bij de
eerste mislukking.

Het pijltje naast **pull** kiest wat pullen betekent:

| Modus | Wat het doet |
|---|---|
| Pull (fast-forward indien mogelijk) | De standaard van Git. Fast-forward als het kan, merge als het niet kan |
| Pull (alleen fast-forward) | Weigert in plaats van een merge-commit te maken |
| Pull (rebase) | Speelt je lokale commits opnieuw af bovenop de upstream |

Die keuze is één **globale voorkeur**, geen per-sectie: het beschrijft hoe
jij pullt, en het vanuit het pijltje van één sectie zetten verandert het
overal. Elke **multi-repository**-pull houdt zich eraan. De sectieknoppen
hier, fetch/pull op een [groepstabblad](workspaces.md) en de bulk-pull van
[mission control](mission-control.md). Een **enkele** repository pullen
vanaf de werkbalk blijft onaangetast, omdat dat menu je al vraagt welke
soort pull je wilt.

## De actiebalk

**Map openen…**, **Klonen…** en **Scanmap toevoegen…**. Drie manieren om
een repository in het register van Gitcito te brengen, vanaf dezelfde
pagina waarop je er een zoekt die er al is.

## WIP-overzicht

Een optioneel vinkje. Aan, en elke **uitgeklapte** rij draait een echt `git
status` en toont ongecommit werk en sync-status. Uit, en rijen kosten niets
buiten het lezen van bestanden in `.git`.

Het is expres optioneel: een overzicht kost grofweg vijf git-processen per
repository, in batches van acht, zodat een groot register de UI niet laat
stilvallen. Aanzetten is een bewuste "kijk alles na wat ik nu zie", geen
staande kostenpost.

## Grenzen

- **Niets op deze pagina ververst op een timer.** Open de pagina opnieuw,
  of zet het WIP-overzicht uit en weer aan, om de huidige staat te zien.
- **Het WIP-overzicht dekt alleen uitgeklapte secties.** Een ingeklapte
  sectie toont helemaal geen status, vinkje of niet.
- **Een repository is pas bekend als je hem hebt geopend, of een map hebt
  gescand die hem bevat.** Van hieruit kun je het bestandssysteem niet
  doorzoeken.
- **Workspaces bouwen kun je niet in één stap ongedaan maken.** De dialoog
  annuleren maakt niets, maar een plan dat je bevestigde en daarna
  betreurt, haal je terug door de workspaces met de hand te verwijderen.
- **Slechts één niveau diep.** Mappen onder het eerste niveau worden plat
  in de tabstrook van de workspace gelegd. `client-a/nested/app` wordt een
  tabblad in `client-a`, geen map erin.
- **"Nu scannen" in Instellingen biedt dit niet.** Het scant elke
  geconfigureerde wortel in één keer, waar een dialoog per map geen zin
  heeft, en indexeert alleen.
- **Alles sluiten opent tabbladen één voor één opnieuw, tot tien.** Meer
  dan tien repositories in één keer sluiten betekent dat de oudste niet
  van de stapel terugkomen, hoewel ze allemaal nog in **Recente** staan.
- **Pull filtert niet op wat achterloopt.** Het pullt elke repository in
  de sectie, omdat weten welke achterlopen eerst een fetch zou betekenen.
  Een actuele repository pullen is een no-op, dat kost tijd, geen
  veiligheid.
- **Een sectie-fetch of -pull kun je niet van de undo-stapel halen.** Fetch
  verandert niets dat je al had. Een pull die merget of rebased, draai je
  per repository terug uit de eigen geschiedenis van die repository, niet
  vanaf hier.
- **Sectiekleuren zijn cosmetisch.** Ze filteren, sorteren, groeperen of
  synchroniseren nergens, en een kleur op de sectie van een workspace is
  niet de kleur van die workspace.
- **Forget haalt het item uit de lijst, nooit van schijf.** Als de map er
  nog is, brengt dezelfde wortel scannen (of hem opnieuw openen) hem meteen
  terug.

**Zie ook:** [Mission control](mission-control.md) · [Workspaces, tabbladen & groepen](workspaces.md)
