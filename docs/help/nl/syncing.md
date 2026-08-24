---
title: Fetchen, pullen & pushen
category: Synchroniseren & meerdere repo's
order: 50
summary: Gelijke tred houden, met bewakingen op de operaties die bijten.
keywords: fetch pull push force auto-fetch prune remotes upstream beschermde branch meerdere remotes fork mirror push tags all
---

# Fetchen, pullen & pushen

## Pullen

Drie modi, gekozen uit de keuzelijst: **standaard**, **alleen fast-forward**, of
**rebase**. Lokale wijzigingen worden rond de pull automatisch gestasht en
teruggezet, zodat een vuile boom je niet blokkeert.

## Pushen

Force pushes gebruiken altijd `--force-with-lease` — de veilige variant die
weigert als de remote verschoven is sinds je laatst keek. Een **beschermde
branch** met force pushen vraagt om bevestiging (de lijst staat in het tandwiel
met repository-instellingen).

![De bevestiging die een beschermde branch eist vóór een force-push](../../screenshots/force-push-guard.webp)

### Meer dan één remote

De knop **Pushen** richt zich op de upstream van de branch. Zodra een repository
meer dan één remote heeft, biedt het pijltje ernaast ook:

| | |
|---|---|
| **Naar één remote pushen** | Kies één remote — een fork, een mirror, een deploy-doel |
| **Naar alle N remotes pushen** | Eén push per remote, op volgorde |
| **Alle tags pushen naar** | `git push <remote> --tags`, elke lokale tag in één keer |

Dezelfde twee acties staan ook op de eigen rij van elke remote in de zijbalk, en
dat is meestal waar je bent wanneer de vraag opkomt.

**Een weigering annuleert de rest niet.** Een fork en zijn upstream pushen is
precies het geval waarin de ene kant weigert en de andere er alsnog doorheen
moet, dus rapporteert elke remote apart: successen worden in één melding
opgesomd, en elke mislukking krijgt een eigen melding met de reden van git.

Alleen de **eerste** remote in de lijst zet de upstream van de branch. Een branch
heeft één upstream, en de laatste remote waar je naartoe pushte is niet
automatisch degene die je wilt volgen.

Beide routes draaien dezelfde controles als een gewone push — de bevestiging voor
beschermde branches en de [geheimenbewaking](security.md). Naar twee remotes
publiceren is twee keer zo veel blootstelling, niet half zo veel voorzichtigheid.

## Branches waar je niet op staat

`git pull` verzet alleen HEAD, en daarom laten de meeste clients je eerst een
branch uitchecken voordat je hem kunt bijwerken. Gitcito niet: rechtsklik op een
lokale branch — in de zijbalk of op de badge in de [graaf](graph.md) — en je
krijgt **\<branch\> pullen** en **\<branch\> pushen**, allebei op *die* branch.

| | |
|---|---|
| **`<branch>` pullen** | Fast-forwardt de lokale ref naar zijn upstream, zonder checkout. De working tree blijft onaangeroerd. **Ongedaan te maken met ⌘Z** — de undo zet de branch terug. |
| **`<branch>` pushen** | Een gewone push van die branch, met dezelfde beschermde-branch- en [secret-waarschuwingen](security.md) als de knop in de werkbalk. |

Pullen is grijs voor een branch die niets volgt — er valt niets te halen. Op de
branch waar je *wel* op staat vallen beide terug op de normale pull, die ook de
working tree bijwerkt.

**De grens die telt:** een branch die is **afgeweken** van zijn upstream wordt
geweigerd, met een melding die dat zegt. Een divergentie oplossen is een merge of
een rebase, en beide hebben een working tree nodig — dat geval kost je nog steeds
een checkout. Force pushen van een branch waar je niet op staat wordt aangeboden
als de remote de push weigert; de route "eerst pullen, dan opnieuw" niet, om
dezelfde reden.

## Fetchen

**Alles fetchen & prunen** over elke remote, plus **auto-fetch** op de
achtergrond met een interval die jij instelt (Instellingen → Algemeen) en een
badge "X geleden gefetcht" in de werkbalk.

Een fetch die **herschreven geschiedenis** aantreft zegt dat: een melding noemt
de branch, en zijn rij krijgt een markering die
[wat er veranderd is sinds](range-diff.md) opent op precies de commit waar hij
vroeger naar wees.

## Veel repository's tegelijk

- Een groepstabblad kan zijn hele subboom **Alles fetchen / Alles pullen**.
- [Mission control](mission-control.md) doet het over de hele workspace, en kan
  *alleen* de repository's pullen die werkelijk achterlopen.

## Remotes

Voeg remotes toe, bewerk ze, verwijder ze en fetch ze afzonderlijk vanuit de
zijbalk. Branchrijen dragen aanwezigheidsbadges per remote, zodat je in één
oogopslag ziet welke remotes een kopie van een branch hebben.

**Zie ook:** [Mission control](mission-control.md) · [Hosting & pull requests](hosting.md)
