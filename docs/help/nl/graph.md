---
title: De commitgrafiek
category: Repository & geschiedenis
order: 10
summary: Geschiedenis lezen: banen, refs, kolommen, filters en meervoudige selectie.
keywords: grafiek graph geschiedenis history commits banen lanes branches merges kolommen filter lineair first-parent
---

# De commitgrafiek

Branches, merges en octopus-merges netjes getekend, licht of donker. Het renderen
gebeurt in een venster, dus een repository met honderdduizend commits scrollt als
een met honderd.

| | |
|---|---|
| ![Commitgrafiek, licht](../../screenshots/graph-light.webp) | ![Commitgrafiek, donker](../../screenshots/graph-dark.webp) |

## Rondbewegen

- <kbd>↑</kbd> <kbd>↓</kbd> (of <kbd>j</kbd> <kbd>k</kbd>) verplaatsen de selectie.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd>-klik zet een commit aan of uit in een
  **meervoudige selectie**; <kbd>⇧</kbd>-klik pakt een reeks. Met meerdere
  geselecteerd rechtsklik je om ze op de huidige branch te cherry-picken, een
  aaneengesloten reeks te squashen, één gecombineerde patch te exporteren of hun
  SHA's te kopiëren.
- Commits die bij je **laatste fetch of pull** binnenkwamen zijn gemarkeerd als
  nieuw.

## Het laten tonen wat jij wilt

- **Lineaire weergave** (first-parent) verbergt alles wat ingemerged is en laat
  de stam over.
- **Filteren op pad**: rechtsklik een bestand of map → *Grafiek filteren op dit
  pad*, en alleen de commits die het aanraakten blijven verlicht.

![Grafiek teruggefilterd tot één pad](../../screenshots/graph-path-filter.webp)

- **Kolommen**: toon, verberg, herschaal en herschik de kolommen voor branch,
  boodschap, auteur, datum, SHA, handtekening en deployment.
- **Stijl**: Instellingen → Thema's → **Grafiek** — baanpalet (8 ingebouwde,
  eigen, of door AI gegenereerd), hoekstijl, rijdichtheid en lijndikte, met een
  live minigrafiek als voorbeeld.

![Grafiekstijlinstellingen met live voorbeeld](../../screenshots/settings-graph.webp)

## Commitdetails

Een commit selecteren toont zijn gewijzigde bestanden (boom of plat), auteur,
SHA, co-auteurs en zijn handtekening. `#123`-verwijzingen en `@vermeldingen`
worden automatisch gelinkt naar je host.

![Door de commitdetails lopen](../../screenshots/clip-commit-details.webp)

**Zie ook:** [Blame & bestandsgeschiedenis](blame.md) · [Zoeken](search.md) · [Tijdmachine](time-machine.md)
