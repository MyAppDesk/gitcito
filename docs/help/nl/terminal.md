---
title: Geïntegreerde terminal
category: Werkomgeving & tools
order: 90
summary: Een echte PTY onder de repo gedokt, met tabbladen per repository.
keywords: terminal shell pty xterm console tabbladen gedokt
---

# Geïntegreerde terminal

Een echte PTY (xterm + node-pty), geen commando-uitvoerder. Jouw shell, jouw
prompt, jouw aliassen.

![De geïntegreerde terminal](../../screenshots/terminal.webp)

- **Meerdere tabbladen per repository**, elk startend in de map van die
  repository.
- Dok hem **onder** de grafiek of als een **rechterkolom**; het paneel onthoudt
  zijn grootte.
- De zichtbaarheid van de terminal is per repository: naar een tabblad wisselen
  dat er nooit een opende houdt hem dicht.
- Tabbladen noemen zichzelf naar wat erin draait.
- De terminallijst inklappen krimpt hem tot een **rail**: één icoon per terminal
  (gesplitste terminals tonen een minipaneelkaart), klik om te wisselen,
  rechtsklik voor het gebruikelijke menu met hernoemen/splitsen/afsluiten.
- **Sleep de ene terminal op de andere** in de lijst om ze samen te voegen tot
  een gesplitste groep. Elke terminal houdt zijn naam als paneel; de groep
  krijgt een verse genummerde naam.

![Twee panelen naast elkaar gesplitst in één terminalgroep](../../screenshots/terminal-split.webp)

## Toetsen

| Toetsen | Doet |
|---|---|
| <kbd>⌃`</kbd> | Terminal tonen of verbergen — de fysieke Control-toets, op elk platform |
| <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> | Nieuwe terminal, zolang de terminal focus heeft |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | Sluit de actieve terminal; de laatste sluiten verbergt het paneel |
| <kbd>Ctrl+Shift+C</kbd> | Kopieert de selectie; een kale <kbd>Ctrl+C</kbd> kopieert ook zolang er een selectie is, en blijft SIGINT als die er niet is |
| <kbd>Ctrl+V</kbd> / <kbd>Ctrl+Shift+V</kbd> / <kbd>Shift+Ins</kbd> | Plakken vanaf het klembord |
| Rechtsklik | Kopieert de selectie, of plakt als er niets geselecteerd is |

De eerste twee gelden bewust alleen in de terminal: daarbuiten openen en sluiten
ze nog steeds [werkruimtetabbladen](workspaces.md). Op macOS werken
Kopiëren/Plakken in het menu Wijzig op dezelfde manier.

## Scriptsuggesties

Typ `npm run ` (of `pnpm`, `yarn`, `bun run`) en bij de cursor verschijnt een
lijst met de scripts van het project, gefilterd terwijl je typt: `npm run loc`
vindt `LOCAL_SERVER`. Elke naam toont het commando dat hij uitvoert.

| Toets | Doet |
|-------|------|
| **Tab** | Vult het geselecteerde script aan |
| **↑ / ↓** | Een ander kiezen |
| **Esc** | Sluit de lijst tot je weer typt |

Andere commando’s krijgen een eigen lijst:

| Getypt | Toont | Gelezen uit |
|------|-----|-----------|
| `composer run ` | Composer-scripts | de dichtstbijzijnde `composer.json` |
| `make ` | Makefile-targets, met de `## tekst` na een target als beschrijving | de `Makefile` van de huidige map, zoals `make` hem leest |
| `git checkout `, `switch`, `merge`, `rebase` | Lokale branches, daarna externe op hun korte naam | de repository waarin de shell staat |

Een Makefile-target opgebouwd uit variabelen of een patroon (`%.o`) staat er niet
in, en `git checkout -b` krijgt geen lijst: het geeft een nieuwe branch een naam.

De scripts komen uit de `package.json` die het dichtst bij de **huidige** map van
de shell ligt, dus na `cd frontend` krijg je die van de frontend. Namen die
beginnen met wat je typte komen eerst, daarna namen die het bevatten.

De lijst kent alleen de toetsen die je sinds de laatste Enter typte. Een commando
terughalen met ↑, de cursor verplaatsen of de eigen Tab-aanvulling van de shell
gebruiken verandert de regel buiten haar zicht; dan blijft ze stil tot de
volgende Enter, in plaats van het verkeerde aan te vullen. Op Windows is de
huidige map niet te lezen, dus volgt de lijst de map waarin de terminal geopend
is.

## Je PATH

De shell start als **login-shell**, net als in Terminal.app of iTerm, dus
`~/.zprofile`, `~/.zlogin` en `~/.bash_profile` worden allemaal uitgevoerd. Dat
telt, want versiebeheerders en `brew shellenv` zetten zichzelf daar meestal
neer — een tool als `fvm`, `nvm` of `pyenv` die in je terminal werkt, werkt hier
ook.

Gitcito vraagt bij het opstarten ook je login-shell om het echte `PATH` en mengt
dat door alles wat het start, want een GUI-app die vanuit het Dock opent erft
bijna niets. Wordt een commando alsnog niet gevonden, controleer dan of het in
het `PATH` van een login-shell staat en niet alleen in dat van een interactieve
shell.

Wat je hier draait is onzichtbaar voor de eigen vergrendeling van Gitcito, dus
een lange `git rebase` die je met de hand typt en een klik in de UI kunnen alsnog
botsen — de app ververst vanaf schijf wanneer de terminal iets verandert.

## Shell, thema & Oh My Posh

Op Windows kiest Instellingen → Indeling de shell die elke nieuwe terminal start
— PowerShell, PowerShell Core (`pwsh`), `cmd`, Git Bash, WSL of een eigen
uitvoerbaar bestand. Het uiterlijk van de terminal (thema, lettergrootte,
lettertypefamilie) staat onder Instellingen → Thema's → Terminalthema en geldt
direct voor elke sessie.

Is [Oh My Posh](https://ohmyposh.dev) geïnstalleerd, dan toont de sectie ook elke
`*.omp.json` onder `%POSH_THEMES_PATH%` met een live voorbeeld — een keuze wordt
als `POSH_THEME` aan nieuwe terminals meegegeven, zodat een kale
`oh-my-posh init pwsh` in je profiel hem oppikt. Een eigen `.omp.json`-pad werkt
ook; het veld op Standaard laten houdt wat je shell/profiel of een globale
`POSH_THEME` al instelt. Lopende sessies houden hun thema — sluit een terminal en
open hem opnieuw om een nieuw thema toe te passen. Promptsymbolen hebben een Nerd
Font nodig in de lettertypefamilie van de terminal (bijv.
`CaskaydiaMono Nerd Font`), anders verschijnen iconen als blokjes.

Over snelheid: Oh My Posh start zijn programma eenmaal per prompt — op Windows
zo'n 100–200 ms, meer bij thema's met een git-segment in een grote repository —
merkbaar als een korte pauze voor elke prompt, niet als traagheid van Gitcito.
Thema's zonder git-segment zijn het snelst. De voorspellingsstijl van PowerShell
telt ook: `-PredictionViewStyle InlineView` hertekent per toets een klein gebied,
`ListView` een heel blok.

**Zie ook:** [Uitvoeren & debuggen](launch.md) · [Hooks](hooks.md)
