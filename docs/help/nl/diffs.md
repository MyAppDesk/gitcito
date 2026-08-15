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
| <kbd>⌘F</kbd> | Zoeken binnen de diff, met stappen naar volgende/vorige |

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
