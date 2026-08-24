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

### Een branch die niets volgt

`git pull` is een fetch gevolgd door een merge, en die merge moet weten *waarin*
hij moet mergen — de upstream van de branch. Een lokaal aangemaakte branch, of
een die zonder tracking is uitgecheckt, heeft er geen. De fetch slaagt gewoon, er
schuift een lange lijst bijgewerkte `origin/*`-refs voorbij, en dan stopt git met
*"There is no tracking information for the current branch"*. Er is niets gepulld
en er is niets stuk: de tweede helft had eenvoudigweg geen doelwit.

Gitcito leest die fout en biedt de reparatie als knop aan, en kiest welke aan de
hand van of de remote de branch al heeft:

| | |
|---|---|
| **Hij staat op de remote** | **Koppelen & pullen** — zet de upstream op `<remote>/<branch>` en doet dan de pull die je vroeg. **Ongedaan te maken met ⌘Z**, wat de tracking weer weghaalt. |
| **Hij staat er nog niet** | **Branch pushen** — een gewone push, die de upstream meteen instelt. |

De aangeboden remote is `origin` als die er is, anders de eerste uit de lijst. In
welk geval je zit wordt uit de remote-tracking refs gelezen, niet van het
netwerk — het antwoord weerspiegelt dus de fetch die net liep.

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

**Fetchen** heeft een eigen knop in de werkbalk, naast Pullen. Het fetcht van elke
remote en prunet, zodat je `origin/*`-refs en alle voor/achter-tellers actueel
zijn — en het raakt noch je branch noch je working tree aan. Dat is de knop als je
wilt *zien* wat iedereen heeft gedaan zonder je eigen werk te verplaatsen.

Er is ook **auto-fetch** op de achtergrond met een interval die jij instelt
(Instellingen → Algemeen). Zweef over de Fetch-knop en de ouderdom verschijnt
eronder — *4m geleden* — in amber zodra een fetch ouder is dan vijftien minuten.
Hij neemt nooit ruimte in de werkbalk in, want hij beantwoordt een vraag die je
alleen stelt terwijl je naar de knop reikt. Hij komt uit `FETCH_HEAD`, dus een
`git fetch` in een terminal telt net zo goed.

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
