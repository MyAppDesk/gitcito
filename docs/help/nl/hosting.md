---
title: Hosting & pull requests
category: Synchroniseren & meerdere repo's
order: 56
summary: Maak overal PR's aan; review en merge ze op GitHub en GitLab.
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

## Stapels in de lijst

Pull requests die op elkaar staan vouwen samen tot één regel met een
stapelpictogram, de branch waarop de ketting landt en hoeveel het er zijn. Klap
hem uit om de ketting in leesvolgorde te zien — blad eerst, tot aan de basis —
met een pijltje onder elke regel dat noemt waarin hij samengaat, zodat de
richting op het scherm staat in plaats van uit vier bases te volgen.

Twee dingen maken zo'n groep: GitHubs eigen stapelnummer, als de pull requests
bij een [native stapel](stacks.md) horen, en anders de refs zelf — een pull
request wiens basis de head van een andere is, staat erop. Die tweede regel is
waarom dit ook op GitLab, Bitbucket en Azure DevOps werkt.

![Een stapel in de pull-requestlijst](../../screenshots/pr-stack-list.webp)

Elke regel draagt de staat van de **checks** van zijn head — hover voor de
aantallen — en op GitHub ook de niveaus die al gesloten of gemerged zijn, die een
lijst met open PR's zou verbergen. Een niveau boven een **gesloten** niveau wordt
als geblokkeerd gemarkeerd: zijn eigen checks mogen groen zijn, maar de branch
waarop hij mikt gaat nooit landen. De acties van de regel verschijnen bij hover,
zodat de titel de breedte houdt.

De checks lezen kost één verzoek per pull request, en alleen bij het verversen
van de lijst.

## Reviewen — GitHub en GitLab

| | |
|---|---|
| **Gesprek** | Opmerkingen en reviewstatus |
| **Checks** | CI-checkruns (GitHub) of pipeline-jobs (GitLab) met geslaagd/mislukt/in behandeling en links naar de logs |
| **Bekeken bestanden** | Een ✓-checklist per bestand met voortgang |
| **Inline threads** | Regelopmerkingen gegroepeerd per `file:line`, en antwoorden |
| **Acties** | Reageren, goedkeuren, wijzigingen vragen, en mergen / squashen |

Force-pusht iemand midden in de review, dan laat
[wat er veranderd is sinds](range-diff.md) je precies zien wat er verschoof.

De GitLab-verschillen, in duidelijke taal: GitLab kent geen enkele
"review indienen"-aanroep, dus **goedkeuren** gebruikt zijn approval-endpoint
en **wijzigingen vragen** trekt je goedkeuring in en plaatst je opmerking.
**Rebase-mergen** wordt niet aangeboden — GitLab bepaalt merge-commit versus
fast-forward aan de hand van de projectinstellingen, dus het mergemenu toont
alleen mergen en squashen. Inline threads tonen het bestand en de regel, maar
niet de omliggende diff-hunk, die de API van GitLab niet teruggeeft.
Reviewen/mergen werkt voor projecten op **gitlab.com**; zelf gehoste instanties
worden nog niet ondersteund. Bitbucket en Azure DevOps openen voor review nog
steeds in de browser.

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
