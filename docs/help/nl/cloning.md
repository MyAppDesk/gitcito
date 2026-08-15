---
title: Klonen
category: Begin hier
order: 2
summary: Kloon vanaf een URL of rechtstreeks bij je host — en beperk wat er binnenkomt als de repository enorm is.
keywords: clone klonen shallow depth partial filter blob none single branch submodules recursive ls-remote branchkiezer unshallow monorepo
---

# Klonen

**Nieuwe repository → Klonen**, of `⌘K` → *Klonen*. Plak een URL, of log in bij
GitHub, GitLab, Bitbucket of Azure DevOps en kies uit je eigen repository's — het
token van het gekozen [profiel](profiles.md) wordt voor de kloon gebruikt en
daarna losgelaten, nooit in `.git/config` geschreven.

Kies een bovenliggende map en een naam; de regel onder de velden laat precies
zien waar de repository terechtkomt. Een map die al bestaat wordt geweigerd in
plaats van erin samengevoegd.

## Geavanceerd — de kloon versmallen

Alles onder **Geavanceerd** staat standaard uit: laat het met rust en je krijgt
een gewone, volledige kloon. Het verdient zijn plek bij repository's waar
"volledig" twintig minuten en meerdere gigabytes betekent.

![Het kloonvenster met Geavanceerd open: partial, shallow, single-branch, submodules en een branchkiezer](../../screenshots/clone-advanced.webp)

| Optie | Wat git doet | Wat het kost |
|--------|---------------|--------------|
| **Partial clone** | `--filter=blob:none` | Volledige geschiedenis, geen bestandsinhoud. Blobs komen op afroep binnen, dus een oud bestand openen vraagt het netwerk. |
| **Shallow clone** | `--depth=N` | Alleen de nieuwste N commits bestaan. Blame, log, bisect en range-diff stoppen bij de snede. |
| **Slechts één branch** | `--single-branch` | De andere branches blijven op de remote tot je ze fetcht. |
| **Submodules klonen** | `--recurse-submodules` | Elke submodule wordt ook uitgecheckt — nu meer tijd, later geen ontbrekende mappen. |
| **Uit te checken branch** | `--branch <name>` | Begint op die branch in plaats van op de standaardbranch van de remote. |

**Partial vóór shallow.** Een partial clone houdt elke commit — de geschiedenis
blijft doorzoekbaar, en alleen bestandsinhoud wordt lui opgehaald. Een shallow
clone gooit de geschiedenis werkelijk weg: `git log` eindigt bij de snede en
blame kan er niet voorbij kijken. Kloon je een monorepo om erin te werken, dan is
partial meestal wat je wilt.

Shallow is terug te draaien: `git fetch --unshallow` in de [terminal](terminal.md)
vult de geschiedenis weer aan.

### De branch kiezen

Typ een branchnaam, of druk op **Branches tonen** om de remote te vragen wat hij
heeft (`git ls-remote --heads`) en kies uit een keuzelijst. Dat is één rondje
over het netwerk, en alleen wanneer jij op de knop drukt — tijdens het typen
wordt er niets bevraagd.

Mislukt de opsomming — een privé-URL zonder token, een typfout, geen netwerk —
dan blijft het veld een gewoon tekstvak en meldt de kloon zelf de echte fout.

### Twee opmerkingen over de vlaggen

- **`--depth` impliceert `--single-branch`.** Bij een shallow clone is *Slechts
  één branch* uitgevinkt laten juist wat de andere branches terugvraagt
  (`--no-single-branch`), en daarom verandert de hint eronder.
- **Een lokale map klonen** negeert `--depth` normaal volledig, omdat git de
  objectopslag hardlinkt in plaats van op te halen. Gitcito kloont via een
  `file://`-URL wanneer je om een shallow kopie van een lokale repository vraagt,
  zodat de diepte die je vroeg de diepte is die je krijgt.

## Voortgang

De balk rapporteert wat git rapporteert: tellen, comprimeren, ontvangen,
oplossen, uitchecken. Een fase die geen totaal kan melden toont een onbepaalde
balk in plaats van een nep-percentage.

De nieuwe repository opent in een tabblad, vastgezet aan het profiel waarmee je
kloonde.
