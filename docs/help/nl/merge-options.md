---
title: Merge-opties
category: Branches & ingrepen
order: 45
summary: De git merge-schakelaars voor merges die elke keer op dezelfde manier misgaan — -X ours, witruimte, squash, subtree.
keywords: merge opties options strategie strategy -X ours theirs ignore-space-change witruimte whitespace squash no-ff ff-only no-commit subtree resolve ort recursive log --merge waarom conflict
---

# Merge-opties

Een gewone merge is één knop, en meestal is dat het hele verhaal. Deze pagina is
voor de andere keren: de lockfile die bij elke merge botst, het bestand dat
iemand opnieuw liet inspringen, het meegeleverde project waarvan de paden niet
op elkaar aansluiten. Git heeft voor alle drie al jaren schakelaars; ze zijn
alleen begraven in een handleiding die niemand midden in een conflict opent.

Rechtsklik een branch → **Mergen met opties…** — in de branch- en remoterijen van
de zijbalk *én* op de gekleurde ref-badges in de grafiek, die één menublok delen
— of `⌘K` → **Mergen met opties**.

![Merge-opties, met het precieze git-commando eronder uitgeschreven](../../screenshots/merge-options.webp)

Het commando wordt afgedrukt terwijl je het opbouwt. Het staat er om tegen de
handleiding gehouden te worden — en om de volgende keer vanuit een terminal
gedraaid te worden, zonder dit venster.

## Wanneer een hunk conflicteert

| Keuze | Vlag | Betekent |
|--------|------|----------|
| Stop en vraag het mij | — | De standaard. Jij lost het op |
| Houd de kant van deze branch | `-X ours` | Botsende hunks worden opgelost naar wat al uitgecheckt is |
| Neem de binnenkomende kant | `-X theirs` | Botsende hunks worden opgelost naar de branch die binnenkomt |

**`-X ours` is niet `-s ours`.** De schakelaar hier beslist alleen over de hunks
die werkelijk botsen; elke andere wijziging van de andere branch merget gewoon.
De strategie die `ours` heet — en die Gitcito niet aanbiedt — neemt jouw boom in
zijn geheel en gooit de andere kant weg, waarmee je een merge-commit krijgt die
beweert werk te bevatten dat er niet in zit. Dat onderscheid is het meest
misbegrepen aan git-merges.

**Het kan niet alles beslissen.** Een modify/delete-conflict — de ene kant
bewerkte een bestand, de andere verwijderde het — is geen inhoudshunk, en `-X`
laat het aan jou. Dat klopt ook: er bestaat geen versie van "geef ons de voorkeur"
die beantwoordt of een verwijderd bestand terug moet komen.

## Witruimte

| Keuze | Vlag |
|--------|------|
| Negeer wijzigingen in bestaande witruimte | `-X ignore-space-change` |
| Negeer witruimte volledig | `-X ignore-space-at-eol`, `-X ignore-all-space` |

Het geval waarvoor dit bestaat: de ene branch liet een bestand opnieuw inspringen
(of een formatter deed dat), de andere bewerkte diezelfde regels. Git ziet twee
bewerkingen op één regel en stopt. Met witruimte genegeerd is het herinspringen
geen wijziging die meeweegt, en gaat de echte bewerking erdoorheen.

Het resultaat behoudt de witruimte van de *andere* kant op de regels die die kant
raakte, dus een formatter er daarna nog eens overheen halen is geen slecht idee.

## Wat er wordt vastgelegd

| Keuze | Vlag | Laat je achter met |
|--------|------|--------------------|
| Fast-forward waar mogelijk | — | Alleen een merge-commit als de geschiedenis uiteenliep |
| Altijd een merge-commit maken | `--no-ff` | Een merge-commit zelfs bij een fast-forward, zodat de branch voorgoed zichtbaar is in de grafiek |
| Alleen fast-forward, anders weigeren | `--ff-only` | Niets, als er een echte merge nodig zou zijn. Handig als controle |
| Squash | `--squash` | De wijzigingen gestaged, geen merge vastgelegd, de commit aan jou om te schrijven |
| Mergen maar niet committen | `--no-commit` | De merge gestaged en in uitvoering, zodat je hem eerst kunt inspecteren of aanpassen |

**Squash en `--no-commit` zijn niet hetzelfde.** Squash vergeet dat er überhaupt
een merge plaatsvond: git legt geen tweede ouder vast, en de branch ziet er de
volgende keer ongemerged uit. `--no-commit` is een merge in uitvoering die
simpelweg op jou wacht — `MERGE_HEAD` is gezet, en committen maakt hem gewoon af.

**`--ff-only` faalt niet in stilte.** Zou er een merge-commit nodig zijn, dan
weigert git en verschuift er niets, en juist dat maakt het een goede
gezondheidscontrole vóór een gescripte merge.

## Strategie

| Strategie | Voor |
|-----------|------|
| Standaard (`ort`) | Alles. De moderne drieweg-merge van git |
| `subtree` | De twee kanten wonen op verschillende paden — een project dat in een submap van deze is opgenomen |
| `resolve` | De oude drieweg-merge. Slaagt af en toe waar `ort` het opgeeft bij een kris-kras geschiedenis |

`-s subtree` is degene om te onthouden. Updates mergen van een project dat in
`vendor/parser/` zit zou anders lezen als "elk bestand verwijderd, elk bestand
toegevoegd"; de subtree-strategie rekent de padverschuiving eerst uit. Zie
[subtrees](subtree.md) voor de hele workflow.

## Waarom dit conflicteert

In de [conflictoplosser](conflicts.md) zit een knop **Waarom dit conflicteert**.
Die draait `git log --merge` voor het bestand dat voor je staat en somt per kant
de commits op die het aanraakten sinds de branches uiteengingen.

![De commits van elke kant die het conflicterende bestand aanraakten](../../screenshots/conflict-why.webp)

Conflictmarkers zeggen *wat* er botst. Dit zegt *wie het veranderde, wanneer en
waarom* — en dat is meestal de vraag die de oplossing werkelijk bepaalt, en de
reden om iemand te gaan vragen voor je een kant kiest.

Toont het niets, dan heeft geen van beide kanten een wijziging aan precies dit
bestand gecommit: de botsing komt van een hernoeming of een mapverplaatsing
hogerop.

## Grenzen die je moet kennen

- **Opties gelden voor één merge.** Ze worden niet onthouden, en ze veranderen
  niets aan de gewone **Mergen in huidige** en aan het sleepmenu.
- **Ongedaan maken werkt gewoon**: een merge met opties legt dezelfde
  undo-regel vast, die reset naar `ORIG_HEAD`.
- **Octopus-merges** (meer dan twee branches tegelijk) worden hier niet
  aangeboden.
- **De "Merge X in Y"-items per ref in het commitmenu** blijven gewone merges.
  Gebruik de ref-badge zelf wanneer je de opties wilt.
- **`-X` beslist in stilte.** Niets markeert welke hunks automatisch opgelost
  zijn, dus lees bij een belangrijke merge achteraf de diff in plaats van te
  vertrouwen op de afwezigheid van conflicten.

Zie ook: [Mergen & rebasen](merging.md) · [Conflicten](conflicts.md) ·
[Subtrees](subtree.md) · [Conflictradar](conflict-radar.md)
