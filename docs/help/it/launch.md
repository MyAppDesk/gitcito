---
title: Esecuzione e debug (launch.json)
category: Strumenti dell'area di lavoro
order: 91
summary: Esegui le tue configurazioni di avvio di VS Code senza uscire da Gitcito.
keywords: launch.json esegui run debug vscode configurazioni task preLaunchTask input background compound compounds stopAll serverReadyAction sessioni parallele
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
  Un `pickString` mostra le sue opzioni come vero selettore col valore
  predefinito preselezionato; un `promptString` marcato `password` è mascherato.
- I task **`isBackground`** (watcher, server di sviluppo) girano staccati, così
  non bloccano mai l'avvio.
- I **compound** eseguono ogni membro come **sessione parallela a sé**, in un
  terminale diviso col nome del compound — un riquadro per membro, esattamente
  come le sessioni di debug di VS Code. Con `stopAll: true`, fermare un membro
  li ferma tutti.
  Le attività condivise da più membri girano **una sola volta**, in un riquadro
  proprio, prima che i membri partano — un prompt di bump di versione chiede una
  volta, non una per membro.
  Quel riquadro si chiude da solo in caso di successo e resta aperto se fallisce.
- **`serverReadyAction`** è rispettata: quando l’output della sessione
  corrisponde al pattern configurato, l’URL annunciato si apre nel browser
  (`openExternally`; `debugWithChrome` / `debugWithEdge` aprono anch’essi il
  browser — Gitcito non può collegarvi un debugger).

![Un compound che esegue due sessioni parallele](../../screenshots/launch-compound.webp)

![Il selettore ${input} col valore predefinito preselezionato](../../screenshots/launch-input.webp)

Una barra degli strumenti fluttuante ti dà **pausa / ripresa, riavvio, stop**, e
permette di passare da una sessione in esecuzione all'altra.

Attivalo in **Impostazioni → Generali → Abilita launch.json**. Il pulsante
**LAUNCH** compare accanto alle schede Git / File.

Un membro di un compound compare come *compound › membro*, e riavviarlo
riavvia solo quel membro.
Se la barra copre qualcosa che ti serve, trascinala di lato con la sua
maniglia — la posizione viene ricordata, e un doppio clic sulla maniglia la
ricentra.

Ciò che Gitcito deliberatamente **non** fa: esegue i tuoi programmi in
terminali veri, ma non è un debugger — niente breakpoint, niente ispezione
delle variabili, niente Debug Adapter Protocol. Le configurazioni solo attach
funzionano quando portano un `preLaunchTask` (il task è il lavoro); un attach
puro non ha nulla da eseguire.

**Vedi anche:** [Terminale integrato](terminal.md)
