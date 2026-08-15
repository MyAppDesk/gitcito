---
title: Untracked bestanden verwijderen
category: Werken met wijzigingen
order: 35
summary: Een droogloop van git clean — elk untracked pad, met grootte, genegeerde bestanden apart en de Prullenbak als standaardbestemming.
keywords: clean git clean untracked verwijderen wissen rommel build output genegeerd ignored gitignore dry run prullenbak trash node_modules dist opruimen
---

# Untracked bestanden verwijderen

Een werkboom verzamelt bestanden waar git nooit een kopie van heeft gemaakt: een
kladnotitie, een `debug-output.txt`, een `dist/` van een mislukte build, een
`node_modules` van een branch die je vorige maand hebt verlaten. Git heeft
hiervoor één commando — `git clean` — en het is de enige git-operatie met
**niets erachter**. De inhoud zat nooit in een commit, dus er is geen
reflog-regel, geen stash, geen ongedaan maken en geen `git`-bezwering die het
terughaalt.

Daarom is het de operatie die mensen in een terminal draaien en waar ze meteen
spijt van hebben. De versie van Gitcito toont de hele lijst voordat er iets
gebeurt.

`⌘K` → **Untracked bestanden verwijderen**.

![Untracked en genegeerde paden apart opgesomd, elk met zijn grootte, voordat er iets weggaat](../../screenshots/clean.webp)

## Wat de lijst betekent

Elke regel is een pad dat `git clean` kan bereiken, met de grootte op schijf, in
twee groepen:

| Groep | Wat het is | Standaard geselecteerd |
|-------|-----------|------------------------|
| **Untracked** | Nooit gecommit, niet geraakt door `.gitignore` | Ja |
| **Genegeerd** | Geraakt door `.gitignore` — buildresultaten, caches, `.env` | **Nee** |

De splitsing is het hele punt. Genegeerde paden zijn meestal waardeloos en
soms de enige kopie van iets dat ertoe doet: een lokale `.env`, een
databasedump, een gedownloade fixture. Niets dat op `.gitignore` past wordt ooit
voor je aangevinkt.

Een volledig untracked **map is één regel**, geen regel per bestand — `tmp/`,
`dist/`, `node_modules/` — omdat git ze op die korrelgrootte verwijdert, en een
lijst van 40.000 bestanden is een lijst die niemand leest. De grootte is de som
van wat erin zit.

Een map met het label **eigen repository** heeft een eigen `.git`: een kloon die
je binnen deze hebt gezet, of een uitprobeersel dat je nooit hebt aangehaakt. Git
weigert die te verwijderen (het wil `-ff`, een vlag die Gitcito niet aanbiedt) —
de Prullenbak neemt ze wel.

## Prullenbak of verwijderen

**Naar de Prullenbak verplaatsen** staat standaard aan en gaat helemaal niet via
git: de paden gaan naar de Prullenbak van je systeem, waar je ze terug kunt
zetten. Dit is de enige route die een geneste repository verwijdert, en de enige
die een verkeerd vinkje overleeft.

Zet je hem uit, dan is het een echte `git clean -f -d -x` op precies de
geselecteerde paden, en wordt om bevestiging gevraagd met het aantal en de
totale grootte voor je neus. Daar herstelt niets van.

## Grenzen die je moet kennen

- **Alleen untracked bestanden.** Een gewijzigd getrackt bestand staat hier niet
  — dat is [Verwerpen](staging.md), dat het herstelt uit de index of uit HEAD.
- **De lijst is afgekapt** op de eerste 400 paden. Heeft een repository er meer,
  verwijder dan wat er staat en druk op **Opnieuw scannen** voor de rest.
- **Mapgroottes zijn bij benadering** voor erg grote bomen: de scan stopt na
  20.000 bestanden, dus een gigantische `node_modules` kan kleiner lijken dan hij
  is. Groter wordt hij nooit gelezen.
- **De scan is een momentopname.** Schrijft een build bestanden terwijl het
  venster open staat, druk dan op **Opnieuw scannen** voor je iets verwijdert.
- Paden worden tegen de eigen lijst van verwijderbare bestanden van git gehouden
  voor er iets wordt aangeraakt, dus via dit venster kan niets getrackts worden
  verwijderd, zelfs niet op naam.

Zie ook: [Stagen & verwerpen](staging.md) · [Bestanden negeren](hooks.md) ·
[Een bestand uit de geschiedenis verwijderen](history-purge.md)
