---
title: SSH-sleutels
category: Synchroniseren & meerdere repo's
order: 57
summary: Waarom je token niets uitricht bij een git@-remote, en hoe je ziet welke sleutel faalt.
keywords: ssh sleutel key keys agent ssh-add ssh-keygen ed25519 publickey permission denied vingerafdruk fingerprint wachtwoordzin passphrase uploaden github known_hosts
---

# SSH-sleutels

**Instellingen → Beveiliging → SSH-sleutels.**

## Waarom dit naast de tokens staat

Gitcito authenticeert twee verschillende dingen, en mensen nemen begrijpelijk aan
dat het er één is:

| | Geauthenticeerd door |
|---|---|
| De **host-API** — repo's, PR's, issues, CI-checks | Je [token](hosting.md) |
| Git-transport over `https://` | Je token, in de URL geïnjecteerd |
| Git-transport over **`git@…`** | **Je SSH-sleutel, via de ssh van het systeem** |

Een remote als `git@github.com:me/api.git` raakt het token nooit aan. Git geeft
de verbinding door aan `ssh`, dat nog nooit van een personal access token gehoord
heeft. Dat is geen randgeval — het is wat je krijgt wanneer een collega de repo
opzette, wanneer een `.gitmodules` `git@`-URL's gebruikt, wanneer je bedrijf
HTTPS-authenticatie uitzet, of wanneer de host een zelfbeheerde GitLab is.

Gaat dat mis, dan zegt ssh `Permission denied (publickey)` en verder niets.
Technisch waar, nutteloos als advies.

![Elke sleutel in ~/.ssh met zijn type, vingerafdruk en of de agent hem vasthoudt](../../screenshots/ssh-keys.webp)

## Wat de sectie je vertelt

Elke sleutel die in `~/.ssh` gevonden wordt toont zijn type, grootte,
vingerafdruk en commentaar, plus het ene feit dat de meeste plotselinge storingen
verklaart:

**in agent** / **niet in agent.** Een sleutel die de agent niet vasthoudt kan
niets authenticeren, en de agent vergeet zijn inhoud bij een herstart tenzij het
besturingssysteem anders is opgedragen. "Gisteren werkte het nog" is meestal dit.

## Wat je hier kunt doen

| Actie | Wat het draait |
|--------|----------------|
| **Publieke sleutel kopiëren** | Zet de `.pub`-regel op het klembord, klaar om in elke host te plakken |
| **Aan agent toevoegen** | `ssh-add` (met `--apple-use-keychain` op macOS, zodat hij een herstart overleeft) |
| **Uploaden naar GitHub** | `POST /user/keys` met het token van dit profiel |
| **Sleutel genereren** | `ssh-keygen -t ed25519`, becommentarieerd met je git-e-mailadres |
| **Verbinding testen** | `ssh -T git@<host>`, vertaald naar een zin |

**Verbinding testen** bestaat omdat het eigen antwoord van ssh misleidend is:
GitHub authenticeert je met succes en sluit *daarna* af met een foutcode, omdat
het geen shell aanbiedt. Gitcito leest het bericht in plaats van de exitcode, en
toont de ruwe uitvoer eronder zodat je zijn lezing kunt controleren.

## De grenzen, ronduit gezegd

- **Uploaden kan alleen naar GitHub.** GitLab, Bitbucket en Azure DevOps krijgen
  *Publieke sleutel kopiëren* en een link rechtstreeks naar hun
  sleutelinstellingen. Sleutels registreren bij de andere drie is niet
  geïmplementeerd, en de knop doet ook niet alsof.
- **Genereren overschrijft nooit.** Een naam die al in `~/.ssh` voorkomt wordt
  geweigerd. Een privésleutel overschrijven trekt in stilte je toegang in tot
  alles wat hem vertrouwt, en geen enkel bevestigingsvenster maakt dat
  herstelbaar.
- **Wachtwoordzinnen worden niet door Gitcito bewaard.** Je typt er een bij het
  genereren of bij het toevoegen aan de agent; hij wordt doorgegeven aan
  `ssh-keygen`/`ssh-add` en losgelaten. Hem over herstarts heen bewaren is het
  werk van de OS-sleutelhanger, via `ssh-add`.
- **Geen bewerking van `~/.ssh/config`**, geen host-aliassen, geen sleutelkeuze
  per repo. Die wonen in je ssh-config, en Gitcito laat dat bestand met rust.

## Wat je machine nooit verlaat

**Gitcito leest, toont of verstuurt nooit een privésleutel.** De sectie somt
publieke helften en vingerafdrukken op. Het enige dat ooit ergens heen gaat is de
publieke sleutel waarop jij uitdrukkelijk **Uploaden** drukt — en die gaat naar
GitHub, onder je eigen token, na een bevestiging die de vingerafdruk noemt.

Zie ook: [Beveiliging & geheimen](security.md) · [Hosting & pull requests](hosting.md)
