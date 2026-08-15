---
title: Timelapse
category: Repository & geschiedenis
order: 14
summary: Speel het hele leven van de repository af als animatie, en exporteer het.
keywords: timelapse video animatie geschiedenis afspelen replay gource export webm film jaaroverzicht
---

# Timelapse

Kijk hoe de repository groeit.

Elk bestand is een stip, geplaatst naar zijn map op het hoogste niveau: geboren
wanneer het wordt toegevoegd, pulserend wanneer een commit het aanraakt,
zwellend naarmate het keer op keer bewerkt wordt, vervagend wanneer het
verwijderd wordt. De datum, auteur, het onderwerp en de lopende tellers voor
commits, bestanden en auteurs staan erbovenop, met een voortgangsbalk onderlangs.

![De timelapse halverwege het afspelen](../../screenshots/timelapse.webp)

![Het hele leven van een repository, opnieuw afgespeeld](../../screenshots/clip-timelapse.webp)

## Bediening

- **Afspelen / pauzeren**, snelheden van **4× tot 32×**, en opnieuw beginnen.
- De schuifregelaar zoekt door **vanaf het begin opnieuw af te spelen**, dus
  terugschuiven landt op precies de juiste wereld en niet op een benadering
  ervan.

## Video exporteren

**Video exporteren** neemt het canvas van begin tot eind op en vraagt waar het
een `.webm` moet opslaan.

De opname gebeurt in de pagina zelf (`MediaRecorder`) — er is geen encoder om te
installeren, geen ffmpeg, en er wordt nergens iets geüpload. Er wordt niets naar
schijf geschreven tot jij een pad kiest.

> Een repository met echte vorm levert een betere film op dan een nette.
> Hernoemingen, verwijderingen en een map die plots explodeert zijn wat het het
> kijken waard maakt.

**Zie ook:** [Tijdmachine](time-machine.md) · [Inzichten](insights.md)
