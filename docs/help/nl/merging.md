---
title: Mergen & rebasen
category: Branches & ingrepen
order: 41
summary: Mergen, rebasen, refs vergelijken, en de ene ref op de andere slepen in de zijbalk of de grafiek.
keywords: merge mergen rebase rebasen fast-forward vergelijken refs slepen drag drop branch grafiek ref badge tag remote revert reset cherry-pick
---

# Mergen & rebasen

## Vanuit de zijbalk

Rechtsklik een branch voor **Mergen in huidige** of **Rebasen op** — of
**Mergen met opties…** wanneer de gewone merge juist degene is die steeds
misgaat; zie [merge-opties](merge-options.md).

## Sleep de ene ref op de andere

Het snelste gebaar in de app: pak een branch op en laat hem op een andere vallen.
Gitcito opent een klein menu met wat die drop zou kunnen betekenen, en doet niets
tot jij kiest.

![De ene branch op de andere slepen opent het menu met wat de drop kan betekenen](../../screenshots/clip-branch-drop.webp)

Het werkt op **beide** plekken waar refs getoond worden — de branch-, remote- en
tagrijen in de zijbalk, en de gekleurde **ref-badges in de grafiek** zelf. Sleep
ertussen in elke combinatie; het doel licht op zolang je erboven zweeft.

| Drop | Betekent |
|------|----------|
| **Merge {bron} → {doel}** | Checkt het doel uit en merget de bron erin |
| **Rebase {bron} op {doel}** | Speelt de commits van de bron bovenop het doel opnieuw af |
| **Vergelijken** | Opent de [vergelijking](#twee-willekeurige-refs-vergelijken) — verandert niets |

**Het menu biedt alleen wat git kan.** Mergen commit op het doel, dus het doel
moet een lokale branch zijn — je kunt niet in een tag of een remote-tracking ref
mergen. Rebasen herschrijft de bron, dus de bron moet een lokale branch zijn.
Laat een tag op een remote branch vallen en het enige dat je krijgt is
*Vergelijken*, want dat is werkelijk alles wat er is.

Rebasen vraagt eerst om bevestiging: het geeft elke opnieuw afgespeelde commit
een nieuwe hash, wat een force push betekent als de branch al gepubliceerd is.
Mergen vraagt niets — het voegt alleen toe. Hoe dan ook zet één keer **Ongedaan
maken** je terug.

## Mergen

Fast-forward waar mogelijk, of een merge-commit afdwingen wanneer je de topologie
wilt vastleggen. Conflicteert het, dan land je in [de oplosser](conflicts.md).

## Twee willekeurige refs vergelijken

Kies een basis en een vergelijkingsref — branch, tag of kale SHA, met een
wisselknop — en je krijgt tellingen voor voor/achter, de commits die uniek zijn
voor elke kant, de volledige gecombineerde diff, en met één klik een overdracht
naar **een PR openen**.

![Twee branches vergelijken: wat uniek is aan elke kant, en de gecombineerde diff](../../screenshots/branch-compare.webp)

Bereikbaar vanuit de zijbalk (vergelijken met de huidige branch), het Tools-menu,
of <kbd>⌘K</kbd>.

## Cherry-picken, reverten, resetten

Alle drie via het contextmenu van de grafiek. Reset biedt **soft / mixed /
hard** en schrijft uit wat elk daarvan met je werkboom doet vóór je kiest.

Selecteer eerst meerdere commits en cherry-pick past de hele selectie toe, op
volgorde.

## Voor je iets merget

De [conflictradar](conflict-radar.md) scant elke branch tegen een basis en
vertelt je welke gaan vechten, zonder iets uit te checken.

**Zie ook:** [Interactieve rebase](rebase.md) · [Gestapelde branches](stacks.md) · [Conflictradar](conflict-radar.md)
