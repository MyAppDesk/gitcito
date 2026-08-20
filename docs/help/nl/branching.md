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
Welke secties en mappen je open of dicht laat staan wordt per repository
onthouden, ook na een herstart.

![De zijbalk, met vastgezette branches bovenaan](../../screenshots/pinned-branches.webp)

## Branches

Aanmaken, uitchecken, hernoemen en verwijderen — lokaal en remote. Branchrijen
tonen:

- **↑voor / ↓achter** ten opzichte van hun upstream,
- **aanwezigheidsbadges per remote** (welke remotes deze branch hebben),
- een **risicostip** na een scan van de [conflictradar](conflict-radar.md),
- een **⟳-markering** wanneer de remote [de geschiedenis herschreef](range-diff.md).

Branches met een `/` in hun naam vouwen zich automatisch in inklapbare mappen.
Rechtsklik op een mapkop om op de hele groep te werken: *Alle branches onder
`feature` verwijderen (4 branches)* verwijdert alles erin na één bevestiging
die precies opsomt welke branches verdwijnen — de branch waarop je staat blijft
buiten schot. Hetzelfde menu bestaat op mappen met remote branches; daar wordt
van de remote verwijderd.

De branch-dropdown in de werkbalk toont lokale en remote branches. Klik met
de rechtermuisknop op een branch in die dropdown om een lokale branch te
hernoemen, de naam te kopiëren, hem in een nieuwe worktree uit te checken,
hem in de actieve branch te mergen of hem te verwijderen. Remote branches
bieden geen hernoemen en worden na bevestiging van hun remote verwijderd.
Gitcito laat de merge weg wanneer de geselecteerde referentie al in de
actieve branch zit, en schakelt het aanmaken van een worktree uit wanneer
die branch al is uitgecheckt.

![Acties voor een lokale branch in de werkbalk-dropdown](../../screenshots/branch-dropdown-local-context-menu.webp)

![Acties voor een remote branch in de werkbalk-dropdown](../../screenshots/branch-dropdown-remote-context-menu.webp)

Rijen zijn meervoudig te selecteren zoals bestanden: <kbd>⌘/Ctrl</kbd>-klik
schakelt een rij om, <kbd>Shift</kbd>-klik selecteert een bereik, en
<kbd>Shift</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> breidt de selectie uit vanaf de
laatst aangeklikte rij. Rechtsklik op de selectie voor het bulkmenu — *4
branches verwijderen* — dat bevestigt met de volledige lijst. Dezelfde gebaren
werken op remote branches, tags en stashes.

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

### Als je lokale branch achterloopt

Die wordt tijdens het uitchecken doorgeschoven (fast-forward) naar de
remote-tip. Een vuile working tree gaat eerst in een benoemde stash en wordt
daarna teruggezet, zodat lokale wijzigingen de update niet afbreken.

### Als je lokale branch voorloopt

Loopt de lokale branch voor en heeft de remote niets nieuws, dan zou uitchecken
een verzoek om de *remote* branch beantwoorden met je eigen ongepushte werk — er
wordt dus niets uitgecheckt tot jij zegt welke kant je bedoelde:

| Keuze | Wat er gebeurt |
|-------|----------------|
| Lokale uitchecken | Schakelt naar de lokale branch, commits intact. Wat elke andere client stilzwijgend doet. |
| Terugzetten (soft) | Zet de branch terug op de remote-tip; de wijzigingen van die commits blijven **staged**, klaar om opnieuw te committen. |
| Terugzetten (mixed) | Dezelfde verplaatsing, wijzigingen blijven **unstaged** in de working tree. |
| Terugzetten (hard) | Gooit de commits *en* hun wijzigingen weg. |

![Het dialoogvenster voor een voorlopende branch: lokale uitchecken, of reset soft, mixed of hard](../../screenshots/ahead-checkout.webp)

Laat *Eerst een back-upbranch maken* aangevinkt en de lokale tip wordt vóór elke
verplaatsing bewaard als `backup/<branch>-<tijdstempel>`, zodat zelfs een hard
reset één checkout van ongedaan maken verwijderd is. De reset komt ook in de
undo-stack (⌘Z), maar alleen tot je de repository sluit — de back-upbranch blijft.

**Grenzen:** het dialoogvenster vergelijkt de branch alleen met de zojuist
opgehaalde tracking-ref, dus een remote die de fetch weigerde (offline, verkeerde
inloggegevens) wordt vergeleken met de laatst bekende tip. Het zegt niets over de
*kwaliteit* van je commits — alleen dat ze hier bestaan en daar niet.

**Zie ook:** [Mergen & rebasen](merging.md) · [Worktrees](worktrees.md)
