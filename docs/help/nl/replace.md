---
title: Replace & graft
category: Repository & geschiedenis
order: 17
summary: Kort de geschiedenis van een kloon in zonder haar te herschrijven — git replace, grafts, en hoe je de geschiedenis terugzet.
keywords: replace git replace graft refs/replace shallow inkorten geschiedenis archief parents herschrijven filter-branch alternatief kleinere kloon useReplaceRefs no-replace-objects
---

# Replace & graft

`git replace` zegt tegen git: *waar je ook object A wilde lezen, lees in plaats
daarvan B*. Er wordt niets herschreven. Geen enkele sha verandert. Elke commit
blijft precies waar hij was — git kijkt onderweg alleen ergens anders.

Dat klinkt als een curiositeit tot je een kleinere kloon wilt. Dan is het het
eerlijke alternatief voor een herschrijving van de geschiedenis: **graft een
commit op geen enkele ouder** en alles daarvoor valt weg uit de log, de grafiek
en elke kloon die daarvandaan wordt gemaakt — terwijl het nog steeds opgeslagen
is, nog steeds op te halen, en één verwijderde ref verwijderd van terugkomen.

`⌘K` → **Replace & graft**.

![Bestaande vervangingen, en het graftformulier eronder](../../screenshots/replace.webp)

## Graften

| Geef het | En je krijgt |
|----------|--------------|
| Een commit, **geen ouders** | Die commit wordt het begin van de geschiedenis |
| Een commit, **een of meer ouders** | Hij hangt zich daar vast in plaats van waar hij werkelijk zit |

De tweede vorm is de interessante. Houd de volledige geschiedenis in een
archiefrepository, kort de werkende repository in, en een graft die naar de tip
van het archief wijst hecht de twee weer aan elkaar — dezelfde truc die GitHub
gebruikt om een shallow clone te serveren die alsnog verdiept kan worden.

**Graften op geen ouders vraagt eerst**, want "de geschiedenis is weg" en "de
geschiedenis is verborgen" zien er vanuit de log identiek uit en zijn totaal niet
hetzelfde. De objecten blijven bestaan tot een `gc` ze opruimt; zie
[onderhoud](maintenance.md).

## Ermee leven

**Vervangingen zijn refs**, onder `refs/replace/`. Dat heeft drie gevolgen die
het kennen waard zijn:

- Ze zijn **lokaal tot ze gepusht worden**: `git push origin "refs/replace/*"`
  deelt ze, en wie kloont zonder ze ziet de onaangeroerde geschiedenis.
- **Ongedaan maken werkt** — de ref laten vallen herstelt de echte afstamming
  meteen, en Gitcito legt de graft vast als een terugdraaibare actie, net als al
  het andere.
- `core.useReplaceRefs=false` laat git ze allemaal tegelijk negeren. De
  schakelaar hier schrijft precies dat, en het venster zegt het wanneer hij uit
  staat, want een repository die stilzwijgend zijn eigen vervangingen negeert is
  een verwarrende plek.

Vanaf de commandoregel toont `git --no-replace-objects log` de echte
geschiedenis zonder ook maar één instelling te veranderen.

## Wanneer je hiernaar grijpt in plaats van naar een herschrijving

| Doel | Gereedschap |
|------|-------------|
| De kloon is te groot, de geschiedenis is prima | **Graft** — niets herschreven, omkeerbaar |
| Een geheim of een enorme blob moet *weg* | [Een bestand uit de geschiedenis verwijderen](history-purge.md) — een echte herschrijving |
| Gewoon één keer minder downloaden | `git clone --depth` — shallow, geen refs om te beheren |

Een graft verwijdert niets. Als de reden dat je de oude commits weg wilt is dat
ze iets bevatten dat nooit gecommit had mogen worden, dan is dit de verkeerde
pagina: de objecten zijn er nog, nog steeds op sha op te halen, en nog steeds
aanwezig in elke bestaande kloon.

## Grenzen die je moet kennen

- **Wat je ziet komt niet meer overeen met wat er opgeslagen is.** Dat is de
  functie, en het gevaar. Wie een kloon met vervangingen debugt moet weten dat ze
  bestaan.
- **Vervangingen reizen standaard niet mee**, dus de `git log` van een collega en
  die van jou kunnen met recht van elkaar verschillen.
- **Een vervanging kan een commit verbergen voor tools, niet voor git.**
  `git cat-file` en de [objectverkenner](objects.md) openen het origineel nog
  gewoon op sha.
- **Gitcito biedt `git replace --edit` niet aan** (de inhoud van een object met
  de hand herschrijven). Dat is werk voor een teksteditor op een ruw object, en
  een voetkanon met een UI eromheen.

Zie ook: [Objectverkenner](objects.md) ·
[Een bestand uit de geschiedenis verwijderen](history-purge.md) ·
[Repository-onderhoud](maintenance.md)
