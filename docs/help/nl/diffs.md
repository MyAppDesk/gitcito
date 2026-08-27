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
| **Gekoppeld** (gesplitst, zonder terugloop) | Scrolt beide helften samen, verticaal en zijwaarts — uit scrolt elke kolom apart |
| <kbd>⌘F</kbd> | Zoeken binnen de diff, met stappen naar volgende/vorige |

Terugloop staat standaard uit: één regel blijft één rij, zodat beide kanten rij
voor rij vergelijkbaar blijven, en elke helft horizontaal scrolt met een eigen
balk. Zet het aan als je een lange regel liever leest dan achtervolgt — de prijs
is dat een regel die over drie rijen terugloopt niet meer tegenover zijn
tegenhanger staat. Elke schakelaar onthoudt zijn stand over bestanden en
sessies heen.

Zonder terugloop scrollen de twee helften standaard **gekoppeld** — verticaal,
wat de rijen tegenover elkaar houdt, en zijwaarts, zodat kolom 90 links boven
kolom 90 rechts staat. Ontkoppel ze wanneer de kanten uit elkaar zijn gelopen —
een ingesprongen blok tegenover een niet ingesprongen blok, een hernoeming die
elke regel verschoof — of wanneer je twee ver uiteenliggende delen van
hetzelfde bestand wilt vergelijken, en parkeer elke helft waar haar eigen
inhoud staat.

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

### Apple property lists

`Info.plist` en `*.entitlements` zijn XML, en XML is niet wat iemand probeert te
lezen. De preview toont in plaats daarvan het sleutel/waarde-overzicht — de vorm
die Xcode's eigen plist-editor laat zien — met de nesting intact en het type van
elke waarde ernaast.

![Een Info.plist als sleutel/waarde-overzicht](../../screenshots/preview-plist.webp)

Twee grenzen. Een **binaire** plist (`bplist00`) wordt herkend en benoemd, niet
gedecodeerd — haal hem door `plutil -convert xml1` als je hem hier wilt, al is
een binaire plist in een repository meestal een build-artefact dat er niet in
hoort. En `<data>`-waarden verschijnen als een aantal bytes in plaats van als
base64: een blob zegt jou niets, en een provisioning profile weergegeven in een
paneel dat je misschien deelt zegt iedereen anders veel te veel.

### Xcode-projecten

Een `project.pbxproj` is één platte woordenlijst van objecten die naar elkaar
verwijzen met een id, dus hem op volgorde lezen zegt bijna niets over het
project. De preview volgt die verwijzingen en bouwt de drie dingen terug waarvoor
je kwam: de **targets** met hun buildfasen, de **groepenboom** zoals de
Xcode-navigator hem tekent, en de **buildinstellingen** per configuratie.

![Een project.pbxproj als targets, bestandsboom en instellingen](../../screenshots/preview-xcodeproj.webp)

Het leest, het bewerkt niet — niets hiervan schrijft naar het project. Wat er
gebeurt als twee branches er allebei aan zitten, staat bij
[conflicten oplossen](conflicts.md).

## Zeer grote bestanden

Voorbeelden en de bestandsweergave laden een bestand volledig in het geheugen,
dus beide weigeren bestanden boven een groottelimiet (32 MB voor voorbeelden,
16 MB voor tekst) en tonen in plaats daarvan hoe groot het bestand is. **Toch
laden** heft de limiet voor dat ene bestand op — niets is onbereikbaar, grote
ladingen zijn alleen opt-in. Bestanden en diffs van meer dan een paar duizend
regels worden nog steeds volledig gerenderd, maar regels buiten beeld worden
niet meer opgemaakt en getekend, zodat een gigantische lockfile-diff niet
langer het geheugen van een hele laptop kost.

![Een bestand boven de groottelimiet, met Toch laden](../../screenshots/file-too-large.webp)

## Het tabblad Bestanden

Het tabblad **Bestanden** in de linkerzijbalk bladert door de werkboom zelf, met
statusbadges op mappen (toegevoegd / gewijzigd / verwijderd) die samenvatten wat
erin zit.

![Het tabblad bestanden met een voorbeeld](../../screenshots/file-tree.webp)

![Mapbadges die optellen wat er binnenin veranderde](../../screenshots/tree-badges.webp)

**Zie ook:** [Semantische diff](semantic-diff.md) · [Stagen](staging.md)
