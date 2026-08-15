---
title: Credential helper
category: Beveiliging
order: 73
summary: De eigen wachtwoordkluis van git — de derde — en waarom https het steeds opnieuw vraagt.
keywords: credential helper wachtwoord password https vraagt opnieuw osxkeychain wincred manager libsecret store cache git-credentials platte tekst plaintext vergeten ingetrokken revoked token 401
---

# Credential helper

Gitcito houdt drie verschillende soorten geheim vast, en mensen nemen begrijpelijk
aan dat het één ding is:

| | Bewaard door |
|---|---|
| API-tokens van hosts — PR's, issues, CI-checks | Gitcito, in je [OS-sleutelhanger](security.md) |
| `git@…`-transport | Je [SSH-sleutel](ssh-keys.md), via de ssh-agent van het systeem |
| **`https://`-transport** | **De eigen credential helper van git** |

De derde is voor niemand een feature tot hij misgaat, en dan levert hij de twee
meest gehoorde klachten in git op: *waarom vraagt hij het me weer?* en *waarom
stuurt hij nog steeds het token dat ik heb ingetrokken?*

`⌘K` → **Credential helper**.

![De ingestelde helper, regels per host en de waarschuwing over het platte-tekstbestand](../../screenshots/credentials.webp)

## Waar je naar kijkt

Elke ingestelde `credential.helper`, in de scope waar hij vandaan komt —
`system`, `global`, en dan deze repository. **Helpers stapelen**: git vraagt ze
één voor één, en een helper op repositoryniveau vervangt een globale niet.

Elk wordt tegen je machine gecontroleerd:

| Vlag | Betekent |
|------|----------|
| **klaar** | Het helperprogramma bestaat en zal draaien |
| **niet geïnstalleerd** | Ingesteld, maar het programma ontbreekt — elke vraag valt door naar opnieuw intypen |
| **wachtwoorden in een plat bestand** | De `store`-helper (zie hieronder) |

**Regels voor specifieke hosts** somt de `credential.<url>.*`-secties op. Die
winnen van de gewone instelling voor de URL's waar ze op passen, en zijn meestal
het antwoord op "waarom gedraagt juist deze host zich anders".

## Er een kiezen

| Helper | Waar het wachtwoord terechtkomt |
|--------|--------------------------------|
| `osxkeychain` | macOS Keychain — versleuteld, per gebruiker |
| `manager` | Git Credential Manager (Windows, platformonafhankelijk) |
| `wincred` | Windows Credential Manager |
| `libsecret` | De Linux secret service (GNOME Keyring, KWallet) |
| `cache` | Geheugen, 15 minuten lang. Niets op schijf |
| `store` | **Een plat bestand in je thuismap. Onversleuteld** |

Gitcito biedt aan wat er werkelijk op deze machine staat, markeert degene die bij
je besturingssysteem past, en maakt de rest grijs.

**Scope doet ertoe.** *Voor elke repository* schrijft naar je globale config, en
dat is bijna altijd wat je wilt; *alleen voor deze repository* is voor die ene
rare repo die tegen iets anders authenticeert.

## De `store`-helper, en `~/.git-credentials`

`store` schrijft regels van de vorm `https://user:password@host` naar
`~/.git-credentials`, in platte tekst, zonder enige vorm van versleuteling. Alles
wat als jou draait kan het lezen: een script, de postinstall van een dependency,
wat dan ook.

Bestaat dat bestand, dan zegt deze pagina dat en telt hij de regels. Hij toont ze
nooit — het aantal is het hele punt, en de inhoud lezen om die te tonen zou
dezelfde fout zijn.

Vind je er een die je niet bedoeld had: kies hier een echte helper, verwijder dan
het bestand en authenticeer één keer opnieuw.

## Een opgeslagen credential vergeten

Wordt een token ingetrokken of geroteerd, dan blijft de helper de oude aanreiken
en faalt elke push met een 401 die niets bij naam noemt. **Vergeten** vraagt de
ingestelde helper zijn regel voor die host te wissen — `git credential reject`,
de eigen gedocumenteerde route van git.

Onderweg wordt er niets gelezen: Gitcito roept nooit `git credential fill` aan,
het commando dat een levend wachtwoord naar standaarduitvoer zou printen.

De volgende push vraagt het je één keer, en de helper bewaart het nieuwe
antwoord.

## Grenzen die je moet kennen

- **Dit is de kluis van git, niet van Gitcito.** Hem veranderen verandert ook wat
  je terminal doet — wat de bedoeling is, en goed om te weten voor je hem
  verandert.
- **Helpers op systeemniveau worden getoond, niet bewerkt.** Die staan in een
  config die alleen een beheerder kan schrijven.
- **Gitcito kan niet opsommen wat een helper bevat.** Geen enkele credential-API
  onthult dat zonder de geheimen te overhandigen, dus het venster rapporteert de
  configuratie en wist op verzoek, en verder niets.
- **Een token dat je aan Gitcito gaf staat los.** De een intrekken raakt de ander
  niet; zie [beveiliging](security.md) voor de kant van de sleutelhanger.

Zie ook: [Beveiliging](security.md) · [SSH-sleutels](ssh-keys.md) ·
[Synchroniseren](syncing.md)
