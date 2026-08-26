---
title: Auteursavatars
category: Naar eigen smaak
order: 103
summary: Gravatar-foto's waar ze bestaan, een gegenereerde avatar waar niet — en een gezicht in de titelbalk dat op de repository reageert.
keywords: avatar avatars gravatar blobatar auteur foto afbeelding identicon gezicht offline privacy e-mail hash stemming uitdrukking animatie beweging verdrietig kwaad blij denkend geschrokken twijfelend ziek slaperig losgekoppeld stash slapend
---

# Auteursavatars

Een commitlijst is een muur van namen, en namen lees je langzaam. Een plaatje
ernaast maakt van "wie heeft dit geschreven" iets wat je met één blik antwoordt.
Gitcito geeft elke auteur die het toont er een: in de auteurskolom van de graaf, in
de commitdetails naast de auteur en elke co-auteur, in de co-auteurkiezer terwijl je
schrijft, in de profielwisselaar en naast elk profiel in Instellingen.

## Waar het plaatje vandaan komt

Twee bronnen, in die volgorde geprobeerd:

| Bron | Wanneer die wordt gebruikt |
|---|---|
| **Gravatar** | Het commit-e-mailadres heeft een Gravatar-account. Over HTTPS opgehaald, op basis van een SHA-256-hash van het e-mailadres in kleine letters. |
| **Gegenereerde avatar** | Al het andere — geen Gravatar, geen netwerk, of de opzoeking uit. Lokaal uit het e-mailadres getekend, nooit opgehaald. |

De gegenereerde avatar is een klein wezen, geen gekleurd vierkant: hetzelfde
e-mailadres levert altijd dezelfde vorm en dezelfde kleuren op, dus een auteur
blijft herkenbaar tussen repository's en tussen herstarts. Twee verschillende
adressen botsen praktisch nooit. Hij wordt getekend door
[blobatar](https://github.com/Alain00/blobatar) (MIT) en heeft helemaal geen netwerk
nodig — een repository vol auteurs zonder Gravatar krijgt alsnog een volledige set
te onderscheiden gezichten, offline, bij de eerste weergave.

Omdat de seed het **commit-e-mailadres** is, krijgt een auteur die onder twee
adressen commit twee avatars. Dat is opzet — het is hetzelfde signaal dat de
auteurskolom van de graaf geeft, en zo valt je meestal een machine-account of een
verkeerd ingestelde `user.email` op. Herstel het met
[auteursattributen](attributes.md) als de twee adressen echt één persoon zijn.

## Het gezicht in de titelbalk

De avatar naast je profielnaam is de enige avatar in Gitcito die staat voor **jou, in
deze repository, nu** — dus de enige die reageert op de staat van de repository. Hij
trekt een gezicht als er iets is, en blijft de rest van de tijd neutraal.

![De avatar in de titelbalk met zijn kwade gezicht](../../screenshots/avatar-mood.webp)

Waar hij op reageert, het ergste eerst: bestanden die in conflict bleven staan;
een merge, rebase, cherry-pick of revert waarvan git nooit is verteld hoe hij moet
aflopen; een losgekoppelde HEAD — geschrokken als er niet-vastgelegd werk onder
ligt, anders alleen twijfelend; commits die zich opstapelen zonder push, of zonder
pull van de remote; wijzigingen die zich opstapelen zonder commit; een stashlade
die niemand opent; en een repository waar in een maand niets is geland.

Het ergste wint: een repository met conflicten *én* veertig ongepushte commits
draagt de conflicten. Beweeg over de avatar en de tooltip zegt precies wat het
gezicht veroorzaakte — een plaatje dat zonder genoemde reden verandert is een
raadsel, geen signaal. De tooltip is wat je leest; het gezicht laat je alleen
kijken.

De drempels zijn opzettelijk hoog. Een gezicht dat bij één ongepushte commit
bezorgd wordt, is voorgoed bezorgd, en een permanent signaal is een signaal dat je
leert te negeren. Een branch zonder upstream blijft neutraal in plaats van
tevreden: "in sync" is geen bewering die je kunt doen over een branch die niemand
heeft gepusht.

**Dit is decoratie, geen instrumentatie.** De statusbalk draagt de echte aantallen,
en die moet je vertrouwen. Het gezicht zegt alleen *er is iets*, met één blik.

### Beweging

De avatar in de titelbalk ademt en knippert van zichzelf. Zet het uit bij
**Instellingen → Thema's → Graaf → Profielavatar animeren** — de uitdrukking volgt
nog steeds de repository, hij beweegt alleen niet meer. Beweging wordt ook
automatisch overgeslagen als je systeem om verminderde beweging vraagt.

Alleen deze ene avatar animeert. Een geanimeerde avatar moet als levende SVG worden
getekend in plaats van als gecachte afbeelding, wat prima is voor één en verspilling
voor de honderden die een scrollende graaf tekent.

## De opzoeking uitzetten

**Instellingen → Thema's → Graaf → Avatars weergeven.**

Uit betekent:

- geen enkel verzoek aan `gravatar.com`, nooit — niet uitgesteld, niet gecacht en
  opnieuw geprobeerd;
- avatars verschijnen nog steeds, allemaal lokaal gegenereerd.

Dit is dus een privacyschakelaar, geen "verberg de plaatjes". Er is geen instelling
die avatars helemaal weghaalt.

## De grenzen

- **Een Gravatar-opzoeking vertelt gravatar.com dat naar dit e-mailadres is
  gekeken.** De hash is geen geheim: wie een kandidaat-adres heeft, kan het hashen en
  vergelijken. Als de auteurslijst van een repository iets is wat je liever niet aan
  een derde geeft, zet de opzoeking uit voordat je hem opent.
- **Alleen Gravatar.** Avatars die je op GitHub, GitLab of Bitbucket hebt geüpload
  worden niet gelezen — dat vraagt per auteur een geauthenticeerde API-aanroep bij de
  host, veel netwerk voor een versiering.
- **Geen overrides.** Je kunt geen gekozen plaatje aan een auteur vastpinnen en de
  gegenereerde stijl niet wisselen. De avatar is een functie van het e-mailadres en
  van niets anders.
- **Een Gravatar-foto heeft geen uitdrukking.** Heeft het e-mailadres van je profiel
  er een, dan toont de titelbalk de foto en geen gezicht — een foto kan geen gezicht
  naar je trekken. Zet de opzoeking uit als je liever de expressieve blob hebt.
- **Het gezicht volgt alleen de actieve repository.** Op een tab die geen repository
  is, is er niets om op te reageren, dus blijft hij neutraal.
- **Eén lezing tegelijk.** Het gezicht toont het ene ergste dat het vond, dus een
  repository kan op meerdere manieren rommelig zijn en toch één uitdrukking dragen.
  Het is geen statuslijst — dat is het werk van de statusbalk en de tooltip.
- **Klein is klein.** In de auteurskolom van de graaf is de avatar 16px, wat kleur en
  silhouet meedraagt maar geen detail. De commitdetails tekenen de auteur op 38px, en
  daar zie je het gezicht echt.

**Zie ook:** [Thema's & vormgeving](themes.md) · [De commitgraaf](graph.md) ·
[Auteursattributen](attributes.md) · [Profielen](profiles.md)
