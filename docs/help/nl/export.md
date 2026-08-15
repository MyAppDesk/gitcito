---
title: Bundles & archieven
category: Synchroniseren & meerdere repo's
order: 58
summary: Een repository als één bestand waar git uit kan klonen, of een boom als een zip die niemand git nodig heeft om te openen.
keywords: bundle git bundle archief archive zip tarball tar gz export air gap offline usb e-mail overdragen export-ignore gitattributes clone from file range
---

# Bundles & archieven

Twee manieren om een repository in één bestand te stoppen. Ze lijken
uitwisselbaar en zijn dat niet, en de verkeerde kiezen is de hele reden dat deze
pagina bestaat.

| | Een **bundle** | Een **archief** |
|---|---|---|
| Bevat | Geschiedenis: commits, branches, tags | De bestanden bij één commit |
| Geopend door | `git clone` / `git fetch` — het *is* een remote | Elk uitpakprogramma |
| Later | Je kunt er opnieuw uit fetchen, mergen, doorwerken | Niets. Het is een momentopname |
| Gebruik voor | Werk verplaatsen naar een machine zonder netwerk | "Stuur me de broncode bij v2.1" |

`⌘K` → **Repository bundelen** of **Archief exporteren**.

![Een repository in één bestand bundelen, met de bereikoptie klaar](../../screenshots/export.webp)

## Bundles

Een bundle is het antwoord van git op een kloof die geen netwerk overbrugt: een
machine zonder netwerkverbinding, een usb-stick, een e-mailbijlage, een laptop in
een vliegtuig. De ontvangende kant draait `git clone work.bundle myrepo` en
krijgt een echte repository, met jouw geschiedenis en jouw branches, die uit dat
bestand fetcht alsof het een server was.

Drie bereiken:

| Bereik | Wat er meegaat | Grootte |
|--------|----------------|---------|
| **Alles** | Elke branch en tag, volledige geschiedenis | De hele repository |
| **Eén branch of tag** | Die ref en alles wat hij bereikt | Meestal het grootste deel |
| **Een bereik commits** | Alleen wat tussen de twee uiteinden zit | Klein |

**Een bereikbundle is een patch op de geschiedenis, geen repository.** Hij legt
het verre uiteinde vast als een *vereiste*: git weigert hem te openen in een
repository die die commit niet al heeft, want er zou niets zijn om de nieuwe
commits aan vast te maken. Dat is het juiste gedrag en de eerste keer een
verrassing. Gebruik een bereik wanneer de andere kant jouw werk al tot een zeker
punt heeft — de tag die ze het laatst ontvingen, de commit waar jullie allebei
vanaf branchten.

### Er een ontvangen

**Een bundle importeren…** leest het bestand, somt op wat erin zit en zegt vooraf
of deze repository er iets mee kan — ontbreken er vereisten, dan vertelt het je
hoeveel in plaats van later te falen met de eigen bewoordingen van git.

Geïmporteerde refs belanden onder **`bundle/…`**, in de remote-tracking-namespace.
Er verschuift niets lokaals: geen branch wordt fast-forward gezet, geen werk
overschreven. Vervolgens merge, rebase of check je `bundle/main` uit op jouw
voorwaarden, precies zoals je een branch van elke andere remote zou behandelen.

Wil je in plaats daarvan een *nieuwe* repository uit een bundle beginnen, kloon
dan in een terminal uit het bestand: `git clone work.bundle myrepo`. Gitcito
importeert in een geopende repository; het kloont niet uit een bestand.

## Archieven

`git archive` schrijft de boom bij één commit weg als een zip of een tarball.
Geen `.git`, geen geschiedenis, geen manier om eruit te fetchen — en dat is
precies het punt wanneer de ontvanger broncode hoort te krijgen en geen
repository.

| Optie | Wat het doet |
|--------|--------------|
| Referentie | Branch, tag of commit om te exporteren. Een tag is het gebruikelijke antwoord |
| Formaat | `zip`, `tar.gz` of `tar` |
| In een map wikkelen | Voegt een map op het hoogste niveau toe, zodat uitpakken nooit bestanden overal heen spuit |
| Alleen dit pad | Exporteer één submap in plaats van de hele boom |

### export-ignore is de reden om dit te gebruiken

Een repository kan paden markeren in `.gitattributes`:

```
.github/     export-ignore
test/        export-ignore
*.psd        export-ignore
```

Die paden worden **uit elk archief weggelaten** terwijl ze in de repository
blijven. Zo levert een project een release-tarball uit zonder zijn CI-config, zijn
fixtures en zijn 200 MB aan ontwerpbestanden, met de regel in de repository in
plaats van in iemands releasescript.

## Grenzen die je moet kennen

- **Een bundle is een volledige kopie** tenzij je een bereik gebruikt. Een
  repository van 2 GB bundelen schrijft een bestand van 2 GB, en duurt net zo
  lang als een kloon.
- **Lege bundles worden geweigerd** door git, niet door Gitcito: een bereik met
  niets tussen de uiteinden levert een fout op in plaats van een nutteloos
  bestand.
- **Importeren merget niet.** Refs komen binnen onder `bundle/…` en blijven daar
  tot jij er iets mee doet.
- **Een archief heeft geen geschiedenis** en kan dus niet terug in een repository
  veranderd worden. Moet de ontvanger gaan committen, stuur dan een bundle.
- **`export-ignore` raakt alleen archieven.** Het verbergt niets voor een kloon,
  een bundle of de geschiedenis — daarvoor zie je
  [een bestand uit de geschiedenis verwijderen](history-purge.md).

Zie ook: [Synchroniseren](syncing.md) · [Veilig delen](secure-share.md) ·
[Een bestand uit de geschiedenis verwijderen](history-purge.md)
