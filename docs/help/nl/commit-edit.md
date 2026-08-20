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

Kies eender welke commit die een voorouder van `HEAD` is — lineaire
geschiedenis of niet. De modal toont zijn bestanden en bericht; bewerk een van
beide. Vanaf daar gebeuren twee dingen:

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

## Merges in het bereik

![Een commit bewerken onder twee merges — de cascade speelt ze opnieuw af](../../screenshots/commit-edit-merges.webp)

Een merge tussen de commit en `HEAD` schakelt bewerken niet langer uit. De
cascade speelt een merge opnieuw af door zijn **vastgelegde resultaat** — de
tree die de merge daadwerkelijk heeft gecommit, conflictoplossingen
inbegrepen — opnieuw toe te passen op de herschreven ouder, zodat oplossingen
die iemand met de hand maakte het herschrijven woordelijk overleven. Geen
rerere, geen opnieuw mergen, geen worktree: dezelfde in-memory plumbing als de
rest van de cascade, en beide ouderpointers blijven behouden. Een zijbranch
die de bewerkte commit ook bevat wordt herschreven en opnieuw gericht; een die
dat niet doet behoudt zijn identiteit onaangeroerd. De banner in de modal zegt
hoeveel merges het bereik bevat, en mergestappen tonen een merge-icoon in de
preview.

De eerlijke kanttekening: een opnieuw afgespeelde merge is maar zo goed als
zijn vastgelegde resultaat. Botst je bewerking met regels die de merge zelf
heeft opgelost, dan kleurt de preview rood, precies zoals elke andere
conflicterende stap — er wordt niets geraden.

## Als de cascade conflicteert

Een latere commit raakte dezelfde regels die jij aan het bewerken bent. De
preview markeert die commit rood met de conflicterende bestanden en het
herschrijven weigert te draaien — er wordt nooit iets half toegepast. Bewerk het
anders, of ga het conflict frontaal aan met een
[interactieve rebase](rebase.md).

## Beperkingen

- **De commit moet een voorouder van `HEAD` zijn.** Een commit op een
  niet-gemergde zijbranch heeft geen pad naar je huidige branch om opnieuw af
  te spelen.
- Binaire bestanden en bestanden groter dan 2 MB worden getoond maar zijn niet
  te bewerken.
- Een commit die al op een remote staat kan worden bewerkt, maar je volgende
  push moet dan een **force push** zijn — de modal waarschuwt voordat je je
  daaraan vastlegt.
- Verwijderde bestanden in de commit zijn niet te bewerken (er is geen inhoud om
  te bewerken).

**Zie ook:** [Interactieve rebase](rebase.md) · [Herstel & de reflog](recovery.md) · [Absorb](absorb.md)
