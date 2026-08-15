---
title: Wat er veranderd is sinds
category: Wijzigingen lezen
order: 23
summary: Iemand force-pushte de branch die je reviewde. Zie wat er werkelijk veranderde.
keywords: range-diff force push rebase herschreven rewritten review interdiff reflog forced update
---

# Wat er veranderd is sinds

Je reviewde een branch. Iemand rebasede hem en force-pushte. Een gewone diff is
nu waardeloos: elke commit na een rebase is een nieuwe commit, dus alles ziet er
nieuw uit.

`git range-diff` koppelt de twee versies commit voor commit, en Gitcito leest de
oude posities rechtstreeks uit de **reflog** — er hoefde dus vooraf niets
vastgelegd te worden om dit te laten werken.

![Herschreven, nieuwe en weggevallen commits na een force-push](../../screenshots/range-diff.webp)

| Oordeel | Betekenis |
|---|---|
| **Herschreven** | Dezelfde commit, veranderd. Klap hem uit voor de interdiff — de tweak aan de boodschap en de extra check, niet het hele bestand. |
| **Nieuw** | Toegevoegd sinds je keek. |
| **Weggevallen** | Weg sinds je keek. |
| **Ongewijzigd** | Ongeschonden door de herschrijving gekomen. |

## Erheen komen

- **Een fetch die herschreven geschiedenis aantreft vertelt het je.** Een melding
  noemt de branch, en zijn rij onder Remotes krijgt een **⟳** die je kunt
  aanklikken om de vergelijking te openen op precies de commit waar hij vroeger
  naar wees.
- Rechtsklik een willekeurige branch → *Wat er veranderd is sinds…*
- <kbd>⌘K</kbd> → *Wat er veranderd is sinds*

## Eerdere posities

De chips onder de ref-velden zijn de reflog van de branch: geforceerde updates,
rebases, resets, elk met het tijdstip erbij. Kies er een en de vergelijking
draait er opnieuw tegenaan. Dat is de hele functie — de geschiedenis van waar een
branch is geweest staat al op je schijf.

**Zie ook:** [Conflictradar](conflict-radar.md) · [Herstel & reflog](recovery.md)
