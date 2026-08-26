---
title: Problemi
category: Strumenti dello spazio di lavoro
order: 92
summary: Cosa dicono gli analizzatori del progetto, e quanto di questo l’ha causato il tuo diff.
keywords: problemi analizzatore diagnostica errori avvisi lint tsc typescript eslint dart analyze clippy cargo go vet ruff pannello file modificati
---

# Problemi

Ogni progetto porta già con sé uno strumento che dice cosa non va — `tsc`,
`dart analyze`, ESLint, Clippy, `go vet`, Ruff. Quello che nessuno dice è se sia
**il tuo** diff ad aver introdotto i quaranta avvisi appena stampati. Gitcito sa
quali file sono sporchi, quindi la stessa lista risponde a quella domanda con un
interruttore.

![Il pannello Problemi e il contatore nella barra di stato](../../screenshots/problems.webp)

La barra di stato porta il conteggio — errori, avvisi, informazioni: le tre cifre
che VS Code ha insegnato a leggere a tutti. Un clic (o **Problemi** nella
palette dei comandi) apre il pannello in basso, raggruppato per file. Cliccare
una riga apre il file esattamente lì.

## Cosa esegue

| Se il repository ha | Gitcito esegue |
|---------------------|----------------|
| `pubspec.yaml` | `dart analyze --format=machine` |
| `tsconfig.json` | `tsc --noEmit` |
| una configurazione ESLint | `eslint -f json` |
| `Cargo.toml` | `cargo clippy --message-format=short` |
| `go.mod` | `go vet ./...` |
| `pyproject.toml` o `ruff.toml` | `ruff check --output-format=json` |

**Flutter rientra nella riga di Dart:** un’app Flutter è un progetto Dart, e
`flutter analyze` chiama lo stesso analizzatore di `dart analyze`.

**Il progetto non deve stare per forza nella radice.** Quei marcatori vengono
cercati anche qualche livello più in basso, quindi un’app Flutter in `mobile/` o
un pacchetto in `apps/web` viene trovato, e ogni analizzatore gira nella
directory del proprio progetto. Un progetto annidato dello stesso tipo viene
saltato quando un antenato lo copre già — è esattamente ciò che dice un
`tsconfig.json` nella radice — e una scansione si ferma a dodici progetti, perché
un monorepo non deve avviare cinquanta compilatori.

Un binario in `node_modules/.bin` batte quello nel PATH, esattamente come lo
risolvono gli script del progetto. Tutto gira in parallelo e l’output di ogni
strumento viene ricondotto a una sola forma, deduplicato e ordinato: due
analizzatori che segnalano la stessa riga producono una riga sola.

**Niente parte da solo.** `tsc --noEmit` su un repository grande sono decine di
secondi, e questi comandi sono la toolchain del repository, non di Gitcito.
Partono quando apri il pannello o premi aggiorna, mai da soli. È anche il motivo
per cui la lista è un’istantanea: modifica un file e resta vecchia finché non la
rilanci.

## Solo ciò che hai cambiato

L’interruttore nell’intestazione scarta ogni problema in un file che non hai
toccato. È la vista che vale la pena tenere aperta: una lista piatta di tutti gli
avvisi di un codice diventa carta da parati in una settimana, mentre "li ha
aggiunti questo diff?" è una domanda a cui rispondere prima del commit.

Anche i chip di gravità filtrano. Spenti significano *mostra tutto*; accenderne
uno restringe a quello.

## I limiti

- **Nessun language server.** Questa è una scansione, non un demone: niente
  sottolineature mentre scrivi, nessun risultato prima di chiederlo.
- **Uno strumento non installato viene nominato, non nascosto.** Il piè di pagina
  dice cosa non è stato possibile eseguire, perché una lista vuota senza
  spiegazione è peggio di una corta con un motivo.
- **Si capisce solo l’output leggibile dalla macchina.** Ogni analizzatore viene
  letto dal suo formato macchina documentato; uno strumento configurato per
  stampare altro qui è invisibile.
- **Cinquemila problemi è il tetto.** Oltre, il pannello lo dice e si ferma — un
  repository in quello stato ha un problema più grosso di una barra di
  scorrimento.

**Vedi anche:** [CI locale](local-ci.md) · [Terminale integrato](terminal.md)
