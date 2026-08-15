---
title: Uitvoeren & debuggen (launch.json)
category: Werkomgeving & tools
order: 91
summary: Draai je VS Code-launchconfiguraties zonder Gitcito te verlaten.
keywords: launch.json uitvoeren run debug debuggen vscode configuraties configs tasks preLaunchTask input background
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
- **`isBackground`**-taken (watchers, ontwikkelservers) draaien losgekoppeld,
  zodat ze het starten nooit blokkeren.

Een zwevende werkbalk geeft je **pauzeren / hervatten, herstarten, stoppen**, en
schakelt tussen draaiende sessies.

Zet het aan onder **Instellingen → Algemeen → launch.json inschakelen**. De knop
**LAUNCH** verschijnt naast de tabbladen Git / Bestanden.

**Zie ook:** [Geïntegreerde terminal](terminal.md)
