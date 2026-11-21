---
title: Licenze open source
category: Personalizzazione
order: 104
summary: Leggi la licenza di ogni pacchetto di terze parti incluso in questa build di Gitcito.
keywords: licenze licenses attribuzione avvisi open source MIT Apache BSD terze parti dipendenze crediti informazioni
---

# Licenze open source

Gitcito si basa su novanta e passa pacchetti open source, e quasi tutti chiedono
la stessa cosa in cambio: che il loro avviso viaggi con il binario. MIT, BSD e
Apache lo dicono nel testo stesso. Questa pagina è il posto in cui vive
quell’avviso, così l’obbligo lo rispetta l’app e non un file che qualcuno deve
ricordarsi di copiare.

È anche la risposta onesta a «cosa gira davvero sulla mia macchina».

## Aprirla

Fai clic sul **numero di versione** nella barra di stato — si apre **Novità** — e
poi su **Licenze** nella sua intestazione. Oppure apri la palette dei comandi e
cerca *Licenze open source*. Si apre in una scheda propria, come Novità.

![La scheda delle licenze](../../screenshots/licenses.webp)

| Colonna | Cos’è |
|---------|-------|
| Nome | Il pacchetto come è pubblicato su npm |
| Versione | La versione esatta risolta da questa build |
| Badge | L’identificatore SPDX dal manifest del pacchetto |

Seleziona una riga per leggere il testo completo della licenza fornita dal
pacchetto. L’icona del link apre la pagina del progetto nel browser. Il filtro
cerca nel nome del pacchetto e nell’identificatore della licenza, quindi
digitando `Apache` l’elenco si riduce ai pacchetti con licenza Apache.

## Cosa copre e cosa no

L’elenco è generato in fase di build dall’**albero delle dipendenze di
produzione** — tutto ciò che finisce dentro l’app pacchettizzata, comprese le
dipendenze transitive che non hai mai chiesto direttamente — più Electron stesso.
Gli strumenti di build che non vengono mai distribuiti sono esclusi di proposito.

Due limiti da conoscere:

- **Alcuni pacchetti non includono un file di licenza.** Dichiarano un
  identificatore nel manifest e nient’altro. Quelle righe lo dicono invece di
  inventare un testo, perché una licenza che non puoi leggere non è una licenza
  su cui puoi contare.
- **L’identificatore è ciò che il pacchetto dichiara.** Gitcito lo riporta; non
  lo verifica. Se il manifest di un pacchetto è sbagliato, questa pagina sbaglia
  con lui.

La licenza di Gitcito è MIT, e il badge in alto a destra la apre su GitHub.

**Vedi anche:** [Lingue e scrittura da destra a sinistra](languages.md) · [Temi e aspetto](themes.md)
