---
title: Interactieve rebase
category: Branches & ingrepen
order: 42
summary: Herordenen, squashen, fixuppen, hernoemen, bewerken of weggooien — al slepend.
keywords: interactieve rebase interactive squash fixup reword drop edit autosquash todo
---

# Interactieve rebase

De todo-lijst van `git rebase -i`, als een lijst die je kunt slepen.

![De editor voor interactieve rebase](../../screenshots/interactive-rebase.webp)

| Actie | Betekent |
|---|---|
| **pick** | Laat hem zoals hij is |
| **reword** | Houd de wijziging, bewerk de boodschap |
| **squash** | Vouw hem in de commit erboven, met beide boodschappen samengevoegd |
| **fixup** | Vouw hem in de commit erboven, gooi deze boodschap weg |
| **edit** | Stop hier zodat je kunt amenden |
| **drop** | Gooi de commit weg |

Sleep rijen om te herordenen. De editor opent nooit in een terminal — Gitcito
schrijft de todo voor je.

## Autosquash, één klik

- **Gestagede wijzigingen als fixup in deze commit** maakt de `fixup!` voor je.
- **Autosquash vanaf hier** vouwt elke `fixup!` / `squash!` in zijn doel.

Heb je een stapel reviewfixes in plaats van één, dan zoekt [absorb](absorb.md)
uit bij welke commit elke hunk hoort, zodat jij dat niet hoeft.

> Rebasen herschrijft geschiedenis. Alles wat al gepusht is heeft een force-push
> nodig, en wie het reviewde wil
> [wat er veranderd is sinds](range-diff.md) zien.

**Zie ook:** [Absorb](absorb.md) · [Wat er veranderd is sinds](range-diff.md) · [Herstel](recovery.md)
