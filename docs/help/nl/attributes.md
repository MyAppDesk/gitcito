---
title: Bestandsattributen
category: Werkomgeving & tools
order: 96
summary: .gitattributes met een UI — regeleindes, binaries, union-gemergede changelogs, export-ignore en leesbare diffs voor Word en PDF.
keywords: gitattributes attributen attributes diff driver textconv merge union binair binary export-ignore eol crlf lf text auto filter clean smudge lfs linguist check-attr regeleindes
---

# Bestandsattributen

`.gitattributes` is het waardevolste bestand in git dat vrijwel niemand
schrijft. Het is de manier waarop een repository **git iets leert over zijn eigen
inhoud**: welke bestanden binair zijn, welke aan elkaar geplakt moeten worden in
plaats van te conflicteren, welke nooit meegaan in een archief, en welke
regeleindes iedereen krijgt.

Het belangrijke deel: het wordt gecommit. Een regel die jij toevoegt lost het
probleem op voor iedereen die kloont, op elk besturingssysteem, voorgoed — anders
dan een instelling in je eigen config, die het voor jou oplost en je collega's
het zelf laat ontdekken, op de harde manier.

`⌘K` → **Bestandsattributen**.

![De regels die een repository al meedraagt, de voorinstellingen, de padcontrole en de diff-drivers](../../screenshots/attributes.webp)

## Wat de regels doen

| Attribuut | Lost op |
|-----------|---------|
| `text=auto eol=lf` | Regeleindes die omslaan afhankelijk van wie het bestand uitcheckte |
| `binary` | Git die probeert een PSD, een DOCX of een gecompileerd asset te diffen of drieweg te mergen |
| `merge=union` | Een changelog waar iedereen aan toevoegt en waarop iedereen conflicteert |
| `-merge` | Bestanden waar een drieweg-merge onzin oplevert — lockfiles, gegenereerde code |
| `export-ignore` | CI-config en fixtures die meeliften in een release-tarball |
| `diff=<driver>` | Onleesbare diffs voor formaten die *wel* leesbaar zijn, mits er een converter is |
| `filter=lfs` | Grote bestanden opgeslagen via [LFS](lfs-sparse.md) |
| `linguist-vendored` | Meegeleverde code die in de taalstatistieken als de jouwe telt |

`binary` is een afkorting voor `-diff -merge -text`, oftewel drie antwoorden op
"stop met gissen over dit bestand" in één woord.

## Bewerken

De voorinstellingen vullen een patroon en de bijbehorende attributen in; pas het
patroon aan vóór je het toevoegt — `CHANGELOG.md` is een suggestie, geen uitspraak
over jouw project.

**Bewerkingen zijn chirurgisch.** Een regel toevoegen voor een patroon dat er al
één heeft herschrijft die regel waar hij staat, in plaats van er een tweede regel
achteraan te plakken die wint omdat hij later komt. Commentaar in het bestand
blijft ongemoeid, want het "waarom" naast een regel is meestal meer waard dan de
regel zelf.

Elke keer opslaan is een gewone Gitcito-actie: er verschijnt een melding, en
**Ongedaan maken** zet het bestand precies terug zoals het was.

**Een repository kan meerdere attributenbestanden hebben.** Eén in de root, één
in elke submap, en een privé `.git/info/attributes` dat nooit wordt gecommit en
alleen op jouw machine geldt — de juiste plek voor een regel die over jou gaat en
niet over het project. Gitcito toont ze alle en vertelt welke welke is.

## Wat geldt er voor een pad?

Regels komen uit meerdere bestanden, de specifiekste wint, en ze uitpluizen om
het antwoord te achterhalen is giswerk. **Wat geldt er voor een pad?** draait
`git check-attr` en laat zien wat git er zelf van maakt — het enige antwoord dat
telt.

## Diff-drivers: een Word-document leesbaar maken

Een `.docx` is een zip. Een `.pdf` is een gecomprimeerde objectgraaf. Git difft
ze als wat ze zijn — ruis — dus de geschiedenis van een document is onleesbaar
terwijl het document dat niet is.

Een **diff-driver** lost dit op met `textconv`: een commando dat het bestand
*alleen om te diffen* in tekst verandert. Het bestand in je werkboom blijft
ongemoeid; git vergelijkt gewoon de geconverteerde tekst.

Twee helften, en beide zijn nodig:

1. `diff.<name>.textconv` in de git-config — het converteercommando.
2. `*.docx diff=<name>` in `.gitattributes` — op welke bestanden het van
   toepassing is.

De knoppen hier doen allebei tegelijk. Voor Word, Excel en JSON **levert
Gitcito de converter zelf mee** — dezelfde documentanalyse die zijn
voorvertoningen gebruiken, beschikbaar als een klein `gitcito-textconv`-commando
in de app — dus die drie werken zonder iets te installeren. De rest heeft nog
steeds een echt hulpmiddel in je PATH nodig: Gitcito controleert dat en grijst
uit wat ontbreekt, in plaats van een driver te schrijven die bij de eerste diff
faalt.

| Driver | Vereist | Levert je op |
|--------|---------|--------------|
| `word` | niets — zit bij Gitcito | Prozadiffs van `.docx` |
| `excel` | niets — zit bij Gitcito | Rijdiffs (CSV per werkblad) van `.xlsx`/`.xls` |
| `json` | niets — zit bij Gitcito | Op sleutel gesorteerde, stabiele JSON-diffs |
| `pdf` | `pdftotext` (poppler) | Tekstdiffs van `.pdf` |
| `exif` | `exiftool` | Wat er aan een afbeelding veranderde, als de pixels ondoorzichtig zijn |

De grenzen van de meegeleverde converter, zonder omhaal: `.doc` (het oude
binaire Word-formaat) wordt niet begrepen, alleen `.docx`; PDF valt erbuiten —
Gitcito toont PDF's met de viewer van de browser en heeft geen tekstextractor
om te hergebruiken; en elke diff van een document betaalt een korte opstarttijd
van de converter. Met `git config diff.<name>.cachetextconv true` cachet git de
uitvoer per blob.

De converterhelft staat in **jouw** config, niet in de repository — git draait
geen commando's die een kloon je aanreikt, en dat is een beveiligingseigenschap
die het waard is om te behouden. De meegeleverde drivers wijzen bovendien naar
*jouw* Gitcito-installatiepad, dus een collega die kloont krijgt wel de
`diff=word`-regel en, tot die een eigen converter aansluit (Gitcito of iets
anders), de oude onleesbare diff. Zet dat in je README.

## Grenzen die je moet kennen

- **Clean/smudge-filters worden hier niet aangeboden.** `filter=<name>`-regels
  kun je met de hand schrijven, maar Gitcito stelt de commando's niet in: een
  filter draait bij elke checkout van elk overeenkomend bestand, en een verkeerd
  filter verminkt je werkboom in stilte.
- **`text=auto` verandert wat er gecommit wordt** en normaliseert regeleindes op
  de weg naar binnen. Voeg het in een bestaande repository bewust toe en draai
  daarna `git add --renormalize .`, in één eigen commit.
- **Attributen werken niet met terugwerkende kracht.** Een bestand vandaag als
  `binary` markeren verandert niets aan hoe zijn oude diffs zijn opgeslagen; het
  verandert hoe git het van nu af aan behandelt.
- **Regels gelden alleen waar het bestand zichtbaar is.** Een regel in
  `design/.gitattributes` zegt niets over `src/`.
- Gitcito schrijft hele bestanden weg, dus een met de hand opgemaakt bestand komt
  met zijn opmaak terug — maar een regel die Gitcito herschrijft krijgt de
  canonieke `pattern attr attr`-spatiëring van git.

Zie ook: [LFS & sparse checkout](lfs-sparse.md) ·
[Bundles & archieven](export.md) · [Merge-opties](merge-options.md) ·
[Hooks](hooks.md)
