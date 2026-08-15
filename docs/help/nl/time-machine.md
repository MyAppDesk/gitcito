---
title: Tijdmachine
category: Repository & geschiedenis
order: 13
summary: Sleep een schuifregelaar en zie de repository zelf veranderen, commit voor commit.
keywords: tijdmachine time machine schuiven scrub geschiedenis schuifregelaar slider verleden boom bladeren terugspoelen oude versie
---

# Tijdmachine

Een oude commit lezen betekent meestal hem uitchecken, en dat betekent stashen
waar je mee bezig was. Dit niet.

Sleep de schuifregelaar en de **bestandsboom wordt per commit opnieuw
opgebouwd**: mappen verschijnen, bestanden verhuizen ertussen, verwijderde
bestanden komen terug. Kies een bestand en je leest het zoals het bij die commit
was.

Alles wordt uit de objectdatabase gelezen (`git ls-tree`, `git show`). **Geen
checkout, HEAD verzet zich nooit, je niet-gecommitte werk blijft onaangeroerd** —
je kunt midden in een wijziging door een jaar geschiedenis schuiven.

![De boom zoals hij bij een eerdere commit stond, met een bestand ernaast open](../../screenshots/time-machine.webp)

![Schuiven met de regelaar: de boom bouwt zichzelf commit voor commit opnieuw op](../../screenshots/clip-time-machine.webp)

## Bediening

| Toets | Actie |
|---|---|
| <kbd>←</kbd> <kbd>→</kbd> | Eén commit |
| <kbd>⇧</kbd> + <kbd>←</kbd> <kbd>→</kbd> | Tien commits |
| <kbd>Home</kbd> / <kbd>End</kbd> | Oudste / nieuwste |

De pijltjes aan weerszijden van de schuifregelaar doen hetzelfde. Bestanden die
de huidige commit aanraakte zijn in de boom gemarkeerd, met een aantal in de kop.

## De selectie overleeft de tijd

Kies een bestand en schuif terug tot voorbij de commit die het aanmaakte: het
paneel zegt dat het hier niet bestaat, en **houdt je selectie vast**. Schuif
vooruit en het bestand komt terug met zijn oude inhoud. Dat is het hele punt —
je verplaatst de repository, niet je cursor.

**Deze versie openen** geeft het bestand door aan de gewone bestandsweergave bij
die commit.

**Zie ook:** [Timelapse](timelapse.md) · [Blame & geschiedenis](blame.md)
