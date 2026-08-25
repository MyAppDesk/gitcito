---
title: De menubalk
category: Begin hier
order: 5
summary: Wat er in Gitcito's macOS-menu's zit, en waarom Windows en Linux geen menubalk hebben.
keywords: menubalk menu applicatie bestand bewerken weergave venster help repository macos native over afsluiten
---

# De menubalk

Een menubalk beantwoordt een vraag die geen ander oppervlak goed beantwoordt:
*wat kan deze app eigenlijk?* Het [commandopalet](search.md) is sneller zodra je
weet wat je zoekt, en het [spiekbriefje](keyboard.md) somt de toetsen op — maar
door geen van beide blader je. Door menu's wel.

Alles wat erin staat is ook vanuit het venster bereikbaar. Niets bestaat alleen
in het menu, met opzet: een functie die alleen in een menu leeft, is een functie
die Windows- en Linux-gebruikers niet hebben.

## Wat waar staat

| Menu | Bevat |
|---|---|
| **Gitcito** | Over, controle op updates, [Instellingen](repo-settings.md), de standaardopties om te verbergen en af te sluiten |
| **Bestand** | Nieuw tabblad, een repository openen of [klonen](cloning.md), recent geopend, tabbladen sluiten en heropenen |
| **Bewerken** | Knippen, kopiëren, plakken, ongedaan maken — de tekstbewerking die je toetsenbord al doet — plus [zoeken in code](search.md) |
| **Weergave** | Commandopalet, de schakelaars voor zijbalk en paneel, de [terminal](terminal.md), [mission control](mission-control.md), de [kluis](vault.md), zoomen |
| **Repository** | Fetch, pull, push, committen, stashen, nieuwe branch, [pull request](hosting.md), ongedaan maken, tonen in Finder, repository-instellingen |
| **Venster** | Minimaliseren, zoomen, alles naar voren |
| **Help** | Dit handboek, het spiekbriefje, wat er nieuw is, licenties, een probleem melden |

Het menu Repository is volledig grijs zolang het actieve tabblad geen
git-repository is, en **Ongedaan maken** is grijs als er niets ongedaan te maken
valt — het menu is een leesbare samenvatting van wat de app je nu toestaat.

## Sneltoetsen getoond, niet opgeëist

De toetsen naast elk item zijn de toetsen die je daadwerkelijk hebt gekoppeld.
Koppel <kbd>⌘K</kbd> opnieuw in Instellingen en het menu Weergave zegt het.

Dat werkt omdat het menu die combinaties *toont* zonder ze op te eisen: Gitcito's
eigen toetsafhandeling blijft de baas, en juist daardoor kan een sneltoets zich
anders gedragen afhankelijk van waar de cursor staat. Het enige wat zo niet te
tonen is, is een sneltoets die Gitcito niet bezit — <kbd>⌘F</kbd> hoort bij het
bestand of de diff die je leest, dus geen menu-item eist die op.

## De grenzen

- **Alleen macOS.** Op Windows en Linux is het venster randloos — de titelbalk
  wordt door Gitcito getekend en een menubalk kan nergens staan. Daar leiden het
  [commandopalet](search.md) en de [sneltoetsen](keyboard.md) naar dezelfde
  opdrachten.
- **Herladen en de Ontwikkelaarstools verschijnen alleen in ontwikkelbuilds.**
  Herladen gooit de staat van elk open tabblad weg, en dat hoort in een
  uitgebrachte versie niet naast Zoomen te staan.
- **Recent geopend toont hoogstens tien repository's**, de nieuwste eerst, en
  volgt dezelfde lijst als het [welkomstscherm](getting-started.md).
- **Tabblad heropenen is nooit grijs.** De stapel gesloten tabbladen leeft
  alleen tijdens de sessie en het menu kan hem niet zien; kiezen zonder iets om
  te heropenen doet niets.
