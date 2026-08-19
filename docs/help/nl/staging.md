---
title: Stagen
category: Werken met wijzigingen
order: 30
summary: Stage hele bestanden, losse hunks of afzonderlijke regels.
keywords: stagen staging stage unstage verwerpen discard hunk regels lines index gedeeltelijk
---

# Stagen

Het commitpaneel heeft drie lijsten: **Conflicterend**, **Niet gestaged** en
**Gestaged**. Elke lijst klapt in, en elke onthoudt of je hem open liet staan.

![Een niet-gestagede diff, met de knoppen voor hunk en bestand ernaast](../../screenshots/line-staging.webp)

## Drie niveaus van precisie

| Niveau | Hoe |
|---|---|
| **Bestand** | Klik de ✚ op de rij, of selecteer meerdere rijen en stage de hele boel |
| **Hunk** | Open de diff en gebruik de knop in de hunkkop |
| **Regel** | Selecteer regels binnen de diff en stage precies die |

Regels stagen is wat het praktisch maakt om een `console.log` voor debugwerk
buiten een commit te houden zonder hem eerst te verwijderen.

## Verwerpen

Verwerpen werkt op dezelfde niveaus, en vraagt altijd. Untracked bestanden worden
verwijderd; getrackte gaan terug naar hun gestagede (of gecommitte) toestand.

## Toetsenbord

<kbd>↑</kbd> <kbd>↓</kbd> (of <kbd>j</kbd> <kbd>k</kbd>) lopen door de
bestandslijsten, met <kbd>⇧</kbd> voor een reeks en <kbd>⌘</kbd>/<kbd>Ctrl</kbd>
om losse bestanden aan of uit te zetten.

<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> breidt de selectie uit vanaf de laatst
aangeklikte rij. Rechtsklik op de selectie om alles erin in één keer te stagen,
unstagen, stashen of te verwerpen.

## Voor je commit

Gitcito controleert een paar dingen en vraagt één keer, nooit in stilte:

- een bestand dat op een **geheim** lijkt (`.env`, `*.pem`, `id_rsa`…),
- een **erg grote** blob (drempel in Instellingen → Beveiliging),
- **rechtstreeks naar een beschermde branch** committen (`main`/`master`
  standaard).

Elk daarvan biedt een *Negeren & untracken* in één klik. Zie
[Beveiliging & geheimen](security.md).

**Zie ook:** [Committen](committing.md) · [Diffs](diffs.md) · [Absorb](absorb.md)
