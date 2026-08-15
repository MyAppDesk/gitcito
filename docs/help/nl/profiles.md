---
title: Profielen
category: Naar eigen smaak
order: 101
summary: Gescheiden identiteiten en tokens voor werk en al het andere.
keywords: profiel profielen identiteit identity git user email tokens accounts wisselen switch
---

# Profielen

Een profiel bundelt een **Git-identiteit** (naam en e-mailadres) met de
bijbehorende **integratietokens**. Wissel van profiel en beide veranderen mee —
commits krijgen de juiste auteur en API-aanroepen gebruiken het juiste account.

Handig wanneer dezelfde machine werk- en privérepository's bedient, of wanneer je
twee GitHub-accounts hebt.

![Een profiel: git-identiteit aan de ene kant, de integratietokens aan de andere](../../screenshots/settings-profiles.webp)

## Binding per repository

Een repository kan **aan een profiel gebonden** worden, zodat een fetch op de
achtergrond altijd als het juiste account authenticeert — zelfs terwijl jij naar
een repository kijkt die bij het andere hoort.

Tokens wonen in je [OS-sleutelhanger](security.md), nooit in het
instellingenbestand.

**Zie ook:** [Beveiliging & geheimen](security.md) · [Hosting](hosting.md)
