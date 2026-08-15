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

Branch en zijn upstream · ↑voor / ↓achter · aantallen niet-gecommit en untracked ·
stashes · openstaande PR's (wanneer de repo al geladen is) · een **sparkline van
14 dagen commits** · hoe lang geleden de laatste commit was.

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
