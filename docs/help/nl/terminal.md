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

![Twee panelen naast elkaar gesplitst in één terminalgroep](../../screenshots/terminal-split.webp)

Wat je hier draait is onzichtbaar voor de eigen vergrendeling van Gitcito, dus
een lange `git rebase` die je met de hand typt en een klik in de UI kunnen alsnog
botsen — de app ververst vanaf schijf wanneer de terminal iets verandert.

**Zie ook:** [Uitvoeren & debuggen](launch.md) · [Hooks](hooks.md)
