---
title: Veilig delen
category: Beveiliging
order: 72
summary: Verplaats geheimen, notities of een hele workspace tussen machines — of teamgenoten — als één versleuteld bestand.
keywords: veilig delen secure share export import bundle versleuteld encrypted workspace overdragen machine team notities structuur geen backend
---

# Veilig delen

Een nieuwe machine — of een nieuwe teamgenoot — inrichten betekent meestal
alles opnieuw intypen. Veilig delen pakt het in plaats daarvan in één
versleuteld `.gitcito`-bestand: de teamfuncties van Gitcito hebben **geen
backend**, dus het bestand *is* het transport. Verstuur het zoals je toch al
bestanden verstuurt; het wachtwoord reist apart.

![De instellingen van één repository exporteren als een versleutelde bundel](../../screenshots/secure-share.webp)

![Dezelfde export voor een hele workspace](../../screenshots/secure-workspace.webp)

## Wat erin kan

| Sectie | Inhoud |
|---|---|
| **Kluis** | De geheimen van de globale kluis (kluisregels per repository blijven waar ze zijn) |
| **Repositorybestanden** | Ongetrackte configuratie- en geheimbestanden, bij het importeren opnieuw neergezet op dezelfde relatieve paden |
| **Workspacestructuur** | De tabindeling zelf — groepen, kleuren, volgorde — met repository's die op remote-URL worden aangeduid, nooit op jouw lokale paden |
| **Commitnotities** | De `refs/notes/commits` van een repository, bij het importeren toegepast zonder schrijftoegang tot welke remote dan ook |

Geheimen gaan alleen mee wanneer je **het vakje aanvinkt**. Een bundel zonder
dat vinkje bevat helemaal geen credentials. App-instellingen reizen niet mee in
een bundel — die hebben hun eigen platte-JSON-export in Instellingen.

## Importeren

Het importscherm laat **vóór** er iets wordt toegepast zien wat erin zit, sectie
voor sectie, en repository's worden gekoppeld aan wat je al hebt — eerst op
remote-URL, daarna op map — zodat importeren niet de hele wereld opnieuw kloont.

Een sectie **workspacestructuur** bouwt de workspace opnieuw op met de
repository's die je al hebt; die je nog niet hebt worden met hun remote
opgesomd, zodat je ze eerst kunt klonen en opnieuw importeren — Gitcito kloont
hier nooit uit eigen beweging. Een sectie **commitnotities** toont vooraf wat er
zou landen — nieuw, identiek, afwijkend, of hangend aan commits die je niet
hebt — en afwijkende notities worden alleen vervangen wanneer je
**overschrijven** aanvinkt; er is geen merge van uiteengelopen notities.

**Zie ook:** [Kluis](vault.md) · [Beveiliging & geheimen](security.md) ·
[Commitnotities](notes.md) · [Workspaces, tabbladen & groepen](workspaces.md)
