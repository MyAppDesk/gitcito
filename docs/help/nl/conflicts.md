---
title: Conflicten oplossen
category: Werken met wijzigingen
order: 32
summary: Een oplosser met drie panelen die je vertelt welke kant welke is.
keywords: conflict oplosser resolver merge conflicten ours theirs oplossen markers three-way rerere reuse recorded resolution onthouden herhalen
---

# Conflicten oplossen

Wanneer een merge, rebase, cherry-pick of revert stilvalt, vertelt een banner je
**wat** er stilviel en **tussen wat** — "`feature/x` mergen in `main`", niet
alleen "conflict".

![De conflictoplosser](../../screenshots/conflict-resolver.webp)

## Waarom dit conflicteert

**Waarom dit conflicteert** in de kop somt per kant de commits op die dit
bestand hebben aangeraakt sinds de branches uiteengingen — `git log --merge`, dat
git al eeuwig meelevert en dat niemand vindt.

![De commits van elke kant die het conflicterende bestand aanraakten](../../screenshots/conflict-why.webp)

Markers zeggen wat er botst. Dit zegt wie het veranderde en waarom, en dat is
meestal wat de oplossing werkelijk bepaalt. Staat er niets, dan heeft geen van
beide kanten een wijziging aan precies dit pad gecommit — de botsing kwam van een
hernoeming of een verplaatsing.

## De drie panelen

| Paneel | Is |
|---|---|
| Links | **Ours** — de kant waar je op zat, gelabeld met zijn commit |
| Rechts | **Theirs** — de kant die binnenkomt, gelabeld met zijn commit |
| Midden | De **uitvoer**: bewerkbaar, met regelnummers, en wat er daadwerkelijk gestaged wordt |

Alle drie de panelen zijn in grootte aan te passen, en de kop van de uitvoer
draagt twee weergaveschakelaars:

| Schakelaar | Wat het doet |
|---|---|
| **Terugloop** | Laat lange regels teruglopen binnen de panelen A en B in plaats van ze te scrollen. Het uitvoerpaneel houdt één rij per regel — zijn zijmarkeringen hangen daarvan af — dus dat scrolt altijd |
| **Gekoppeld** | Scrolt A, B en de uitvoer samen, verticaal en zijwaarts. Hun regelaantallen verschillen, dus de verticale positie wordt naar verhouding gelijkgehouden |

Terugloop staat aanvankelijk uit, Gekoppeld aanvankelijk aan, en beide
onthouden hun stand.

## Navigeren

Een bestand openen zet je op zijn **eerste conflict**, niet bovenaan het
bestand. De pijlen ⌃ / ⌄ in de kop van de uitvoer — of <kbd>Alt+↑</kbd> /
<kbd>Alt+↓</kbd> — stappen door de rest en scrollen alle drie de panelen naar
elk conflict.

## Kiezen

Per **regel**, per **blok**, of de **hele kant** in één keer — en je kunt beide
kanten van een blok nemen wanneer het antwoord "allebei houden" is. Een navigator
loodst je conflict voor conflict langs wat er nog over is, zodat je onmogelijk
per ongeluk een marker laat staan.

## AI-hulp

Met AI ingeschakeld stelt **Oplossen met AI** een merge voor in het
uitvoerpaneel. Het past nooit iets uit zichzelf toe: jij leest het, bewerkt het
en staget het. Zie [AI-functies](ai.md).

## Xcode-projectbestanden

`project.pbxproj` botst vaker dan welk ander bestand in een iOS-repository ook,
en bijna nooit omdat iemand het oneens was. Het is één platte woordenlijst van
objecten met 24-cijferige hex-ids, dus één bestand toevoegen schrijft vier
regels weg: een `PBXBuildFile`, een `PBXFileReference`, een regel in de
`children` van de bijbehorende groep en een regel in de buildfase van het
target. Twee mensen die elk één bestand toevoegen schrijven acht regels die op
dezelfde handvol regels belanden. Git ziet een botsing; er valt niets op te
lossen.

Is het conflicterende bestand een `project.pbxproj`, dan leest de resolver alle
drie de versies als projecten in plaats van als tekst en biedt aan om **op
structuur samen te voegen**: objecten koppelen op id, elke toevoeging van beide
kanten overnemen, de `children`- en `files`-arrays verenigen, en stoppen bij wat
echt uiteenliep. De balk boven de panelen zegt wat elke kant toevoegde en wat er
— als er iets is — voor jou overblijft.

Net als het AI-voorstel landt het in het uitvoerpaneel en zet het niets klaar.
Je leest het voor je opslaat.

![De balk voor samenvoegen op structuur boven de conflictpanelen, bij een Xcode-projectbestand](../../screenshots/conflict-pbxproj.webp)

### Wat het weigert te doen

**Het gokt nooit naar een instelling die jullie allebei verzetten.** Zet jij
`MARKETING_VERSION` op `1.1` en zij op `2.0`, dan is dat een beslissing, en die
staat met naam in de balk — de instelling, jouw waarde, die van hen — in plaats
van achter je rug om opgelost te worden. Een object dat het niet kon beslechten
houdt *jouw* versie precies zoals hij was, zodat een half toegepaste
samenvoeging nooit de schijf haalt.

**Het weigert het hele bestand als één van de drie versies niet parseert.** Een
`project.pbxproj` die Xcode niet kan openen kost meer dan een handmatige
samenvoeging, dus alles wat het niet met zekerheid kan lezen blijft een gewoon
tekstconflict, en het zegt dat ook.

**Het herkent geen twee ids die voor verschillende objecten zijn aangemaakt.**
Zeldzaam, omdat Xcode ze willekeurig kiest — maar als het gebeurt zou elke kant
kiezen stilletjes iemands bestand laten vallen, dus wordt het gemeld in plaats
van samengevoegd.

### Niet `merge=union`

Het middel dat hiervoor rondgaat is `*.pbxproj merge=union` in
[`.gitattributes`](attributes.md). Doe het niet. Union werkt zolang de enige
wijzigingen onafhankelijke toevoegingen zijn, en zodra twee mensen dezelfde
buildinstelling bewerken zet het beide regels neer en levert het een bestand op
dat Xcode weigert te openen — precies op het moment dat je de diff het minst
zorgvuldig leest. Samenvoegen op structuur geeft hetzelfde gemak zonder die
misser.

## Lockfiles

`Podfile.lock`, `Package.resolved`, `yarn.lock` en hun neven leggen een
afhankelijkhedengrafiek vast die iemands resolver al heeft opgelost. De helft
van de ene oplossing aan de helft van de andere genaaid is een grafiek die
niemand oploste: hij installeert misschien niet, en als hij het wel doet,
installeert hij iets dat geen van beide branches heeft getest.

Dus als het conflicterende bestand een lockfile is, noemt de balk het gereedschap
dat erover gaat, biedt daar meteen **De onze houden** en **De hunne houden**, en
geeft je het commando dat hem daarna opnieuw genereert. Een kant kiezen is hier
geen compromis — het is de hele methode, en het opnieuw genereren maakt het juist.

![De lockfile-balk boven de conflictpanelen](../../screenshots/conflict-lockfile.webp)

De drie panelen blijven beschikbaar, want af en toe wil je wel degelijk lezen wat
er veranderde: een checksum die je herkent, een versie die je verwachtte. Ze met
de hand bewerken is precies waar dit je vanaf probeert te praten.

## Ze om te beginnen vermijden

De [conflictradar](conflict-radar.md) vertelt je welke branches gaan
conflicteren voordat je er ook maar één merget.

## Git het laten onthouden (rerere)

Rebase een langlevende branch en je komt elke keer hetzelfde conflict tegen.
`rerere` — *reuse recorded resolution* — is het antwoord van git: het onthoudt
hoe jij een conflict beslechtte en speelt dat antwoord opnieuw af als het
identieke conflict weer opduikt.

**Instellingen → Algemeen → Conflictoplossingen onthouden.** Het schrijft
`rerere.enabled` naar je globale git-config, dus de commandoregel gedraagt zich
net zo.

Wanneer git voor je geantwoord heeft, zegt de oplosser dat in plaats van een leeg
scherm met "geen conflictmarkers" te tonen, en biedt het **Deze oplossing
vergeten** aan — wat de herinnering wist *én* het conflict terugbrengt, zodat je
het anders kunt beslechten.

Twee dingen die je moet weten:

- **Een afgespeelde oplossing wordt niet gestaged** tenzij je *Een afgespeelde
  oplossing automatisch stagen* aanzet. Laat dat uit: de hele zin van de pauze is
  dat een onthouden antwoord fout kan zijn voor déze merge, en stagen zonder
  kijken is hoe het in een commit belandt.

  Daarom **blijft een afgespeeld bestand bij Conflicterende bestanden** staan:
  git schreef de inhoud, maar de index houdt het nog als unmerged, en alleen
  stagen beslecht dat. **Stagen zoals het is** in de oplosser, of **Alles als
  opgelost markeren** in de lijst, is wat het verplaatst.
- **rerere begrijpt niet elk conflict.** Add/add- en delete/modify-conflicten
  krijgen geen preimage, dus die komen altijd rauw terug. Het aantal in de
  instellingen is wat het werkelijk bevat, en **Alles vergeten** leegt het.

**Zie ook:** [Conflictradar](conflict-radar.md) · [Mergen & rebasen](merging.md)
