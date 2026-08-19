---
title: Elke commit bewerken
category: Branches & ingrepen
order: 46
summary: Herschrijf de bestanden of het bericht van een historische commit ter plekke — met de cascade eerst als preview.
keywords: commit bewerken edit herschrijven rewrite geschiedenis history amend verleden reword typfout typo fix cascade replay rebase ter plekke ingreep surgery
---

# Elke commit bewerken

De typfout zit in een commit van drie weken geleden. De gebruikelijke oplossing is
een interactieve rebase: stoppen bij de commit, bewerken, doorgaan, bidden. De
oplossing van Gitcito: rechtsklik op de commit, **Deze commit bewerken**, pas de
tekst aan, klaar. De penknop in het paneel met commitdetails opent dezelfde
editor.

![Een historische commit bewerken](../../screenshots/commit-edit.webp)

## Wat het doet

Kies eender welke commit op een lineair pad naar `HEAD`. De modal toont zijn
bestanden en bericht; bewerk een van beide. Vanaf daar gebeuren twee dingen:

1. **Preview van de cascade** speelt elke commit boven de bewerkte *in het
   geheugen* opnieuw af (een keten van `merge-tree`-cherry-picks — geen checkout,
   geen working tree, geen refs). Elke afstammeling kleurt groen of rood, zodat
   je **voordat er iets beweegt** weet of de bewerking schoon doorwerkt of botst
   met een latere wijziging.
2. **Geschiedenis herschrijven** doet het echt: dezelfde keten wordt met plumbing
   opgebouwd, daarna verplaatst de branch met `reset --keep` — je niet-gecommitte
   wijzigingen gaan mee, of de reset breekt af en er is niets gebeurd. Eerst
   wordt een [bewakingsmomentopname](recovery.md) gemaakt, en ongedaan maken
   herstelt de oude keten.

Auteurschap en datums van elke opnieuw afgespeelde commit blijven behouden;
alleen de hashes veranderen — dat is wat geschiedenis herschrijven betekent.

## Als de cascade conflicteert

Een latere commit raakte dezelfde regels die jij aan het bewerken bent. De
preview markeert die commit rood met de conflicterende bestanden en het
herschrijven weigert te draaien — er wordt nooit iets half toegepast. Bewerk het
anders, of ga het conflict frontaal aan met een
[interactieve rebase](rebase.md).

## Beperkingen

- **Alleen lineaire geschiedenis.** Een merge tussen de commit en `HEAD`
  schakelt bewerken uit — merges opnieuw afspelen is een ander, moeilijker
  probleem.
- Binaire bestanden en bestanden groter dan 2 MB worden getoond maar zijn niet
  te bewerken.
- Een commit die al op een remote staat kan worden bewerkt, maar je volgende
  push moet dan een **force push** zijn — de modal waarschuwt voordat je je
  daaraan vastlegt.
- Verwijderde bestanden in de commit zijn niet te bewerken (er is geen inhoud om
  te bewerken).

**Zie ook:** [Interactieve rebase](rebase.md) · [Herstel & de reflog](recovery.md) · [Absorb](absorb.md)
