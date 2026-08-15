---
title: Esecuzione e debug (launch.json)
category: Strumenti dell'area di lavoro
order: 91
summary: Esegui le tue configurazioni di avvio di VS Code senza uscire da Gitcito.
keywords: launch.json esegui run debug vscode configurazioni task preLaunchTask input background
---

# Esecuzione e debug

Gitcito legge il tuo `.vscode/launch.json` — quello nella radice e ogni altro
annidato, raggruppati con dei separatori — ed esegue la configurazione che scegli
nel terminale integrato.

![Il selettore di configurazioni e la barra fluttuante](../../screenshots/launch-configs.webp)

- Le **variabili di VS Code vengono risolte** (`${workspaceFolder}` e compagnia).
- Il **`preLaunchTask`** di una configurazione viene eseguito per primo.
- I valori **`${input:…}`** ti vengono chiesti interattivamente prima
  dell'avvio (`promptString` e `pickString`).
- I task **`isBackground`** (watcher, server di sviluppo) girano staccati, così
  non bloccano mai l'avvio.

Una barra degli strumenti fluttuante ti dà **pausa / ripresa, riavvio, stop**, e
permette di passare da una sessione in esecuzione all'altra.

Attivalo in **Impostazioni → Generali → Abilita launch.json**. Il pulsante
**LAUNCH** compare accanto alle schede Git / File.

**Vedi anche:** [Terminale integrato](terminal.md)
