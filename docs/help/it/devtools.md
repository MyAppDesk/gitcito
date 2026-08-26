---
title: Flutter DevTools
category: Strumenti dello spazio di lavoro
order: 93
summary: La vista di rete, la timeline, l’inspector e il profiler di memoria, in una scheda di Gitcito.
keywords: devtools flutter dart rete network timeline inspector memoria profiler webview pannello integrato vm service
---

# Flutter DevTools

DevTools ha già la vista di rete, la timeline, l’inspector dei widget e il profiler
di memoria, ed è un’app Flutter web servita dalla tua stessa macchina. Perciò
Gitcito non ne reimplementa nulla e non parla lui stesso con il Dart VM Service:
si accorge dell’indirizzo e lo incorpora.

![DevTools aperto in una scheda di Gitcito](../../screenshots/devtools.webp)

`flutter run` stampa la riga appena il servizio VM è pronto:

```
The Flutter DevTools debugger and profiler on iPhone 16 Pro is available at:
http://127.0.0.1:9100?uri=http://127.0.0.1:53412/uJ8k=/
```

La sessione di avvio sorveglia il proprio output per trovarla, e nella barra di
debug compare un pulsante. Un clic apre DevTools **dentro la scheda del
repository**: la scheda guadagna una piccola icona, cliccarla alterna fra
repository e strumento, e la ✕ che appare al passaggio la chiude. Un’icona per
sessione — due app in esecuzione sono due DevTools.

Un **riavvio a caldo pubblica un nuovo indirizzo**, e la scheda lo segue finché la
sua sessione vive. Finita la sessione, la scheda conserva l’ultimo indirizzo, di
solito morto: chiudila e riapri DevTools dalla nuova esecuzione.

## Quali strumenti

Uno strumento entra qui se fa due cose: servire un’interfaccia web su questa
macchina e stampare il proprio indirizzo.

| Strumento | La riga che stampa |
|---|---|
| Flutter DevTools | `The Flutter DevTools … is available at: <url>` |
| Dart DevTools (`dart devtools`) | `Serving DevTools at <url>` |
| Vue DevTools (`@vue/devtools`) | `Vue Devtools … listening on <url>` |
| Prisma Studio | `Prisma Studio is up on <url>` |
| Drizzle Studio | `Drizzle Studio is up and running on <url>` |
| webpack-bundle-analyzer | `Webpack Bundle Analyzer is started at <url>` |
| qualsiasi altro che nomini DevTools e un indirizzo | ricade su una corrispondenza generica |

**Cosa non si può incorporare, e perché.** L’inspector di Node stampa un endpoint
`ws://` a cui un debugger si aggancia, non una pagina — e il front di Chrome
DevTools che lo accompagna vive dietro un URL `devtools://` che nessuna vista
incorporata può caricare. La build standalone di React DevTools è una finestra
desktop a sé, non una pagina servita. Nessuno dei due può essere una scheda qui:
servirebbe un client di protocollo di debug, non un indirizzo.

**Un dev server non è un dev tool.** Vite su `:5173` è la tua app; incorporarla
sarebbe un pannello di anteprima — un’altra funzione, deliberatamente non questa.

## Cosa gli è permesso

La vista incorporata sta al guinzaglio corto, perché questa app custodisce
credenziali:

- **Solo loopback.** `127.0.0.1`, `localhost`, `::1`. Un aggancio con qualsiasi
  altro indirizzo viene rifiutato, e così un redirect verso di esso.
- **Niente preload, niente node integration, isolamento del contesto attivo.** La
  pagina non ha alcun ponte verso Gitcito.
- **I link si aprono nel browser vero**, in una finestra normale, non nel pannello.

## I limiti

- **È DevTools, non roba nostra.** Ciò che quella versione sa fare lo fa il
  pannello; ciò che non sa fare, non lo facciamo neanche noi. Non esiste una
  vista di rete in salsa Gitcito.
- **Solo Flutter si annuncia così.** Un normale programma Dart stampa un URL del
  servizio VM ma nessun indirizzo DevTools: nessun pulsante compare.
- **Un pannello bianco vuol dire che l’app si è fermata.** DevTools è servito
  *dall’app in esecuzione*; quando esce, il suo indirizzo smette di rispondere.

**Vedi anche:** [Esegui e debug](launch.md)
