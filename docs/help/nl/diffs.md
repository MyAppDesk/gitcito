---
title: Diffs & voorbeelden
category: Wijzigingen lezen
order: 20
summary: Gesplitste weergave, markering op woordniveau, beelddiffs en bestandsvoorbeelden.
keywords: diff split side-by-side gesplitst woordniveau word level witruimte whitespace beelddiff image diff preview voorbeeld markdown docx pdf
---

# Diffs & voorbeelden

## Een diff lezen

| Schakelaar | Wat het doet |
|---|---|
| **Unified ↔ split** | Naast elkaar als je wilt vergelijken, gestapeld als je wilt lezen |
| **Woordniveau** | Markeert alleen de gewijzigde tokens binnen een bewerkte regel — rood op de oude, groen op de nieuwe |
| **Witruimte negeren** | Verbergt herinspringen zodat de echte wijziging bovendrijft |
| **Terugloop** (alleen gesplitste weergave) | Laat lange regels teruglopen binnen hun kolom in plaats van te scrollen |
| **Gekoppeld** (gesplitst, zonder terugloop) | Scrolt beide helften zijwaarts samen — uit scrollt elke kolom apart |
| <kbd>⌘F</kbd> | Zoeken binnen de diff, met stappen naar volgende/vorige |

Terugloop staat standaard uit: één regel blijft één rij, zodat beide kanten rij
voor rij vergelijkbaar blijven, en elke helft horizontaal scrolt met een eigen
balk. Zet het aan als je een lange regel liever leest dan achtervolgt — de prijs
is dat een regel die over drie rijen terugloopt niet meer tegenover zijn
tegenhanger staat. Elke schakelaar onthoudt zijn stand over bestanden en
sessies heen.

Zonder terugloop scrollen beide helften standaard **gekoppeld** zijwaarts, zodat
kolom 90 links boven kolom 90 rechts staat. Ontkoppel ze wanneer de kanten uit
elkaar zijn gelopen — een ingesprongen blok tegenover een niet ingesprongen
blok, een hernoeming die elke regel verschoof — en je elke helft wilt parkeren
waar haar eigen inhoud staat. Het verticaal scrollen blijft in beide gevallen
gedeeld; dat houdt de rijen tegenover elkaar.

![Gesplitste diff met markering op woordniveau](../../screenshots/split-diff.webp)

Boven elke diff staat de [semantische samenvatting](semantic-diff.md) — wat er
veranderde, symbool voor symbool, in plaats van regel voor regel.

## Beelddiffs

Gewijzigde afbeeldingen krijgen een echte vergelijking: naast elkaar, of een
sleepgreep om tussen voor en na te schuiven.

![Beelddiff](../../screenshots/image-diff.webp)

## Bekijk alles

De modus **Voorbeeld** rendert het bestand in plaats van de broncode te tonen:
Markdown, Word (`.docx`), Excel (`.xlsx`), PDF, video, audio, afbeeldingen, en
code met syntaxkleuring voor al het overige.

![Markdown-voorbeeld](../../screenshots/markdown-preview.webp)

## Het tabblad Bestanden

Het tabblad **Bestanden** in de linkerzijbalk bladert door de werkboom zelf, met
statusbadges op mappen (toegevoegd / gewijzigd / verwijderd) die samenvatten wat
erin zit.

![Het tabblad bestanden met een voorbeeld](../../screenshots/file-tree.webp)

![Mapbadges die optellen wat er binnenin veranderde](../../screenshots/tree-badges.webp)

**Zie ook:** [Semantische diff](semantic-diff.md) · [Stagen](staging.md)
