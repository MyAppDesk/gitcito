---
title: Lokale CI
category: Synchroniseren & meerdere repo's
order: 58
summary: Draai de GitHub Actions van de repo lokaal met act — voordat er iets gepusht is.
keywords: lokale ci local ci act actions workflow runner docker pipeline test testen voor push nektos
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
