---
title: Herstel & de reflog
category: Herstel & veiligheid
order: 60
summary: Het vangnet: reflog, WIP-momentopnamen en bisect.
keywords: reflog herstel recovery ongedaan undo verloren commits momentopnamen snapshots wip bisect bisect run geautomatiseerd script exitcode herstellen hard reset
---

# Herstel & de reflog

Git raakt zelden iets kwijt. Het lastige is het terugvinden.

## Reflog

Elke verplaatsing van `HEAD` — en van elke branch — met wat hem veroorzaakte:
checkout, reset, rebase, amend, een geforceerde fetch. Vanaf elke oude regel kun
je hem **uitchecken**, **eruit branchen** of **er hard naartoe resetten**.

![De reflogweergave](../../screenshots/reflog.webp)

Dit is de knop "ik heb net de verkeerde branch gereset".

## WIP-momentopnamen

Niet-gecommit werk is het enige dat de reflog niet kan redden, dus maakt Gitcito
er momentopnamen van: je getrackte wijzigingen plus de gestagede index,
vastgelegd als een `git stash create`-commit die vastgezet wordt onder
`refs/gitcito/wip`.

![WIP-momentopnamen](../../screenshots/snapshots.webp)

- Het **raakt je werkboom nooit aan** en **verschijnt nooit in je stashlijst** —
  het is een verborgen ref, geen stash.
- Maak er met de hand een, of laat het elke **5 / 15 / 30 minuten** lopen.
- Herstel of verwijder elke momentopname uit de lijst.

## Begeleide bisect

Markeer commits als goed en slecht, kijk hoe het bereik smaller wordt, en land op
de eerste slechte commit. Gitcito houdt bij hoeveel stappen er nog over zijn,
zodat je weet of je twee vragen van het antwoord af zit of tien.

![Begeleide bisect](../../screenshots/bisect.webp)

### Laat een commando beslissen

Zodra het bereik is uitgezet, geeft **Laat een commando beslissen** de hele
zoektocht over aan `git bisect run`. Git checkt elke kandidaat uit, draait jouw
commando en leest de exitcode:

| Exitcode | Betekent |
|----------|----------|
| `0` | Goed — de bug zit hier niet |
| `125` | Deze is niet te testen; sla hem over |
| iets anders | Slecht |

Een testsuite spreekt die taal al, en daarom is `npm test` meestal het hele
antwoord. Gitcito biedt de eigen scripts van dit project aan om met één klik in
te vullen, streamt de uitvoer terwijl het draait, en landt op de eerste slechte
commit zonder dat jij ook maar één vraag beantwoordt.

![Het commandoveld, klaar om de zoektocht aan een testsuite over te geven](../../screenshots/bisect-run.webp)

**Waar je op moet letten.** Het commando draait op *elke* commit die git test,
dus een commando dat deployt, publiceert of buiten de repository schrijft doet
dat meerdere keren. Houd het bij iets dat alleen leest en rapporteert. **Stop**
beëindigt de run en laat de sessie open, zodat je met de hand verder kunt
markeren; **Afbreken** beëindigt de bisect volledig.

Een commando dat om een ongerelateerde reden faalt — een ontbrekende dependency
op dat punt in de geschiedenis, bijvoorbeeld — markeert een goede commit als
slecht en stuurt de zoektocht de verkeerde kant op. Met `125` afsluiten vanuit
een wrapper-script is de uitweg die git daarvoor biedt.

## Ongedaan maken / opnieuw

De meeste operaties leggen een regel op een undo-stapel, dus <kbd>⌘Z</kbd>
draait de laatste terug waar git dat toestaat.

**Zie ook:** [Wat er veranderd is sinds](range-diff.md) · [Stashes](stashes.md)
