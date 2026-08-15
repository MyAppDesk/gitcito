---
title: Veilig delen
category: Beveiliging
order: 72
summary: Verplaats instellingen, kluisregels of een hele workspace tussen machines.
keywords: veilig delen secure share export import bundle versleuteld encrypted instellingen workspace overdragen machine
---

# Veilig delen

Een nieuwe machine inrichten betekent meestal alles opnieuw intypen. Veilig delen
pakt het in plaats daarvan in één versleutelde bundel.

![De instellingen van één repository exporteren als een versleutelde bundel](../../screenshots/secure-share.webp)

![Dezelfde export voor een hele workspace](../../screenshots/secure-workspace.webp)

## Wat erin kan

| Sectie | Inhoud |
|---|---|
| **Instellingen** | Thema's, indeling, sneltoetsen, voorkeuren |
| **Kluis** | Globale geheimen en geheimen per repository |
| **Repository's** | De repository's van een workspace, bij het importeren gematcht op remote of map |

Geheimen gaan alleen mee wanneer je **het vakje aanvinkt**. Een bundel zonder dat
vinkje bevat helemaal geen credentials.

## Importeren

Het importscherm laat **vóór** er iets wordt toegepast zien wat erin zit, sectie
voor sectie, en repository's worden gekoppeld aan wat je al hebt — eerst op
remote-URL, daarna op map — zodat importeren niet de hele wereld opnieuw kloont.

**Zie ook:** [Kluis](vault.md) · [Beveiliging & geheimen](security.md)
