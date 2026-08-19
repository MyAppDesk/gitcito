---
title: Stashes
category: Synchroniseren & meerdere repo's
order: 52
summary: Gedeeltelijke stashes, toepassen per bestand, en stash → branch.
keywords: stash stashes gedeeltelijk partial keep-index apply pop drop untracked branch
---

# Stashes

Stashen in Gitcito is geen alles-of-niets.

| Actie | Wat het doet |
|---|---|
| **Stashen** | Alles, desgewenst inclusief untracked bestanden, met een boodschap |
| **Gedeeltelijke stash** | Vink alleen de bestanden aan die je wilt; optioneel `--keep-index` |
| **Toepassen / Poppen** | De hele stash, of **slechts een deel van zijn bestanden** |
| **Stash → branch** | `git stash branch` — de nooduitgang wanneer een stash niet schoon toe te passen is |

Een stash selecteren toont zijn bestanden en diffs, precies zoals bij een commit.

De bestandenlijst is meervoudig te selecteren met dezelfde gebaren als bij
[stagen](staging.md) — <kbd>⌘</kbd>/<kbd>Ctrl</kbd>-klik, <kbd>⇧</kbd>-klik,
<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> — en een rechtsklik (of de knop *n
bestanden toepassen*) zet alleen de selectie terug.

![Een gedeeltelijke stash: vink alleen de bestanden aan die mee moeten](../../screenshots/stash-partial.webp)

## Wanneer een stash niet toe te passen is

Zou het toepassen van een stash untracked bestanden overschrijven, dan stopt git.
Gitcito biedt aan ze te overschrijven en het opnieuw te proberen, in plaats van
jou de bezwering te laten uitpuzzelen.

Is de boom te ver verschoven, dan maakt **stash → branch** de branch opnieuw
waarvan de stash genomen werd, past hem daar schoon toe, en laat de stash vallen.

## Niet te verwarren met momentopnamen

[WIP-momentopnamen](recovery.md) zijn automatisch en verborgen; stashes zijn
bewust en staan in een lijst. Momentopnamen raken je stashlijst nooit aan.

**Zie ook:** [Herstel](recovery.md) · [Stagen](staging.md)
