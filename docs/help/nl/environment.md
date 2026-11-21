---
title: Omgevingscontrole
category: Begin hier
order: 6
summary: Waar Gitcito buiten de eigen installatie op leunt — git, LFS, de native terminal, de credential helper van git, de GitHub CLI en bestandsbewaking — op één plek gecontroleerd.
keywords: omgeving environment dokter diagnose controle git versie lfs node-pty terminal basis-shell credential helper store gh github cli scopes workflow inotify max_user_watches
---

# Omgevingscontrole

Sommige fouten hebben helemaal niets met de repository te maken. Ze komen van de
machine: een git die te oud is voor aanmelden via profielen, een terminal die
stilletjes terugviel naar de basismodus, een aanmelding van de GitHub CLI die
geen workflowbestanden mag pushen. Elk daarvan duikt later op als een vage fout,
midden in iets anders. **Instellingen → Omgeving** (ook *Settings: Environment*
in het opdrachtenpalet) controleert ze vooraf.

De [repository-dokter](repo-settings.md) beantwoordt een andere vraag: of *deze
repository* hier kan bouwen, volgens wat zijn `.gitcito.json` vraagt. De
omgevingscontrole gaat over de app zelf en is voor elke repository hetzelfde.

![Omgevingscontroles in Instellingen](../../screenshots/settings-environment.webp)

## Wat er gecontroleerd wordt

| Rij | Groen betekent | Geel of rood betekent |
|-----|----------------|-----------------------|
| **Git** | git 2.31 of nieuwer staat in het `PATH` | Ouder dan 2.31: het account van een [profiel](profiles.md) kan zich niet aanmelden voor fetch en push. Ontbreekt: niets werkt tot git geïnstalleerd is |
| **Git LFS** | `git lfs` is geïnstalleerd | Niet geïnstalleerd. Alleen repositories die bestanden in LFS bewaren hebben het nodig |
| **Terminal** | De native terminal is geladen | De [terminal](terminal.md) draait in basismodus: geen kleuren, geen formaat wijzigen, geen schermvullende programma's |
| **Credential helper** | git heeft een helper voor HTTPS-wachtwoorden — globaal of voor bepaalde hosts (wat `gh auth setup-git` instelt) | Geen helper, dus git buiten Gitcito vraagt elke keer. Of `store`, dat ze als platte tekst bewaart. Zie [Credential helper](credentials.md) |
| **GitHub CLI** | `gh` is aangemeld met de scope `workflow` | Aangemeld zonder: GitHub weigert elke push die `.github/workflows` wijzigt |
| **Bestandsbewaking** (Linux) | De inotify-limiet is minstens 65.536 | Een lagere limiet raakt op met een paar grote open repositories, en nieuwe mappen verversen de status niet meer |

Een rij die niet van toepassing is, valt weg: de GitHub CLI als die niet
geïnstalleerd of niet aangemeld is, en bestandsbewaking op macOS en Windows.

## Oplossen wat ze vindt

Waar een oplossing bestaat, toont de rij die als commando met een kopieerknop.
Zo voegt `gh auth refresh -h github.com -s workflow` de ontbrekende scope toe, en
verhoogt een `sysctl`-regel de inotify-limiet. **De pagina voert zelf nooit iets
uit.** Sommige oplossingen hebben `sudo` nodig of wijzigen globale configuratie,
en die lees je zelf voordat je ze uitvoert. Druk daarna op **Opnieuw
controleren**.

## Grenzen

- Ze controleert wat de app vanuit haar eigen proces ziet. Een shellprofiel dat
  het `PATH` alleen in je terminal wijzigt, kan de twee laten verschillen.
- De rij van de GitHub CLI toont de eigen aanmelding van `gh`, niet de accounts
  die onder **Instellingen → Integraties** gekoppeld zijn. Dat zijn aparte
  aanmeldingen. Een ontbrekende `workflow`-scope daar merk je in plaats daarvan als
  een geweigerde push.
- Ze meldt wat geïnstalleerd is. Ze installeert of werkt niets bij.
