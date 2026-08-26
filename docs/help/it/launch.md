---
title: Esecuzione e debug (launch.json)
category: Strumenti dell'area di lavoro
order: 91
summary: Esegui le tue configurazioni di avvio di VS Code senza uscire da Gitcito.
keywords: launch.json esegui run debug vscode configurazioni task preLaunchTask input background compound compounds stopAll serverReadyAction sessioni parallele hot reload hot restart device simulator emulator run target flutter metro expo vite nodemon vitest jest mocha ava wrangler dotnet watch adb simctl avd xcodebuild capacitor
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

## Azioni a caldo — la via veloce accanto a Riavvia

![Una ricarica a caldo inviata dalla barra di debug](../../screenshots/launch-hot.webp)

La maggior parte dei runtime di sviluppo ricarica già con un tasto: `flutter run`
con **r**, Metro con **r**, nodemon con **rs ⏎**, e Vitest riesegue la suite con
**a**. Riavviare la configurazione di avvio per ottenere lo stesso risultato è la
strada lenta: uccide il processo, riesegue ogni `preLaunchTask` e butta via lo
stato dell'app.

Perciò Gitcito legge il comando che una configurazione avvia davvero — seguendo
un `npm run dev` fino agli script del tuo `package.json` — e mette i tasti di quel
runtime nella barra di debug. Premendone uno, il tasto viene scritto sullo
standard input della sessione, esattamente come se lo avessi digitato tu nel
terminale.

| Runtime | Pulsanti | Dietro ⋯ |
|---------|----------|----------|
| Flutter (`flutter run`) | Ricarica a caldo `r`, riavvio a caldo `R` | debug paint, overlay prestazioni, cambio piattaforma, DevTools |
| Expo | Ricarica `r` | menu sviluppatore, debugger |
| Metro / React Native | Ricarica `r` | menu sviluppatore, debugger |
| Vite (dev, serve, preview) | Riavvia il server `r ⏎` | apri nel browser, mostra gli URL, pulisci la console |
| nodemon | Riavvia `rs ⏎` | — |
| Vitest (modalità watch) | Riesegui tutti `a`, riesegui i falliti `f` | aggiorna gli snapshot |
| Jest (`--watch`) | Riesegui tutti `a`, riesegui i falliti `f` | solo i file modificati, aggiorna gli snapshot |
| Mocha (`--watch`) | Riesegui `rs ⏎` | — |
| AVA (`--watch`) | Riesegui tutti `r ⏎`, aggiorna gli snapshot `u ⏎` | — |
| `dotnet watch` | Forza il riavvio `Ctrl+R` | — |
| Wrangler (`wrangler dev`) | Apri nel browser `b` | DevTools, locale/remoto, pulisci la console |

I runtime che ricaricano da soli non ottengono pulsanti — `node --watch`,
`ng serve`, `tsc --watch`, `cargo watch`, `next dev`, webpack-dev-server. Un
pulsante che invia un tasto che nessuno legge è peggio di nessun pulsante, perché
sembra aver funzionato.

**I limiti.** Il riconoscimento è testuale: cerca il nome del programma nella
riga di comando, quindi una configurazione che avvia il tuo server tramite uno
script wrapper che Gitcito non può leggere non ottiene nulla. Non c'è nemmeno una
conferma: il pulsante lampeggia, e l'output del processo è la risposta vera. Una
sessione in pausa o terminata non accetta input, quindi i pulsanti si disabilitano.

**Quando l'ipotesi è sbagliata**, dillo nella configurazione stessa:

```json
{
  "name": "API (watch)",
  "type": "node-terminal",
  "command": "./scripts/dev.sh",
  "gitcito": { "hotActions": [{ "label": "Reload", "send": "r", "icon": "reload" }] }
}
```

`send` viene scritto alla lettera — chiudilo con `\n` per una CLI che aspetta
Invio. `icon` è opzionale: `reload`, `restart`, `rerun`, `failed`, `snapshot`, `menu`, `debugger`,
`browser`, `clear`, `paint`, `perf`, `platform`, `devtools`, `urls`.
Un array `hotActions` vuoto disattiva i pulsanti per quella configurazione.

## Destinazione — su quale dispositivo parte una configurazione

![La scelta della destinazione accanto alla scheda LAUNCH](../../screenshots/launch-device.webp)

A una configurazione che compila un’app mobile va detto dove eseguirla. Quella
scelta non è solo di Flutter — anche React Native, Expo, Capacitor e xcodebuild
prendono una destinazione, ognuno scritta a modo suo. Perciò Gitcito la chiede
una volta sola, accanto alla scheda **LAUNCH**, e scrive la risposta nella forma
che legge il runtime di quella configurazione. Il selettore compare solo se
qualche configurazione del repository può davvero accettare un dispositivo.

**Da dove arriva l’elenco** — dagli strumenti dell’SDK presenti sulla macchina,
interrogati in parallelo:

| Strumento | Fornisce | Interrogato |
|-----------|----------|-------------|
| `flutter devices` / `flutter emulators` | tutto, già normalizzato | se la cartella ha un `pubspec.yaml` |
| `xcrun simctl` | simulatori iOS, avviati e freddi | su macOS |
| `adb devices` | telefoni Android ed emulatori già avviati | sempre |
| `emulator -list-avds` | emulatori Android ancora freddi | sempre |

Lo stesso simulatore viene riportato da un massimo di tre di loro, quindi le
voci vengono unite per piattaforma e nome; a parità vince Flutter, perché il suo
id è quello che `flutter run -d` si aspetta. Gli strumenti non installati sono
elencati in fondo al menu: un elenco corto deve spiegarsi da solo.

**Cosa fa la scelta:**

| Famiglia | Scritta come |
|----------|--------------|
| Flutter | `-d <id>` |
| React Native iOS | `--udid <id>` |
| React Native Android | `--deviceId=<id>` |
| Expo `run:ios` / `run:android` | `--device <id>` |
| Capacitor / Ionic | `--target <id>` |
| xcodebuild | `-destination id=<id>` |
| tutto il resto | solo ambiente |

Ogni configurazione avviata riceve anche `GITCITO_DEVICE_ID`,
`GITCITO_DEVICE_NAME` e `GITCITO_DEVICE_PLATFORM` nel suo ambiente, più
`ANDROID_SERIAL` quando la destinazione è un dispositivo Android reale. È questo
che permette a uno script wrapper, a un task Gradle o a un semplice `adb` di
colpire lo stesso telefono senza che Gitcito riscriva nulla.

**Avviare un dispositivo freddo.** Tutto ciò che sta sotto *Non avviato* parte
quando lo scegli: `flutter emulators --launch`, `xcrun simctl boot` (più la
finestra del Simulator) o `emulator -avd` staccato — così chiudere Gitcito non
si porta dietro il tuo emulatore Android.

**I limiti.** Una configurazione che nomina già un dispositivo — un `-d`
esplicito, un `--simulator`, il `deviceId` di Dart-Code — resta intatta: il
selettore non sovrascrive mai ciò che ha scritto l’autore. Un id che avrebbe
bisogno di virgolette ripiega sull’ambiente invece di rischiare una riga di
comando rotta. Il menu è filtrato su ciò che le tue configurazioni possono
raggiungere, quindi un repository solo Android non ti offrirà mai un iPhone. E
l’elenco è un’istantanea: collega un telefono e premi **Aggiorna i dispositivi**.

La scelta viene ricordata per repository e dimenticata quando quel dispositivo
smette di esistere.

**Vedi anche:** [Terminale integrato](terminal.md)
