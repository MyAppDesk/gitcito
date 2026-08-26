---
title: Bladwijzers
category: Workspace-gereedschap
order: 94
summary: Onthouden plekken in de code die overleven als het bestand eronder verandert.
keywords: bladwijzer bladwijzers markeren regel notitie plek code navigatie zijbalk verplaatst verdwenen fragment
---

# Bladwijzers

Een plek waar je terug wilt komen: de regel waar de bug woont, de functie die je
half aan het hernoemen bent, het ding dat weg moet zodra de refactor landt.
Rechtsklik op een regel in de bestandsweergave en kies **Bladwijzer op deze
regel**; hij verschijnt in de zijbalk, en een klik brengt je terug.

![Bladwijzers in de zijbalk](../../screenshots/bookmarks.webp)

Bladwijzers zijn privé voor deze machine en deze repository. Er wordt niets in de
repo geschreven: niet te committen, niet te pushen, door niemand anders te zien —
net als [todo's](todos.md).

## De regel schuift op. Dat is het hele probleem.

`cart.ts:42` verrot op het moment dat iemand er een regel boven invoegt, en een
bladwijzer die stilletjes de verkeerde regel opent is erger dan geen bladwijzer.
Daarom wordt de **tekst** van de regel naast het nummer bewaard, en zoekt openen
opnieuw:

1. de onthouden regel, als die de tekst nog draagt;
2. anders de dichtstbijzijnde regel met dezelfde tekst — de dichtstbijzijnde,
   zodat een door het bestand herhaalde regel bij de kopie uitkomt die het
   dichtst bij de oude plek ligt;
3. anders de dichtstbijzijnde regel die matcht zonder op witruimte te letten, wat
   een herindent overleeft;
4. anders zegt hij dat **de regel weg is** en opent waar die stond, in plaats van
   te gokken.

Verschuift hij, dan geneest de bladwijzer zichzelf: het nieuwe regelnummer wordt
bewaard, zodat de volgende keer daarvandaan begint. Een **notitie** voeg je toe
via het contextmenu — zonder notitie is de regeltekst zelf het label.

## De grenzen

- **Een bladwijzer wijst naar de werkmap**, niet naar een commit. Hij volgt je
  bewerkingen; hij reist niet terug door de historie.
- **Een herschreven bestand verliest zijn bladwijzers.** Staat noch de exacte
  tekst noch de witruimte-genormaliseerde vorm binnen een paar honderd regels,
  dan blijft er niets eerlijks over om naar te wijzen.
- **Een bestand hernoemen breekt zijn bladwijzers.** Het pad is de sleutel; git
  ziet een rename in een diff, maar een bladwijzer maakt geen deel uit van een
  diff.
- **Een lege regel heeft geen tekst om terug te vinden**; die bladwijzer hangt
  alleen aan het nummer.

**Zie ook:** [Todo's](todos.md) · [Problemen](problems.md)
