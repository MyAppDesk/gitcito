---
title: Mission control
category: Synchroniseren & meerdere repo's
order: 51
summary: Elke repository van de workspace op één scherm, ergste eerst.
keywords: mission control dashboard alle repos overzicht status vuil dirty ongepusht behind achter workspace
---

# Mission control

Twintig repository's, en de vraag is altijd dezelfde: welke heeft mij nodig?

Mission control beantwoordt hem. Elke repository van de **actieve workspace** op
één scherm, geordend naar wat je werkelijk nodig heeft:

1. **Geblokkeerd** — een rebase of merge die halverwege bleef steken,
   conflicten, een repo die helemaal niet gelezen kan worden.
2. **Te synchroniseren** — commits om te pullen, daarna commits om te pushen.
3. **Onderhanden** — niet-gecommit werk, untracked bestanden.
4. **Schoon** — de stille, onderaan, waar ze horen.

![Elke repository op één scherm, ergste eerst](../../screenshots/mission-control.webp)

## Wat een rij je vertelt

Elke rij lees je van links naar rechts, en de kolommen lijnen uit over de hele
lijst, zodat de tellingen zich vergelijken als in een tabel:

| Kolom | Wat ze toont |
|---|---|
| **Repository** | Naam, groep, de branch en zijn upstream — of **geen upstream** in amber: zo’n branch wordt nooit per ongeluk gepusht, maar synchroniseert ook nooit |
| **Laatste commit** | Onderwerp en auteur: waar de repository het laatst mee bezig was, zonder hem te openen |
| **Tellingen** | Conflicten · ↓ te pullen · ↑ te pushen · gestaged · gewijzigd · niet gevolgd · stashes · open PR’s (als de repo al geladen is). Hover voor wat elke telling telt |
| **Activiteit** | Een sparkline van 14 dagen commits, en hoeveel het er zijn |
| **Leeftijden** | Hoe lang geleden de laatste commit was, en de laatste **fetch** |

Hover over het statusicoon voor de redenen waarom de rij daar staat —
"2 te pushen · 1 niet gecommit".

De fetch-leeftijd staat er omdat deze pagina lezen nooit fetcht: de telling "te
pullen" is maar zo vers als de laatste fetch. Heeft een branch met upstream een dag
of langer niet gefetcht, of nooit, dan wordt de leeftijd amber — fetch voordat je
een 0 gelooft. De tijd komt van git zelf, dus een `git fetch` in een terminal telt
ook.

In een smal venster wijkt eerst de kolom met de laatste commit; de tellingen
blijven.

Klap een rij uit (het pijltje, of <kbd>spatie</kbd>) om precies te zien welke
commits op pushen wachten en welke bestanden vuil zijn.

## De lijst afwerken

- De statuspillen bovenaan zijn **filters** — klik op "3 geblokkeerd" om alleen
  die te zien.
- Sorteer op **urgentie**, **naam** of **activiteit**.
- **Vink meerdere repo's aan** om ze te fetchen, of pull alleen degene die achter
  liggen (de knop telt ze voor je).
- Zolang het open staat ververst het zichzelf elke 30 seconden.

| Toets | Actie |
|---|---|
| <kbd>↑</kbd> <kbd>↓</kbd> of <kbd>j</kbd> <kbd>k</kbd> | Door de lijst lopen |
| <kbd>Enter</kbd> | Die repository openen |
| <kbd>f</kbd> / <kbd>p</kbd> | Hem fetchen / pullen |
| <kbd>spatie</kbd> | Hem uitklappen |
| <kbd>/</kbd> | Naar het filter springen |

## Het is een weergave, geen tabblad

De meter naast de workspacenaam schakelt hem aan en uit; op een willekeurig
tabblad klikken brengt je terug naar je werk. Het voegt nooit een eigen tabblad
toe, en het hoort bij de workspace waarin je zit — wissel van workspace en je
krijgt het dashboard van die workspace.

Het lezen ervan is **puur lokaal**: één `git status` per repository, geen
netwerk, geen tokens. Het dashboard openen authenticeert nergens. Fetchen is
altijd iets waar jij om vroeg.

**Zie ook:** [Workspaces & tabbladen](workspaces.md) · [Workspaces, tabbladen & groepen](workspaces.md)
