---
title: Absorb
category: Werken met wijzigingen
order: 33
summary: Stuur elke gestagede fix terug naar de commit die de regel introduceerde.
keywords: absorb fixup autosquash amend gestaged hunks blame reviewfixes verbeteringen inslikken
---

# Absorb

Je hebt drie reviewopmerkingen in drie bestanden opgelost. Het eerlijke antwoord
zijn drie `fixup!`-commits, elk gericht op de juiste ouder. Wat mensen in de
praktijk doen is één commit met als boodschap "review fixes".

Absorb doet het eerlijke werk voor je.

![Absorb stuurt elke gestagede hunk naar de commit die hem introduceerde](../../screenshots/absorb.webp)

## Hoe het werkt

1. Stage de fixes.
2. Tools → **Gestagede wijzigingen absorberen…** (of <kbd>⌘K</kbd>).
3. Gitcito blamet de regels die elke gestagede hunk raakt, zoekt uit welke van
   **jouw ongepushte commits** ze introduceerde, en laat je het plan zien vóór er
   iets gebeurt.

Het plan somt elke doelcommit op met de hunks die ernaartoe gaan, plus een groep
**Hoort nog nergens bij** — een gloednieuw bestand heeft geen geschiedenis om in
geabsorbeerd te worden, dus dat blijft gestaged zodat je het gewoon zelf kunt
committen.

| Knop | Wat er gebeurt |
|---|---|
| **Fixups aanmaken** | Eén `fixup!`-commit per doel. Er wordt niets gerebased. |
| **Fixups aanmaken & rebasen** | Hetzelfde, waarna een autosquash-rebase ze invouwt. |

## De regels waar het zich aan houdt

- **Alleen ongepushte commits komen in aanmerking.** Wat al gepubliceerd is, is
  niet aan ons om te herschrijven. Is alles gepusht, dan zegt absorb dat en doet
  het niets.
- **De werkboom wordt nooit aangeraakt.** Alleen de index en de commits die
  absorb zelf maakt.
- **Een mislukking laat geen rommel achter.** Faalt een stap, dan komen HEAD en
  de index precies terug zoals ze waren.
- Het weigert te draaien tijdens een merge of rebase — die index is van git.

**Zie ook:** [Interactieve rebase](rebase.md) · [Stagen](staging.md)
