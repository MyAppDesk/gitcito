---
title: Impostazioni per repository
category: Strumenti dell'area di lavoro
order: 94
summary: Branch protetti, informazioni, analytics, cronologia e registro delle operazioni.
keywords: impostazioni repo branch protetti analytics registro operazioni cronologia info ingranaggio immagine della scheda tab image icona logo
---

# Impostazioni per repository

L'ingranaggio accanto agli strumenti nella barra apre le impostazioni che
appartengono a **questo** repository, non all'applicazione.

![Le impostazioni per repository](../../screenshots/repo-settings.webp)

| Scheda | Cosa contiene |
|---|---|
| **Generali** | Branch protetti (una selezione multipla di branch, conservata nella configurazione git), firma, l’immagine della scheda |
| **Config** | Le [regole che questo repository porta con sé](repo-config.md) in `.gitcito.json`, e il doctor che le controlla |
| **Info** | Note e campi liberi su questo repository, conservati in locale |
| **Cassaforte** | Le voci della [cassaforte](vault.md) di questo repository |
| **Insight** | Il [cruscotto della storia](insights.md) |
| **Analytics** | Quello che hai fatto in questo repository, conteggiato in locale |
| **Cronologia** · **Log** | Il registro delle operazioni: ogni comando git eseguito da Gitcito, con il suo output |

Il registro delle operazioni è quello onesto: quando qualcosa si comporta in modo
strano, mostra il comando esatto e l'errore esatto, così una segnalazione di bug
può portare fatti invece di aggettivi.

## Immagine della scheda

Con dieci schede aperte, nomi che iniziano allo stesso modo — `api`,
`api-gateway`, `api-docs` — si distinguono a fatica. Una piccola immagine
sulla scheda si trova prima di un testo.

In **Generali**, fai clic sul campo dell’immagine. Elenca le immagini del
repository stesso — PNG, JPEG, GIF, WebP, SVG, ICO, BMP e AVIF —, ognuna con la
sua miniatura, prima i file che si chiamano come un logo o un’icona. Scrivi per
filtrare (`logo dark` trova `assets/logo-dark.png`), spostati con le frecce e
premi Invio per scegliere; oppure scrivi un percorso a mano. Il percorso viene
salvato **relativo alla radice del repository**, quindi l’immagine segue il
repository ovunque si trovi la sua cartella.

Cosa mostra la scheda è una scelta di tutta l’app, in **Impostazioni →
Generali → Le schede dei repository mostrano**:

| Opzione | La scheda mostra |
|---|---|
| **Immagine e nome** (predefinito) | L’immagine al posto dell’icona della cartella, poi il nome |
| **Solo nome** | L’icona della cartella e il nome, come senza immagine |
| **Solo immagine** | Solo l’immagine; il nome passa nel tooltip |

Limiti da conoscere:

- L’elenco contiene i file che git vede — tracciati e non tracciati, non quelli
  ignorati — e al massimo 40 alla volta; scrivi per raggiungere gli altri.
  Un’immagine ignorata si può comunque scrivere a mano.
- Le immagini oltre 1 MB, o illeggibili, appaiono in grigio e non si possono
  scegliere: un’icona di 20 pixel non ha bisogno di più.
- Un repository **senza** immagine mostra sempre il nome, qualunque opzione sia
  scelta: una scheda vuota non si potrebbe riconoscere.
- Se il percorso è **rotto** — file eliminato, rinominato, non è un’immagine o è
  troppo grande — la scheda torna in silenzio al nome, e questa scheda delle
  impostazioni mostra un avviso sotto il percorso. Nient’altro si lamenta.
- L’immagine viene letta una volta per sessione. Se sostituisci il file con lo
  stesso nome, riapri questa scheda delle impostazioni per ricaricarla.
- L’impostazione vive nelle impostazioni di Gitcito su questo computer, non nel
  repository: i colleghi non la ereditano.

**Vedi anche:** [Sicurezza e segreti](security.md) · [Insight](insights.md)
