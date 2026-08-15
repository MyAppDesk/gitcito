---
title: Repository-onderhoud
category: Repository & geschiedenis
order: 15
summary: Wat de repository op schijf kost, hoeveel daarvan terug te winnen is, en wat elke git-taak werkelijk zou doen.
keywords: onderhoud maintenance gc garbage collect repack prune fsck count-objects losse loose packed objecten schijfruimte grootte optimaliseren commit-graph git maintenance schedule dangling
---

# Repository-onderhoud

Git vertelt je nooit wat een repository kost. Het blijft werken in welke staat
zijn objectdatabase ook verkeert, dus het eerste teken van narigheid is meestal
een kloon die kruipt of een laptop zonder schijfruimte — lang nadat één commando
het had kunnen oplossen.

Dit paneel is de ontbrekende meterstand: waar de ruimte heen ging, hoeveel ervan
terug te winnen is, en wat elke taak doet vóór je hem draait.

`⌘K` → **Repository-onderhoud**.

![Schijfgebruik opgesplitst in packed, loose en onbereikbaar, met daaronder de onderhoudstaken](../../screenshots/maintenance.webp)

## De cijfers lezen

Alles komt uit `git count-objects -v` en een echte bereikbaarheidswandeling — er
wordt niets geschat.

| Rij | Wat het is | Waarom het groeit |
|-----|-----------|-------------------|
| **Packed** | Objecten binnen packfiles, gecomprimeerd en gedeltificeerd | Dit is de gezonde toestand |
| **Loose** | Eén bestand per object, nauwelijks gecomprimeerd | Elke commit, elke fetch schrijft deze |
| **Onbereikbaar** | Objecten waar niets meer naar wijst | Weggegooide commits, gewijzigde boodschappen, verlaten rebases |

Het getal naast **Loose** — *"n objecten, m al gepackt"* — is degene die je in de
gaten moet houden. Die `m` staan dubbel opgeslagen: één keer los, één keer in een
pack. Het is pure verdubbeling, en `git gc` is wat ze samentrekt.

**Onbereikbaar is nog geen afval.** Die objecten zijn hoe `git reflog` een commit
terughaalt die je weggereset hebt. Git bewaart ze met opzet twee weken.

## De taken

| Knop | Draait | Kosten |
|--------|--------|--------|
| **Optimaliseren** | `git gc` | Seconden tot een minuut. Bijna altijd het juiste antwoord |
| **Opnieuw packen vanaf nul** | `git gc --aggressive` | Minuten bij een grote repository. Herberekent elke delta |
| **Commitgrafiek herbouwen** | `git commit-graph write --reachable` | Snel. Maakt log- en grafiekwandelingen merkbaar vlotter |
| **Integriteit controleren** | `git fsck --dangling` | Traag bij een grote repository, verandert niets |
| **Onbereikbare nu weggooien** | `git gc --prune=now` | Vernietigt het vangnet van de reflog |

**Optimaliseren** is degene waar je naar grijpt. Het packt losse objecten, gooit
weg wat langer dan twee weken onbereikbaar is, en laat recente geschiedenis
herstelbaar.

**Opnieuw packen vanaf nul** wordt overschat. Het gooit elke bestaande delta weg
en rekent vanaf niets opnieuw, wat minuten kost en meestal een paar procent
bespaart ten opzichte van een gewone gc. Eén keer de moeite waard na het
importeren van een enorme geschiedenis; niet de moeite waard als routine.

**Onbereikbare nu weggooien** vraagt eerst, en de bevestiging zegt om hoeveel
objecten en hoeveel ruimte het gaat. Daarna is een commit die je een uur geleden
wegreset onherstelbaar — de reflog-regel staat er misschien nog, maar het object
erachter is weg.

## Integriteit controleren

`git fsck` verifieert dat elk object waarnaar een ander object verwijst
werkelijk aanwezig en intern consistent is.

- **Bungelende objecten zijn normaal.** Dat zijn de onbereikbare, bij naam
  genoemd. Een repository met er honderden na een rebase is gezond.
- **Ontbrekende objecten zijn schade** — een afgekapte schrijfactie, een slechte
  schijf, een onderbroken overdracht. Duiken die op, packt dan niet opnieuw:
  opnieuw packen van een beschadigde database kan een herstelbaar probleem
  permanent maken. Kloon een goede kopie van je remote en breng je ongepushte
  branches over met een [bundle](export.md).

## Onderhoud op de achtergrond

Het vinkje registreert de repository bij **`git maintenance`**, dat packt en
prefetcht volgens een schema dat je besturingssysteem draait (launchd, systemd of
Taakplanner).

Niets hiervan is eigen aan Gitcito: hetzelfde schema bedient je terminal, en
`git maintenance unregister` draait het van waar dan ook terug. Het vinkje
weghalen doet precies dat, en laat het schema staan voor welke andere
repository's dan ook geregistreerd zijn.

## Grenzen die je moet kennen

- **Het aantal onbereikbare objecten vraagt een volledige
  bereikbaarheidswandeling**, dus het paneel openen bij een zeer grote repository
  kost een moment. Dat is het eerlijke getal, geen schatting.
- **Groottes zijn wat de schijf prijsgeeft**, niet de lengte van de inhoud. Een
  los object van 400 bytes bezet nog steeds een blok van 4 KB, en daarom kosten
  duizend van die dingen megabytes — en daarom is ze packen de moeite waard.
- **Een worktree of submodule heeft zijn eigen `.git`**, dus de getoonde grootte
  is die van deze repository alleen.
- **Onderhoud kan de geschiedenis niet laten krimpen.** Zit er een blob van 400
  MB in een commit, dan is die bereikbaar en houdt gc hem voor eeuwig vast — dat
  is [een bestand uit de geschiedenis verwijderen](history-purge.md), een andere
  en veel ingrijpender operatie.
- **Gitcito draait nooit stiekem gc.** De eigen `gc --auto` van git kan dat nog
  steeds doen, zoals altijd; faalt er een, dan laat die een notitie achter in
  `.git/gc.log`, die dit paneel naar boven haalt.

Zie ook: [Een bestand uit de geschiedenis verwijderen](history-purge.md) ·
[Bundles & archieven](export.md) · [Herstel](recovery.md)
