---
title: Lokale CI
category: Synchroniseren & meerdere repo's
order: 58
summary: Draai de GitHub Actions van de repo lokaal met act — voordat er iets gepusht is.
keywords: lokale ci local ci act actions workflow runner docker pipeline test testen voor push nektos verdict badge notes per-commit oordeel notities per commit
---

# Lokale CI

De lus push–wachten–rood kruis–fixen–push kost tien minuten per rondje. Met
[act](https://nektosact.com) draaien dezelfde workflows in Docker-containers op
je eigen machine, en Gitcito stuurt ze aan: kies een workflow, druk op
Uitvoeren en bekijk hetzelfde log dat CI zou printen — voordat er iets je
machine verlaat.

![Lokale CI](../../screenshots/local-ci.webp)

## Een integratie, geen meegeleverde runtime

Gitcito levert bewust **geen** act of Docker mee — een app die een
container-runtime meesleept is het tegenovergestelde van een git-client. Dit
is een opt-in-integratie: schakel hem in via **Instellingen → Integraties** (of
in het dialoogvenster zelf), en Gitcito detecteert wat er geïnstalleerd is en
loodst je door de rest — `brew install act`, een draaiende Docker-daemon,
klaar. Er draait niets totdat alle drie waar zijn: ingeschakeld, act
geïnstalleerd, Docker bereikbaar.

## Wat het doet

- Toont elke workflow onder `.github/workflows`, op zijn `name:`.
- **Uitvoeren** draait de workflow met act tegen je **werkboom** — inclusief
  je niet-gecommitte wijzigingen, en dat is precies het punt: testen voordat
  je commit, niet nadat je pusht.
- De uitvoer streamt live het dialoogvenster in; **Stoppen** beëindigt de run.
  Exitcode 0 toont **Geslaagd**, al het andere **Mislukt** met de code.

## Oordelen per commit op de graaf

![Local-CI-oordelen op de graaf](../../screenshots/local-ci-verdicts.webp)

Een afgeronde run pint zijn resultaat vast aan de commit die hij testte: een
klein kolfje markeert de rij **groen of rood** in de graaf, zodat je in één
oogopslag ziet welke commits CI lokaal al hebben overleefd. Het oordeel wordt
opgeslagen als een git-notitie onder `refs/notes/gitcito-ci` — lokaal op je
machine, standaard nooit gepusht.

Eerlijkheidsregel: het oordeel wordt alleen vastgepind als je werkboom
**schoon** was. Een run over niet-gecommitte wijzigingen testte iets dat geen
enkele commit bevat, dus die toont zijn resultaat in het dialoogvenster maar
markeert niets.

## Een commit of bereik testen — zonder je branch te verlaten

De sectie **Een commit of bereik testen** van het dialoogvenster draait een
workflow tegen commits waar je *niet* op staat. Elke commit wordt **detached
uitgecheckt in een wegwerp-worktree** onder de tijdelijke map van het systeem,
act draait daar, en de worktree wordt verwijderd hoe de run ook eindigt — je
werkboom en je branch bewegen nooit. Omdat die checkout per constructie
brandschoon is, wordt het oordeel altijd vastgepind aan de geteste commit.
Rechtsklikken op een commit in de graaf biedt direct **Lokale CI op deze
commit uitvoeren** aan.

De kosten worden genoemd voordat er iets draait, niet achteraf ontdekt: typ
een revisie of een bereik (`main..HEAD`, `HEAD~5..`, een sha), druk op
**Voorbeeld**, en Gitcito toont hoeveel commits aan de specificatie voldoen en
welke nieuwste N — het expliciete budget, gemaximeerd op 50 — daadwerkelijk
zouden draaien. Een reeks draait ze **na elkaar** (act plus Docker is zwaar
genoeg dat parallelle runs om de machine zouden vechten), streamt het log van
elke run, markeert elke commit live als geslaagd/mislukt, en **Stoppen**
breekt af tussen commits en beëindigt daarbij de lopende run. Reken op echte
minuten per commit.

Nog één beperking die het weten waard is: de wegwerp-worktree bevat de
bestanden van de commit maar niet de submodule-checkouts van je repository —
een workflow die afhangt van geïnitialiseerde submodules gedraagt zich zoals
op een verse kloon zonder submodules.

## Beperkingen

- act is een heel goede imitatie van GitHubs runners, geen perfecte: actions
  die door GitHub gehoste diensten, secrets of exotische runner-images nodig
  hebben, kunnen zich anders gedragen. Lokaal groen is sterk bewijs, geen
  garantie.
- Eén run tegelijk per repository; een tweede starten annuleert de eerste.
- Alleen runs op workflowniveau — losse jobs, matrices of events kiezen is
  act-terrein; draai het in de [terminal](terminal.md) als je flags nodig hebt.
- De eerste run downloadt runner-images — reken erop dat die één keer traag is.

**Zie ook:** [Hosting & pull requests](hosting.md) · [Geïntegreerde terminal](terminal.md)
