---
title: Conflictradar
category: Branches & ingrepen
order: 44
summary: Zie welke branches gaan conflicteren voordat je er ook maar één merget.
keywords: conflict radar conflictradar merge preview botsing risico branches merge-tree
---

# Conflictradar

Erachter komen dat een branch conflicteert door hem te mergen is een dure manier
om een vraag te stellen. De radar beantwoordt hem vooraf.

Gitcito merget elke branch in een basis naar keuze **binnen de objectdatabase**
(`git merge-tree --write-tree`). Geen checkout, geen wijziging aan de index, geen
wijziging aan de werkboom, niets om achteraf op te ruimen. Je niet-gecommitte werk
kan precies blijven waar het is terwijl de scan loopt.

![De radar, één oordeel per branch](../../screenshots/conflict-radar.webp)

![Branch voor branch scannen, en daarna de betwiste bestanden openen](../../screenshots/clip-conflict-radar.webp)

## Gebruik

Open hem uit het toolsmenu, via <kbd>⌘K</kbd> → *Conflictradar*, of rechtsklik
een branch om alles tegen **die** branch te scannen.

Hij scant zodra hij opent, met je huidige branch als basis.

| Oordeel | Betekenis |
|---|---|
| **Gaat conflicteren** | Mergen vraagt handwerk. De precieze paden staan erbij. |
| **Merget schoon** | Het zou zonder gevecht toegepast worden. |
| **Zit er al in** | De basis bevat het al — niets te mergen. |
| **Mislukt** | Git weigerde: niet-verwante geschiedenissen, ontbrekende ref. De reden staat erbij. |

Branches sorteren slechtste eerst, en de slechtste van de slechtste — die de
meeste bestanden raakt — komt bovenaan.

## Betwiste bestanden

Daaronder rangschikt **Betwiste bestanden** de paden naar het aantal branches
dat ze herschrijft. Twee branches die om één bestand vechten is een gesprek dat
je nu moet voeren; vijf is een ontwerpprobleem.

## Na een scan

Branchrijen in de zijbalk dragen een gekleurde stip: rood gaat conflicteren,
groen is schoon, amber is een branch die git weigerde. Branches die al in de
basis zitten krijgen geen stip — een rij grijze stippen op alles wat al gemerged
is, is enkel ruis.

> Scannen verandert niets. `git status` blijft schoon en HEAD verzet zich niet.

**Zie ook:** [Wat er veranderd is sinds](range-diff.md) · [Mergen & rebasen](merging.md)
