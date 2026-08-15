---
title: Committen
category: Werken met wijzigingen
order: 31
summary: Boodschapstijlen, sjablonen, co-auteurs en de linter.
keywords: commit boodschap message composer conventional gitmoji ticket amend sjabloon template co-author linter
---

# Committen

## Boodschapstijlen

Kies er een in de instellingen; de opsteller past zich eraan aan.

| Stijl | Ziet eruit als |
|---|---|
| **Conventional** | `feat(api)!: add rate limiting` — met een typekeuzelijst |
| **Gitmoji** | `✨ add rate limiting` — met een emoji-kiezer |
| **Ticket** | `ABC-123: add rate limiting` — voorgevuld vanuit de branchnaam |
| **Plain** · **Auto** | Wat je maar typt; bij Auto bepaalt de AI de vorm |
| **Caveman** · **Haiku** | Precies wat je erbij voorstelt |

![Opsteller voorgevuld vanuit een commitsjabloon](../../screenshots/commit-template.webp)

## Wat de opsteller voor je doet

- <kbd>↑</kbd> <kbd>↓</kbd> haalt je **recente boodschappen** terug.
- Een **co-auteurkiezer** voegt `Co-authored-by:`-trailers toe uit de eigen
  bijdragers van de repository.
- `commit.template` / `.gitmessage` **vult de boodschap voor**, met de
  commentaarregels eruit gestript.
- Tijdens een merge, cherry-pick of revert is de boodschap **voorgevuld** zoals
  git dat zou doen.
- Concepten **blijven bewaard** per repository, dus van tabblad wisselen kost je
  nooit een boodschap.

## De linter

Een live, niet-blokkerende controle: lengte van de onderwerpsregel (met een
tekenteller), een punt aan het eind, een niet-gebiedende of met kleine letter
beginnende onderwerpsregel, te brede regels in de body. Hints, nooit een hek —
het houdt je niet tegen bij het committen.

## Amend

Amend herschrijft de laatste commit met wat er gestaged staat. Gitcito laat je
eerst de bestaande boodschap zien, zodat je bewerkt in plaats van overtypt.

**Zie ook:** [Stagen](staging.md) · [Absorb](absorb.md) · [Changeloggenerator](changelog.md)
