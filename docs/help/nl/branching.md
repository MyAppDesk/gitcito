---
title: Branches, remotes & de zijbalk
category: Branches & ingrepen
order: 40
summary: Alles wat de linkerzijbalk doet, en vastgezette branches.
keywords: branch branches aanmaken checkout hernoemen verwijderen remote pinned vastgezet zijbalk sidebar presence
---

# Branches, remotes & de zijbalk

Eén herschikbare, doorzoekbare zijbalk bevat **branches, remotes, tags, stashes,
worktrees en submodules**. Elke sectie kan verborgen of verplaatst worden
(Instellingen → Indeling), en het filterveld werkt op alle secties tegelijk.

![De zijbalk, met vastgezette branches bovenaan](../../screenshots/pinned-branches.webp)

## Branches

Aanmaken, uitchecken, hernoemen en verwijderen — lokaal en remote. Branchrijen
tonen:

- **↑voor / ↓achter** ten opzichte van hun upstream,
- **aanwezigheidsbadges per remote** (welke remotes deze branch hebben),
- een **risicostip** na een scan van de [conflictradar](conflict-radar.md),
- een **⟳-markering** wanneer de remote [de geschiedenis herschreef](range-diff.md).

Branches met een `/` in hun naam vouwen zich automatisch in inklapbare mappen.

![Branchnamen met schuine strepen, opgevouwen tot een boom](../../screenshots/branch-grouping.webp)

## Vastgezette branches

Geef de branches waar je steeds naar terugkeert een ster — zweef over de rij en
klik op ★, of rechtsklik → *Branch vastzetten*. Ze komen bovenaan de sectie
Lokaal in een groep **Vastgezet** te staan, onthouden per repository, terwijl ze
op hun gewone plek eronder blijven staan.

## Een remote branch uitchecken

Dubbelklik een remote branch om de lokale branch aan te maken die hem volgt.
Bestaat er al een lokale branch met die naam en is die **uiteengelopen**, dan
vraagt Gitcito hoe je wilt verzoenen — rebasen, mergen of resetten — en biedt
het aan de branch eerst te back-uppen.

![De vraag bij een uiteengelopen branch: rebasen, mergen of resetten, met een back-upoptie](../../screenshots/diverged-checkout.webp)

**Zie ook:** [Mergen & rebasen](merging.md) · [Worktrees](worktrees.md)
