---
title: Commandopalet & zoeken
category: Repository & geschiedenis
order: 11
summary: Spring overal heen, en grep de boom of de geschiedenis.
keywords: commandopalet command palette zoeken search grep code search pickaxe vinden fuzzy springen
---

# Commandopalet & zoeken

## Het palet — <kbd>⌘K</kbd>

Spring met fuzzy zoeken naar een **branch** (checkt hem uit), een **commit**
(scrolt de grafiek ernaartoe), een **bestand in de werkboom**, of een **actie** —
fetchen, pullen, pushen, stashen, terminal, reflog, instellingen, en elke functie
in dit handboek.

Het leert: wat je onlangs gebruikte komt eerst, en wat je vaak gebruikt gaat voor
op wat je zelden gebruikt.

![Het commandopalet](../../screenshots/command-palette.webp)

## Code zoeken — <kbd>⌘⇧F</kbd>

Twee verschillende vragen, één venster:

| Modus | Vraag die het beantwoordt |
|---|---|
| **Inhoud** | "Waar staat deze tekst nú?" — `git grep` over getrackte *en* untracked bestanden, met hoofdlettergevoeligheid / heel woord / regex. |
| **Geschiedenis-pickaxe** | "Wanneer verscheen of verdween deze tekst?" — `git log -S` / `-G`. |

Treffers komen terug met syntaxkleuring en de match gemarkeerd, gegroepeerd per
bestand en uitklapbaar tot de precieze regels. Klik er een aan om het bestand op
die regel te openen, of de commit die hem introduceerde.

![Resultaten van code zoeken](../../screenshots/code-search.webp)

## De grafiek filteren

Het zoekveld boven de grafiek filtert commits op boodschap, auteur, SHA of
deploymentstatus. Voor "alleen commits die dit bestand aanraakten" gebruik je het
padfilter — zie [de commitgrafiek](graph.md).

**Zie ook:** [De commitgrafiek](graph.md) · [Toetsenbord & sneltoetsen](keyboard.md)
