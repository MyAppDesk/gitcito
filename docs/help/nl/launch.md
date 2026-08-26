---
title: Uitvoeren & debuggen (launch.json)
category: Werkomgeving & tools
order: 91
summary: Draai je VS Code-launchconfiguraties zonder Gitcito te verlaten.
keywords: launch.json uitvoeren run debug debuggen vscode configuraties configs tasks preLaunchTask input background compound compounds stopAll serverReadyAction parallelle sessies hot reload hot restart device simulator emulator run target flutter metro expo vite nodemon vitest jest mocha ava wrangler dotnet watch adb simctl avd xcodebuild capacitor
---

# Uitvoeren & debuggen

Gitcito leest je `.vscode/launch.json` — die in de root en alle geneste, met
scheidingslijnen gegroepeerd — en draait de configuratie die je kiest in de
geïntegreerde terminal.

![De launchkiezer en de zwevende werkbalk](../../screenshots/launch-configs.webp)

- **Variabelen van VS Code worden opgelost** (`${workspaceFolder}` en consorten).
- De **`preLaunchTask`** van een configuratie draait eerst.
- **`${input:…}`**-waarden worden interactief gevraagd vóór het starten
  (`promptString` en `pickString`).
  Een `pickString` toont zijn opties als een echte kiezer met de standaardwaarde
  voorgeselecteerd; een `promptString` gemarkeerd als `password` wordt gemaskeerd.
- **`isBackground`**-taken (watchers, ontwikkelservers) draaien losgekoppeld,
  zodat ze het starten nooit blokkeren.
- **Compounds** draaien elk lid als **eigen parallelle sessie**, in één
  gesplitste terminal met de naam van de compound — één paneel per lid, precies
  zoals de debugsessies van VS Code. Met `stopAll: true` stopt het stoppen van
  één lid ze allemaal.
  Taken die meerdere leden delen draaien **één keer**, in een eigen paneel,
  vóór de leden starten — een versie-bump-prompt vraagt één keer, niet één keer
  per lid.
  Dat paneel sluit zichzelf bij succes en blijft open bij een fout.
- **`serverReadyAction`** wordt gehonoreerd: zodra de uitvoer van de sessie het
  geconfigureerde patroon matcht, opent de aangekondigde URL in je browser
  (`openExternally`; `debugWithChrome` / `debugWithEdge` openen ook de browser
  — Gitcito kan er geen debugger aan koppelen).

![Een compound met twee parallelle sessies](../../screenshots/launch-compound.webp)

![De ${input}-kiezer met voorgeselecteerde standaardwaarde](../../screenshots/launch-input.webp)

Een zwevende werkbalk geeft je **pauzeren / hervatten, herstarten, stoppen**, en
schakelt tussen draaiende sessies.

Zet het aan onder **Instellingen → Algemeen → launch.json inschakelen**. De knop
**LAUNCH** verschijnt naast de tabbladen Git / Bestanden.

Een compound-lid verschijnt als *compound › lid*, en herstarten herstart
alleen dat lid.
Als de balk iets bedekt dat je nodig hebt, sleep hem dan opzij aan zijn greep
— de positie wordt onthouden, en een dubbelklik op de greep centreert hem
weer.

Wat Gitcito bewust **niet** doet: het draait je programma's in echte
terminals, maar het is geen debugger — geen breakpoints, geen inspectie van
variabelen, geen Debug Adapter Protocol. Attach-configuraties werken wanneer ze
een `preLaunchTask` dragen (de taak is het werk); een pure attach heeft niets
om uit te voeren.

## Hot-acties — de snelle route naast Herstarten

![Een hot reload verstuurd vanaf de debugbalk](../../screenshots/launch-hot.webp)

De meeste dev-runtimes herladen allang op één toets: `flutter run` op **r**, Metro
op **r**, nodemon op **rs ⏎**, en Vitest draait de suite opnieuw op **a**. De
startconfiguratie herstarten om hetzelfde te bereiken is de trage weg — het doodt
het proces, draait elke `preLaunchTask` opnieuw en gooit de toestand van de app
weg.

Daarom leest Gitcito het commando dat een configuratie echt start — een
`npm run dev` volgt het tot in de scripts van je `package.json` — en zet de
toetsen van die runtime op de debugbalk. Eén klik schrijft de toets naar de
standaardinvoer van de sessie, precies alsof je hem zelf in de terminal typte.

| Runtime | Knoppen | Achter ⋯ |
|---------|---------|----------|
| Flutter (`flutter run`) | Hot reload `r`, hot restart `R` | debug paint, prestatie-overlay, platform wisselen, DevTools |
| Expo | Herladen `r` | ontwikkelaarsmenu, debugger |
| Metro / React Native | Herladen `r` | ontwikkelaarsmenu, debugger |
| Vite (dev, serve, preview) | Server herstarten `r ⏎` | in browser openen, URLs tonen, console wissen |
| nodemon | Herstarten `rs ⏎` | — |
| Vitest (watch-modus) | Alles opnieuw `a`, mislukte opnieuw `f` | snapshots bijwerken |
| Jest (`--watch`) | Alles opnieuw `a`, mislukte opnieuw `f` | alleen gewijzigde bestanden, snapshots bijwerken |
| Mocha (`--watch`) | Opnieuw uitvoeren `rs ⏎` | — |
| AVA (`--watch`) | Alles opnieuw `r ⏎`, snapshots bijwerken `u ⏎` | — |
| `dotnet watch` | Herstart forceren `Ctrl+R` | — |
| Wrangler (`wrangler dev`) | Browser openen `b` | DevTools, lokaal/extern, console wissen |

Runtimes die uit zichzelf herladen krijgen geen knoppen — `node --watch`,
`ng serve`, `tsc --watch`, `cargo watch`, `next dev`, webpack-dev-server. Een
knop die een toets stuurt die niemand leest is erger dan geen knop, want het
lijkt alsof hij werkte.

**De grenzen.** De herkenning is tekstueel: ze zoekt de programmanaam op de
commandoregel, dus een configuratie die je dev-server via een wrapper-script
start dat Gitcito niet kan lezen, krijgt niets. Er komt ook geen bevestiging — de
knop knippert, en de uitvoer van het proces is het echte antwoord. Een
gepauzeerde of beëindigde sessie neemt geen invoer aan, dus dan zijn de knoppen
uitgeschakeld.

**Als de gok fout is**, zeg het in de configuratie zelf:

```json
{
  "name": "API (watch)",
  "type": "node-terminal",
  "command": "./scripts/dev.sh",
  "gitcito": { "hotActions": [{ "label": "Reload", "send": "r", "icon": "reload" }] }
}
```

`send` wordt letterlijk geschreven — sluit af met `\n` voor een CLI die op Enter
wacht. `icon` is optioneel: `reload`, `restart`, `rerun`, `failed`, `snapshot`, `menu`, `debugger`,
`browser`, `clear`, `paint`, `perf`, `platform`, `devtools`, `urls`.
Een lege `hotActions`-array zet de knoppen uit voor die configuratie.

## Doel — op welk apparaat een configuratie start

![Het doel kiezen naast het LAUNCH-tabblad](../../screenshots/launch-device.webp)

Een configuratie die een mobiele app bouwt, moet horen waar hij moet draaien.
Die keuze is niet alleen van Flutter — React Native, Expo, Capacitor en
xcodebuild nemen ook een doel, elk anders geschreven. Gitcito vraagt het dus één
keer, naast het **LAUNCH**-tabblad, en schrijft het antwoord in de vorm die de
runtime van die configuratie leest. De kiezer verschijnt alleen als een
configuratie in de repository echt een apparaat kan aannemen.

**Waar de lijst vandaan komt** — van de SDK-tools die de machine heeft, parallel
bevraagd:

| Tool | Levert | Bevraagd |
|------|--------|----------|
| `flutter devices` / `flutter emulators` | alles, al genormaliseerd | als de map een `pubspec.yaml` heeft |
| `xcrun simctl` | iOS-simulators, draaiend en koud | op macOS |
| `adb devices` | Android-toestellen en gestarte emulators | altijd |
| `emulator -list-avds` | nog koude Android-emulators | altijd |

Dezelfde simulator wordt door maximaal drie ervan gemeld, dus items worden
samengevoegd op platform en naam; bij gelijkspel wint Flutter, want zijn id is
wat `flutter run -d` verwacht. Niet-geïnstalleerde tools staan onderaan het menu
— een korte lijst hoort zichzelf te verklaren.

**Wat de keuze doet:**

| Familie | Geschreven als |
|---------|----------------|
| Flutter | `-d <id>` |
| React Native iOS | `--udid <id>` |
| React Native Android | `--deviceId=<id>` |
| Expo `run:ios` / `run:android` | `--device <id>` |
| Capacitor / Ionic | `--target <id>` |
| xcodebuild | `-destination id=<id>` |
| al het andere | alleen omgeving |

Elke gestarte configuratie krijgt ook `GITCITO_DEVICE_ID`,
`GITCITO_DEVICE_NAME` en `GITCITO_DEVICE_PLATFORM` in de omgeving, plus
`ANDROID_SERIAL` als het doel een echt Android-toestel is. Dat is wat een
wrapper-script, een Gradle-taak of een kale `adb` hetzelfde toestel laat raken
zonder dat Gitcito iets herschrijft.

**Een koud apparaat starten.** Alles onder *Niet gestart* start zodra je het
kiest: `flutter emulators --launch`, `xcrun simctl boot` (plus het
Simulator-venster) of `emulator -avd` losgekoppeld — Gitcito afsluiten neemt je
Android-emulator dus niet mee.

**De grenzen.** Een configuratie die al een apparaat noemt — een expliciete
`-d`, een `--simulator`, Dart-Code's `deviceId` — blijft ongemoeid: de kiezer
overschrijft nooit wat de auteur schreef. Een id dat shell-quoting nodig zou
hebben, valt terug op de omgeving in plaats van een verminkte commandoregel te
riskeren. Het menu is gefilterd op wat je configuraties kunnen bereiken, dus een
Android-only repository biedt je nooit een iPhone aan. En de lijst is een
momentopname: sluit een telefoon aan en druk op **Apparaten verversen**.

De keuze wordt per repository onthouden, en vergeten zodra dat apparaat niet
meer bestaat.

**Zie ook:** [Geïntegreerde terminal](terminal.md)
