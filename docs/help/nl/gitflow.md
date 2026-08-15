---
title: Git flow
category: Branches & ingrepen
order: 46
summary: Begin en voltooi features, releases en hotfixes zonder te onthouden welke branch waar in merget.
keywords: gitflow git flow feature release hotfix develop main master prefix versietag branchingmodel starten voltooien tag
---

# Git flow

Het [git-flow-branchingmodel](https://nvie.com/posts/a-successful-git-branching-model/)
is vijf regels en een hoop boekhouding. De regels zijn makkelijk; de boekhouding
is wat mensen om zes uur 's avonds op een releasedag verkeerd doen — een hotfix
in `main` mergen en `develop` vergeten, of de verkeerde branch taggen.

`⌘K` → **Git flow** doet de boekhouding.

![Het git-flow-venster op een releasebranch: bovenin een branch starten, onderin hem voltooien](../../screenshots/gitflow.webp)

## De indeling

| Branch | Bevat |
|--------|-------|
| **Releasebranch** (`main`) | Wat er in productie draait. Elke release wordt hier getagd. |
| **Integratiebranch** (`develop`) | Waar afgerond werk zich tussen releases ophoopt. |
| `feature/*` | Eén eenheid werk, afgetakt van develop. |
| `release/*` | Een versie die gestabiliseerd wordt, afgetakt van develop. |
| `hotfix/*` | Een dringende fix, afgetakt van **main** — productie kan niet op develop wachten. |

Gitcito leest en schrijft dezelfde `gitflow.*`-configsleutels die de `git flow`
CLI gebruikt (`gitflow.branch.master`, `gitflow.prefix.feature`, …). Een
repository waar iemand al `git flow init` op draaide wordt meteen herkend, en een
repository die hier is opgezet werkt daarna met de CLI. Gitcito draait overal
gewone git-commando's — de CLI hoeft niet geïnstalleerd te zijn.

**Opzetten** schrijft die sleutels en maakt, als de integratiebranch nog niet
bestaat, hem aan vanaf de releasebranch. Er wordt verder niets aangeraakt. Elke
naam of prefix kun je later aanpassen via **Indeling bewerken**.

## Starten

Kies een soort, typ een naam, druk op **Starten**. Het venster toont de branch
die het gaat aanmaken en de branch waar hij vandaan komt, vóór je je eraan
verbindt:

```
feature/search   from develop
hotfix/1.0.1     from main
```

De naam is wat jij typt; de prefix komt uit de indeling.

## Voltooien

**Voltooien** is het deel dat automatisering verdient, want het zijn meerdere
stappen die allemaal moeten gebeuren:

| Soort | Wat Gitcito doet |
|-------|------------------|
| Feature | Merget in develop met `--no-ff`, verwijdert de branch, laat je op develop achter |
| Release | Merget in main, tagt het, merget in develop, verwijdert de branch, laat je op develop achter |
| Hotfix | Merget in main, tagt het, merget in develop, verwijdert de branch, laat je op **main** achter |

`--no-ff` is met opzet: de merge-commit is wat de branch daarna zichtbaar maakt
in de [grafiek](graph.md). Zonder die commit verdwijnt een korte feature in een
rechte lijn en verliest het model waar het voor bedoeld was.

De tag is `<prefix voor versietags><naam>` — `release/1.1.0` wordt `v1.1.0` met
de standaardprefix. Haal het vinkje bij **De release taggen** weg om het over te
slaan, en schrijf een tagboodschap als je meer wilt dan de standaard.

### Wat het weigert te doen

- **Een vuile werkboom houdt het tegen.** Commit of [stash](stashes.md) eerst;
  voltooien merget twee branches en verzet HEAD twee keer, en dat rond
  niet-gecommit werk doen is hoe mensen het kwijtraken.
- **Een conflicterende merge draait het geheel terug.** Slaagt de merge in main
  maar conflicteert de merge in develop, dan zou je anders met een half
  afgeronde release blijven zitten. Gitcito zet elke branch terug waar hij was en
  meldt het conflict. Merge die branch met de hand, los hem op in de
  [conflictoplosser](conflicts.md), en de rest van de flow is aan jou.
- **Het pusht nooit.** Voltooien is lokaal. Push main, develop en de nieuwe tag
  wanneer je zover bent — zie [synchroniseren](syncing.md).

### Ongedaan maken

Eén keer **Ongedaan maken** zet alles terug: beide branches keren terug naar hun
vorige commits, de tag wordt verwijderd, en de voltooide branch wordt opnieuw
aangemaakt op zijn oude tip. Dat is de hele reden waarom voltooien veilig is om
te proberen.

## Wanneer je het niet moet gebruiken

Git flow past bij software met geversioneerde releases en een ondersteunde
productiebranch. Deploy je meerdere keren per dag vanaf `main`, dan zijn de
release- en hotfixbranches plichtplegingen die je niet gaat gebruiken —
[gestapelde branches](stacks.md) of gewone kortlevende branches vanaf `main`
passen dan beter. De featurehelft van het model werkt op zichzelf prima.
