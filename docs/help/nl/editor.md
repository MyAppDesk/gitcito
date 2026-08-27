---
title: Externe editor
category: Werkomgeving & tools
order: 95
summary: Stuur een repository, een bestand of één regel code naar de editor waar je echt in schrijft.
keywords: editor vscode code cursor windsurf zed sublime jetbrains intellij webstorm xcode openen in editor regel kolom eigen commando argv
---

# Externe editor

Een Git-client is waar je code leest; het is zelden waar je hem repareert. De
kloof tussen iets opmerken in een diff en de cursor op die regel hebben in je
editor is een bestandszoekopdracht en een scroll — elke keer weer.

Wijs Gitcito één keer naar je editor en die kloof sluit: rechtsklik een regel in
de bestands- of blameweergave en hij opent daar, op die regel.

## Er een kiezen

**Instellingen → Algemeen → Externe editor.** De keuzelijst toont de editors die
Gitcito op deze machine kan vinden — het zoekt eerst naar het commando van elke
editor en daarna, op macOS, naar de applicatiebundel in `/Applications` en
`~/Applications`. De scan draait elke keer dat je de instellingen opent, dus een
editor die je vijf minuten geleden installeerde verschijnt zonder herstart.

Standaard herkend:

| Editor | Commando waar het naar zoekt |
|--------|------------------------------|
| Visual Studio Code | `code`, `code-insiders` |
| Cursor | `cursor` |
| Windsurf | `windsurf` |
| Zed | `zed` |
| Sublime Text | `subl` |
| JetBrains-IDE's | `idea`, `webstorm`, `pycharm`, `rustrover`, `goland`, `clion`, `rider`, `phpstorm` |
| Xcode | `xed` |

## De grens die je moet kennen

**Naar een regel springen vraagt het commando van de editor, niet zijn icoon.**
Een macOS-`.app`-bundel wordt gestart via `open`, dat een pad accepteert en verder
niets — dus een editor die alleen als bundel gevonden is opent het bestand
bovenaan, en Gitcito zegt dat onder de keuzelijst in plaats van te doen alsof.

De oplossing ligt aan de kant van de editor: *Shell Command: Install 'code'
command in PATH* van VS Code, de `subl`-symlink van Sublime, *Toolbox →
Settings → Shell scripts* van JetBrains. Zodra het commando bestaat, kies je de
editor opnieuw en werkt de sprong naar de regel.

## Waar de acties opduiken

| Plek | Wat het opent |
|------|---------------|
| Repo-tabblad, repo in de zijbalk, statusbalk | De repositorymap |
| Bestandsboom, commitbestanden, stashbestanden, de commitopsteller | Dat bestand |
| Het icoon aan het eind van een rij in de bestandsboom | Dat bestand, met één klik |
| Rechtsklik een regel in de **bestandsweergave** | Het bestand, op die regel |
| Rechtsklik een regel in de **blameweergave** | Het bestand, op die regel |
| Een `.xcodeproj` of ander pakket in de bestandsboom | Het pakket, in de app die het opent |

Regelacties verschijnen alleen waar het regelnummer nog iets betekent: een
bestand getoond bij een oude commit, of een blame teruggespoeld naar een eerdere
revisie, heeft regels die niet meer overeenkomen met wat er op schijf staat, dus
biedt Gitcito daar geen sprong aan in plaats van je naar de verkeerde plek te
sturen.

## Xcode-projecten en andere pakketten

`MyApp.xcodeproj` is een map. Git weet dat, en de bestandsboom wist het ook —
tot het ging storen: hem uitklappen om `project.pbxproj`, `project.xcworkspace`
en onder `xcuserdata` een map per ontwikkelaar te vinden, is drie klikken ruis
voor iets dat je toch nooit met de hand ging bewerken.

Deze krijgen nu een pakket-icoon en **een klik op de rij opent het pakket**,
zoals dubbelklikken in de Finder doet. Het pijltje blijft, dus de ene keer dat je
`project.pbxproj` wél nodig hebt — bijna altijd een merge-conflict — duik je er
net als vroeger in.

Herkend: `.xcodeproj`, `.xcworkspace`, `.xcframework`, `.framework`, `.app`,
`.appex`, `.dSYM`, `.playground`, `.xcuserdatad`.

**Niet** herkend, met opzet: `.xcassets` en `.lproj`. Ook pakketten, maar mensen
bewerken de bestanden erin, dus dichtklappen kost meer dan het oplevert.

### De grenzen

**Het pakket opent via het systeem, niet via je editor.** Een `.xcodeproj` die je
aan een teksteditor geeft, opent als een map vol property lists — niet wat
iemand wilde die erop klikte. Gitcito geeft het daarom aan wat het
besturingssysteem eraan koppelt, op een Mac met Xcode dus aan Xcode. Je
editorkeuze blijft ongemoeid en geldt nog steeds voor elk gewoon bestand.

**Het is een naamconventie, geen bestandssysteem-vlag.** Gitcito kijkt naar de
extensie, dus een map die je toevallig `notes.app` noemde klapt ook dicht, en op
Linux of Windows — waar dit gewone mappen zijn — opent een klik de
bestandsbeheerder in plaats van een IDE.

## Een eigen commando

Kies **Eigen commando** voor alles wat niet in de tabel staat — een
wrapper-script, een starter voor remote development, een terminaleditor gestart
via je eigen shim.

| Veld | Betekenis |
|------|-----------|
| Commando | Het uitvoerbare bestand. Geen shell, dus geen `&&`, pipes of globs. |
| Naam | Hoe de menu-items het noemen. |
| Argumenten voor een bestand | argv-sjabloon, bijv. `-g {path}:{line}:{col}` |
| Argumenten voor een map | argv-sjabloon, meestal enkel `{path}` |

Sjablonen worden op spaties gesplitst en elk token wordt één keer vervangen — een
pad met een spatie blijft één argument, en er wordt achteraf niets opnieuw
geparseerd, dus een bestandsnaam kan nooit in syntaxis veranderen. Vier
plaatshouders: `{path}`, `{line}`, `{col}`, `{repo}`.

Een plaatshouder zonder waarde neemt zijn vlag mee: `--line {line} {path}`
zonder regel wordt enkel het pad, nooit een bungelende `--line` die de
bestandsnaam als argument zou opeten. Een sjabloon zonder `{line}` betekent
simpelweg dat Gitcito voor die editor geen regelnauwkeurige acties aanbiedt.

## Wat dit niet is

Dit is niet de instelling ["Openen met"-app](repo-settings.md), die de
systeemkiezer toont en één app onthoudt voor het openen van *van alles* — een
afbeelding, een PDF, een map in Finder. De editor is de specifiekere van de twee,
dus waar beide ingesteld zijn wint de editor bij het rij-eindicoon in de
bestandsboom; beide blijven in het rechtsklikmenu staan.

Gitcito start je editor nooit uit zichzelf, en Gitcito sluiten sluit hem nooit:
de editor wordt losgekoppeld gestart, als een eigen proces.
