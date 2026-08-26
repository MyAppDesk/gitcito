---
title: Aan de slag
category: Begin hier
order: 1
summary: Open een repository, lees de grafiek, maak je eerste commit.
keywords: intro eerste stappen openen klonen clone tabbladen tabs grafiek graph commit
---

# Aan de slag

Gitcito opent een map en toont je zijn geschiedenis. Er wordt niets naar je
repository geschreven tot je erom vraagt.

![Een net geopende repository, nog zonder commits](../../screenshots/empty-repo.webp)

## Een repository openen

- **Sleep een map** op het venster, of gebruik **Repository openen** op het
  welkomstscherm.
- **Kloon** er een vanaf een URL of rechtstreeks bij je host — zie
  [klonen](cloning.md) voor de opties die een enorme repository snel kloonbaar
  maken.
- Vanuit een terminal opent `gitcito .` de huidige map in de draaiende app — zie
  [de commandoregel](cli.md).
- Een map die nog geen Git-repository is opent evengoed, en biedt aan hem te
  initialiseren.

## De drie panelen

| Paneel | Wat erin zit |
|---|---|
| Links | Branches, remotes, tags, stashes, worktrees — en het tabblad **Bestanden** voor de werkboom |
| Midden | De commitgrafiek, en wat je daaruit selecteert |
| Rechts | De commitopsteller, of de details van de geselecteerde commit |

## De rest vinden

Twee routes, en ze leiden naar dezelfde plekken:

- **`⌘K`** (`Ctrl+K`) — het commandopalet. Typ wat je wilt; het springt ook naar
  branches, commits en bestanden.
- **Tools** in de werkbalk — dezelfde repositorygebonden verzameling als menu,
  met de lange staart opgevouwen in groepen zodat het leesbaar blijft.

![Het Tools-menu: de veelgebruikte tools eerst, de rest gegroepeerd](../../screenshots/tools-menu.webp)

Wordt het venster smal, dan vecht de actiebalk niet langer om ruimte: knoppen die niet meer passen vouwen samen in een menu **Meer** aan het eind, in de volgorde van de balk en met hun submenu’s. Maak het venster breder en ze komen terug.

Alles wat via de een bereikbaar is, is via de ander bereikbaar, dus er is niets
dat alleen ingewijden kunnen vinden.

## Je eerste commit

1. Bewerk een bestand. Het verschijnt onder **Niet gestaged**.
2. Stage het — het hele bestand, een hunk, of [losse regels](staging.md).
3. Schrijf een boodschap en druk op **Committen**.

Al het andere in Gitcito is optioneel.

