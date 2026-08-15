---
title: Een pull request bekijken
category: Synchroniseren & meerdere repo's
order: 57
summary: Draai andermans pull request op je eigen machine zonder iets te committen — op elke host, ook PR's uit forks.
keywords: preview bekijken pull request merge request PR MR fork lokaal uitchecken testen proberen refs/pull refs/merge-requests pull-requests remote branch
---

# Een pull request bekijken

Een diff in een browser reviewen vertelt je of de code prettig leest. Het vertelt
je niet of de app nog start. Om dat te weten moet je de branch draaien — en daar
lopen mensen vast, want een pull request uit een fork woont in een repository die
je nooit gekloond hebt, vaak een waar je niet naartoe kunt pushen.

Lokaal bekijken lost dat op met een feit dat de meeste mensen nooit hoeven te
leren: forges publiceren de head van elke pull request als een gewone git-ref **op
de doelrepository**. De fork hoeft niet bereikbaar te zijn, je hebt geen
API-token nodig, en er wordt geen tweede remote toegevoegd. Eén fetch, en de code
staat op je schijf.

![Lokaal bekijken: kies de remote, de pull request, en hoe je hem toepast](../../screenshots/pr-preview.webp)

| Host | Waar de PR-head woont |
|------|-----------------------|
| GitHub, GitHub Enterprise, Gitea, Forgejo, Gogs | `refs/pull/<n>/head` |
| GitLab (cloud en zelf gehost) | `refs/merge-requests/<n>/head` |
| Bitbucket Cloud, Bitbucket Server | `refs/pull-requests/<n>/from` |
| Azure DevOps | `refs/pull/<n>/merge` |

Gitcito peilt alle vier in één `ls-remote`, dus een onbekende of zelf gehoste
forge werkt zolang hij een van deze conventies volgt.

## Openen

- De lijst met pull requests in de zijbalk — de pijlknop op elke regel. Dit werkt
  voor elke host, anders dan de detailweergave, die alleen GitHub kent.
- Het commandopalet: **Pull request lokaal bekijken**.
- Binnen de detailweergave van een pull request, naast de knop "openen in
  browser".

## Wat je hem geeft

**Remote** — de repository waar de pull request *tegenaan* is geopend, normaal
`origin`. Niet de fork.

**Pull request** — het nummer, of een geplakte browser-URL. `7`, `#7` en
`https://github.com/owner/repo/pull/7` werken alle; net als de URL-vormen van
GitLab, Bitbucket en Azure DevOps. Druk op **Zoeken** en Gitcito meldt de ref die
het oploste en de commit waar die naar wijst, vóór er iets gefetcht wordt.

**Remote branch** — het tweede tabblad, voor wanneer er geen PR-ref te vinden is:
een host die ze niet publiceert, of een branch die je gewoon wilt proberen. Geef
de branchnaam zoals hij op de remote bestaat.

## De twee manieren om hem toe te passen

Geen van beide schrijft een commit. Dat is met opzet — een preview waar je niet
van weg kunt lopen is geen preview.

| Modus | Wat er gebeurt | Hoe je het terugdraait |
|-------|----------------|------------------------|
| **Een lokale branch** | De ref wordt op een eigen branch gefetcht (`pr/7` standaard) en uitgecheckt. Je andere branches blijven onaangeroerd. | Ongedaan maken keert terug naar de branch waar je op zat en verwijdert de previewbranch. |
| **Een merge die je niet gecommit hebt** | De ref wordt in de huidige branch gemerged met `--no-commit --no-ff`, waarbij de gecombineerde boom gestaged blijft zodat je hem kunt bouwen en testen. | Ongedaan maken breekt de merge af. |

Dezelfde pull request twee keer bekijken hergebruikt dezelfde branch en verzet
hem naar de nieuwe head — handig wanneer de auteur een fix pusht terwijl jij aan
het testen bent. Bestaat die branch al, dan zegt Gitcito dat en vraagt het
voordat het hem reset, want elke commit die alleen daar woont zou verloren gaan.

## Wat het niet zal doen

- **Het kan geen ref verzinnen die de host niet publiceert.** Sommige zelf
  gehoste configuraties zetten PR-refs uit; sommige forges hadden ze nooit. Je
  krijgt een duidelijke "geen ref voor #n" en het tabblad met de remote branch als
  de weg erlangs.
- **Het haalt geen tags op.** Een preview hoort de tag-namespace van iemand
  anders niet je repository in te sleuren.
- **De mergemodus vraagt een schone werkboom.** Git weigert over niet-gecommit
  werk heen te mergen; [stash](stashes.md) eerst.
- **Een preview is geen review.** Het zet de code op je machine — het keurt
  niets goed, becommentarieert niets en merget niets. Dat is
  [hosting & pull requests](hosting.md).
- **Privéforks blijven privé.** De PR-ref wordt door de doelrepository geserveerd,
  dus toegang volgt jouw credentials voor *die* remote — zie
  [beveiliging](security.md).

## Opruimen

Een previewbranch is een gewone branch: verwijder hem uit de zijbalk wanneer je
klaar bent, of maak meteen na de preview ongedaan. Een previewmerge die
ongecommit bleef staan kun je met ongedaan maken laten vallen, of oplossen en
committen als je toch besloot dat je hem wilt — waarna hij ophoudt een preview te
zijn en [een merge](merging.md) wordt.
