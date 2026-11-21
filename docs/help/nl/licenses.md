---
title: Opensourcelicenties
category: Naar eigen smaak
order: 104
summary: Lees de licentie van elk pakket van derden dat deze build van Gitcito meelevert.
keywords: licenties licenses naamsvermelding kennisgevingen open source MIT Apache BSD derden afhankelijkheden credits over
---

# Opensourcelicenties

Gitcito is gebouwd op ruim negentig opensourcepakketten, en bijna allemaal vragen
ze hetzelfde terug: dat hun kennisgeving met het programma meereist. MIT, BSD en
Apache zeggen dat in hun eigen tekst. Deze pagina is waar die kennisgeving staat,
zodat de app de verplichting nakomt en niet een bestand dat iemand moet
onthouden te kopiëren.

Het is ook het eerlijke antwoord op „wat draait er eigenlijk op mijn machine”.

## Openen

Klik op het **versienummer** in de statusbalk — dat opent **Nieuw** — en dan op
**Licenties** in de kop daarvan. Of open het opdrachtenpalet en zoek
*Opensourcelicenties*. Het opent in een eigen tabblad, net als Nieuw.

![Het tabblad met licenties](../../screenshots/licenses.webp)

| Kolom | Wat het is |
|-------|------------|
| Naam | Het pakket zoals het op npm gepubliceerd is |
| Versie | De exacte versie die deze build gebruikt |
| Label | De SPDX-aanduiding uit het manifest van het pakket |

Selecteer een rij om de volledige licentietekst te lezen die het pakket
meelevert. Het linkpictogram opent de projectpagina in je browser. Het filter
zoekt in de pakketnaam en de licentie-aanduiding, dus `Apache` typen beperkt de
lijst tot pakketten met een Apache-licentie.

## Wat ze dekt, en wat niet

De lijst wordt bij het bouwen gemaakt uit de **productie-afhankelijkheidsboom** —
alles wat in de verpakte app terechtkomt, inclusief transitieve afhankelijkheden
waar je nooit direct om vroeg — plus Electron zelf. Bouwgereedschap dat nooit
meegeleverd wordt, blijft bewust weg.

Twee grenzen om te kennen:

- **Een handvol pakketten levert geen licentiebestand.** Ze noemen een aanduiding
  in hun manifest en verder niets. Die rijen zeggen dat, in plaats van een tekst
  te verzinnen — een licentie die je niet kunt lezen, is er geen waar je op kunt
  vertrouwen.
- **De aanduiding is wat het pakket beweert.** Gitcito toont haar; het controleert
  haar niet. Klopt het manifest van een pakket niet, dan klopt deze pagina ook
  niet.

De eigen licentie van Gitcito is MIT, en het label rechtsboven opent haar op
GitHub.

**Zie ook:** [Talen & rechts-naar-links](languages.md) · [Thema's & uiterlijk](themes.md)
