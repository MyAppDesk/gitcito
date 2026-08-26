---
title: TODO's in de code
category: Workspace-gereedschap
order: 93
summary: Elke TODO, FIXME en HACK die de broncode meedraagt, gegroepeerd op label, op eigenaar of op map.
keywords: todo fixme hack xxx note markering markeringen commentaar opmerkingen boom label eigenaar toegewezen cgm schuld technische grep scan
---

# TODO's in de code

Een TODO is een belofte die iemand aan zichzelf deed en daarna kwijtraakte. Hij
staat waar het probleem zit, dus precies waar niemand nog eens kijkt, en tegen de
tijd dat het ertoe doet zit de schrijver in een ander team. Grep vindt ze, en
duizend regels grep-uitvoer staat gelijk aan ze niet vinden.

Het tabblad **TODOs** van het analysepaneel leest ze allemaal en doet dan wat
grep niet kan: groeperen. Open het paneel via de statusbalk of het
opdrachtenpalet (`TODO-markeringen in de code`) en ga naar het tweede tabblad.

De statusbalk telt de markeringen naast de fouten en waarschuwingen van de
analyse; klikken op die teller opent dit tabblad.

![Het tabblad TODOs, gegroepeerd op eigenaar](../../screenshots/code-todos.webp)

## Wat als markering telt

Een label, in commentaar, in een bestand dat Git volgt of zou volgen:

| Geschreven | Gelezen als |
|------------|-------------|
| `// TODO: uitleveren` | label `TODO`, geen eigenaar |
| `//todo uitleveren` | hetzelfde — de dubbele punt en de spatie zijn optioneel |
| `# todo uitleveren` | hetzelfde — hoofdletters noch taal doen ertoe |
| `/* TODO(cgm): uitleveren */` | label `TODO`, eigenaar `cgm` |
| `-- TODO (CGM) uitleveren` | dezelfde eigenaar: `cgm`, `(CGM)` en `[cgm]` zijn één persoon |
| `<!-- TODO: @cgm uitleveren -->` | opnieuw hetzelfde |

De labels zijn `TODO`, `FIXME`, `BUG`, `HACK`, `XXX`, `NOTE`, `OPTIMIZE`,
`REVIEW`, `REFACTOR`, `DEPRECATED`, `QUESTION`, `IDEA`, `WIP` en `TEMP`. De
eerste vier krijgen kleur, want "dit is stuk" en "dit was een inval" horen er in
een lijst niet hetzelfde uit te zien.

Het label moet achter een commentaarteken staan — `//`, `#`, `--`, `;`, `%`,
`/*`, `*`, `<!--`, `"""`. Meer telt niet: `todo = [l for l in lines]` is code, en
een paneel dat een variabeletoewijzing als schuld opvoert, is een paneel dat je
geen tweede keer gelooft. Dezelfde regel houdt een functie genaamd `reviewNotes`
uit de lijst.

## Groeperen is de functie

Vier assen, elk één klik:

| Groeperen op | Beantwoordt |
|--------------|-------------|
| **Label** | Wat voor schuld draagt deze repository? |
| **Eigenaar** | Wat liet ieder achter — en wat ligt er op de niet-toegewezen stapel? |
| **Map** | Welke hoek van de boom staat te rotten? |
| **Bestand** | De gewone lijst, als je al weet waar je heen gaat. |

**Niet toegewezen** is een echte groep, geen restpost: markeringen waar niemand
zijn naam bij zette zijn de markeringen die nooit worden opgepakt, en ze geteld
zien is precies de bedoeling.

De labelchips bovenaan filteren de lijst; klikken op de eigenaarsbadge in een rij
ook, net als het zoekveld, dat op bericht, bestand, label en eigenaar matcht.
**Alleen gewijzigd** beperkt tot bestanden die je hebt bewerkt maar nog niet
gecommit — de laatste controle vóór een push, wanneer een `// FIXME` van een uur
geleden op het punt staat permanent te worden.

Een rij aanklikken opent het bestand op die regel.

## Wat het niet doet

- **Het leest, het schrijft nooit.** Er is geen "afvinken": een TODO sluit je
  door de regel te verwijderen en dat te committen. Voor een lijst die Gitcito
  voor je bijhoudt, zie [todos](todos.md) — iets heel anders: privénotities die
  in de app leven, niet in de broncode.
- **Genegeerde bestanden worden overgeslagen**, samen met `node_modules`, wat de
  labels daarbinnen ook zeggen. Niet-gevolgde bestanden tellen wel mee: een
  markering van vijf minuten geleden is de meest de moeite waard.
- **Het kan commentaar niet van een string onderscheiden.** Een regel
  `const banner = "// TODO"` is voor de scan een markering. Het heeft geen parser
  voor veertig talen en doet ook niet alsof.
- **De scan is een momentopname.** Bewerk je een bestand, dan houdt het paneel de
  getallen die het had tot je opnieuw scant; de verversknop is het hele verhaal.
- **Het stopt bij 5.000 markeringen.** Een repository daarboven heeft een
  schuldprobleem dat geen paneel oplost.

## Waar het draait

Eén `git grep` over de werkmap, en daarom duurt het milliseconden waar het
tabblad [Problemen](problems.md) seconden kost: er wordt niets gecompileerd, er
komt geen toolchain aan te pas, en de zoekactie slaat binaire en genegeerde paden
over omdat Git allang weet welke dat zijn.
