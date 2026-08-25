---
title: La barra dei menu
category: Per iniziare
order: 5
summary: Cosa contengono i menu macOS di Gitcito, e perché Windows e Linux non li hanno.
keywords: barra dei menu menu applicazione file modifica vista finestra aiuto repository macos nativo informazioni esci
---

# La barra dei menu

Una barra dei menu risponde a una domanda a cui nessun'altra superficie risponde
bene: *cosa sa fare questa app?* La [palette dei comandi](search.md) è più
veloce quando sai già cosa cerchi, e il [prontuario](keyboard.md) elenca i
tasti — ma non si sfoglia né l'una né l'altro. I menu sì.

Tutto ciò che contengono si raggiunge anche dall'interno della finestra. Niente
è solo nel menu, di proposito: una funzione che esiste solo in un menu è una
funzione che chi usa Windows e Linux non ha.

## Cosa sta dove

| Menu | Contiene |
|---|---|
| **Gitcito** | Informazioni, controllo aggiornamenti, [Impostazioni](repo-settings.md), le voci standard per nascondere e uscire |
| **File** | Nuova scheda, apri o [clona](cloning.md) un repository, apri recenti, chiudi e riapri schede |
| **Modifica** | Taglia, copia, incolla, annulla — la modifica del testo che la tastiera già fa — più la [ricerca nel codice](search.md) |
| **Vista** | Palette dei comandi, gli interruttori della barra laterale e del pannello, il [terminale](terminal.md), [mission control](mission-control.md), la [cassaforte](vault.md), lo zoom |
| **Repository** | Fetch, pull, push, commit, stash, nuovo branch, [pull request](hosting.md), annulla, mostra nel Finder, impostazioni del repository |
| **Finestra** | Riduci a icona, zoom, porta tutto in primo piano |
| **Aiuto** | Questo manuale, il prontuario, le novità, le licenze, segnala un problema |

Il menu Repository è interamente disattivato quando la scheda attiva non è un
repository git, e **Annulla** è disattivato quando non c'è niente da annullare:
il menu è un riassunto leggibile di ciò che l'app ti lascerà fare adesso.

## Scorciatoie mostrate, non requisite

I tasti accanto a ogni voce sono quelli che hai davvero assegnato. Riassegna
<kbd>⌘K</kbd> nelle Impostazioni e il menu Vista lo dirà.

Funziona perché il menu *mostra* quelle combinazioni senza rivendicarle: la
gestione della tastiera di Gitcito resta al comando, ed è ciò che permette a una
scorciatoia di comportarsi diversamente a seconda di dove si trova il cursore.
L'unica cosa che così non si può mostrare è una scorciatoia che Gitcito non
possiede: <kbd>⌘F</kbd> appartiene al file o al diff che stai leggendo, quindi
nessuna voce di menu la rivendica.

## I limiti

- **Solo macOS.** Su Windows e Linux la finestra è senza cornice — la barra del
  titolo la disegna Gitcito e una barra dei menu non avrebbe dove stare. Su
  quelle piattaforme gli stessi comandi arrivano dalla [palette dei
  comandi](search.md) e dalle [scorciatoie da tastiera](keyboard.md).
- **Ricarica e Strumenti di sviluppo compaiono solo nelle build di sviluppo.**
  Ricaricare butta via lo stato di ogni scheda aperta, e non è qualcosa che una
  versione pubblicata debba offrire accanto a Zoom.
- **Apri recenti elenca al massimo dieci repository**, dal più recente, e segue
  la stessa lista mostrata dalla [schermata di benvenuto](getting-started.md).
- **Riapri scheda chiusa non è mai disattivato.** Lo stack delle schede chiuse
  vive solo per la sessione e il menu non lo vede; sceglierlo senza niente da
  riaprire non fa nulla.
