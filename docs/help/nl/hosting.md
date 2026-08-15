---
title: Hosting & pull requests
category: Synchroniseren & meerdere repo's
order: 56
summary: Maak overal PR's aan; review en merge ze op GitHub.
keywords: pull request PR merge request GitHub GitLab Bitbucket Azure DevOps review goedkeuren approve mergen issues
---

# Hosting & pull requests

## Aanmaken

Maak een pull request (of merge request) aan zonder de app te verlaten:
branchkeuzelijsten, titel en body voorgevuld vanuit de commits van de branch, een
conceptschakelaar, en — op GitHub — reviewers, labels en toegewezen personen die
bij het aanmaken meteen worden toegepast.

![Een pull request aanmaken](../../screenshots/create-pr.webp)

Werkt op **GitHub, GitLab, Bitbucket en Azure DevOps**. Openstaande PR's/MR's
voor alle vier staan in de zijbalk.

Begin er een vanuit branchvergelijking, de grafiek, de `+` in het PR-paneel, of
vanuit een issue (wat `Closes #N` invult).

## Reviewen — GitHub

| | |
|---|---|
| **Gesprek** | Opmerkingen en reviewstatus |
| **Checks** | CI-checkruns met geslaagd/mislukt/in behandeling en links naar de logs |
| **Bekeken bestanden** | Een ✓-checklist per bestand met voortgang |
| **Inline threads** | Regelopmerkingen gegroepeerd per `file:line` met hun diff-hunk, en antwoorden |
| **Acties** | Reageren, goedkeuren, wijzigingen vragen, en mergen / squashen / rebasen |

Force-pusht iemand midden in de review, dan laat
[wat er veranderd is sinds](range-diff.md) je precies zien wat er verschoof.

## Issues, milestones, releases — GitHub

Blader door issues en open een volledig issue-tabblad: body, opmerkingen, labels,
toegewezen personen, milestone, Projects v2-velden, sluiten/heropenen, en **maak
een branch voor dit issue** (met AI-naamgeving). Milestones tonen voortgang en
hun issues. Releases zijn doorbladerbaar met een changelogpagina.

## Meldingen — GitHub

Je hele inbox — reviewverzoeken, vermeldingen, CI-activiteit — over elke
repository heen, met filters voor ongelezen/alles en markeren als gelezen. De bel
in de werkbalk draagt een badge voor ongelezen items, en optionele
bureaubladmeldingen gaan af wanneer er om een review gevraagd wordt of CI klaar
is.

## Tokens

Tokens per profiel voor meerdere accounts of organisaties, bewaard in de
sleutelhanger van je besturingssysteem. Gitcito kan ook lenen wat je **git
credential helper** al bevat, dus een organisatie waarvoor je al geauthenticeerd
bent vergt vaak helemaal geen instelwerk. Zie
[Beveiliging & geheimen](security.md).

**Zie ook:** [Gestapelde branches](stacks.md) · [AI-functies](ai.md)
