---
title: Uitvoeren & debuggen (launch.json)
category: Werkomgeving & tools
order: 91
summary: Draai je VS Code-launchconfiguraties zonder Gitcito te verlaten.
keywords: launch.json uitvoeren run debug debuggen vscode configuraties configs tasks preLaunchTask input background compound compounds stopAll serverReadyAction parallelle sessies
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

**Zie ook:** [Geïntegreerde terminal](terminal.md)
