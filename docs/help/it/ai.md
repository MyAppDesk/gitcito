---
title: Funzioni AI
category: AI
order: 80
summary: Opzionali, indipendenti dal provider e ancorate al tuo codice reale.
keywords: ai ia openai anthropic ollama llm locale messaggio di commit spiega review wiki grounded account chiave api abbonamento cli claude codex gemini modelli
---

# Funzioni AI

Ogni funzione AI è **opzionale** e resta spenta finché non configuri un provider.
Niente viene inviato da nessuna parte finché non chiedi qualcosa di preciso.

![Impostazioni AI](../../screenshots/settings-ai.webp)

## Account

Un **account** è un modo di raggiungere un modello: un provider, dove
contattarlo e come si autentica. Puoi configurarne diversi e convivono — una
chiave di lavoro, una personale, un modello locale, una CLI con cui hai già
fatto l'accesso.

I preset coprono **OpenAI, Anthropic, Google Gemini, OpenRouter, Groq, Mistral**
e **Ollama** (interamente locale), oltre a qualunque endpoint compatibile con
OpenAI.

Anthropic usa la propria API `/v1/messages` invece di una chiamata in forma
OpenAI, quindi i modelli Claude funzionano davvero anziché sembrare
funzionanti. Gemini viene raggiunto tramite l'endpoint compatibile con OpenAI di
Google.

### Usare un abbonamento al posto di una chiave API

Scegli il provider **CLI locale** per rispondere con una CLI agente già
installata e autenticata su questa macchina — `claude`, `gemini` o `codex`.
Gitcito esegue il binario con il tuo prompt e ne legge la risposta; non c'è
nessuna chiave API da incollare né alcun token da conservare.

Gitcito esegue soltanto un comando che hai configurato come account, e sempre
con un elenco di argomenti invece di una shell: nulla in un diff o nel nome di un
ramo può essere interpretato come un comando.

> **Questo non è più riservato di una chiave API.** I tuoi prompt raggiungono
> comunque lo stesso fornitore, con il tuo account, esattamente come con una
> chiave. Cambiano fatturazione e configurazione, non dove finisce il testo.

Se il comando non è nel tuo `PATH`, scrivi il percorso completo nell'account.

### Quale account risponde a cosa

In **Quale account risponde a cosa**, ogni funzione — messaggi di commit, chat,
spiegazione, revisione PR, risoluzione dei conflitti, wiki, temi — può puntare
al proprio account e modello. Lascia una riga sul valore predefinito per seguire
l'account predefinito. Modello economico per i messaggi di commit e uno potente
per la chat è la divisione più comune.

### Avviso di aggiornamento

Aggiornando da una versione precedente agli account, questo compare una volta. Il provider e la chiave che avevi diventano il primo account; non c'è nulla da riconfigurare a mano.

![Avviso di aggiornamento](../../screenshots/ai-accounts-notice.webp)

## Modelli

Gli elenchi dei modelli arrivano dal provider stesso e restano in cache per un
giorno; **Recupera modelli** ne aggiorna uno all'istante. Sotto l'elenco Gitcito
dice da dove viene — in diretta, dalla cache (con la data) o dall'elenco
integrato di riserva, e perché.

L'elenco è filtrato ai modelli in grado di rispondere a una richiesta di chat, così
embedding, voce e immagini restano fuori. Ogni casella del modello accetta anche
testo libero, quindi un modello in anteprima, un deployment privato o un tag
Ollama appena scaricato è sempre utilizzabile anche se il provider non lo elenca.

Un provider a cui non hai ancora dato una chiave, o irraggiungibile, ripiega su
un piccolo elenco integrato invece che su un menu vuoto.

Nessun provider pubblica un elenco ordinato o curato, quindi la selezione è di Gitcito: le istantanee datate vengono ripiegate sul modello di cui sono un'istantanea (`gpt-4o` copre `gpt-4o-2024-08-06`), e il resto è ordinato dal più recente anziché alfabeticamente. **Mostra tutti i modelli**, in fondo all'elenco, riporta tutto ciò che il provider ha restituito.

## Cosa sa fare

| Funzione | Cosa ottieni |
|---|---|
| **Messaggio di commit** | Riepilogo (e corpo opzionale) dal diff in stage, nello stile che hai scelto |
| **Spiega questo file** | Spiegazione in linguaggio semplice in un pannello laterale — Normale, Conciso, ELI5… persino Pirata |
| **Passa il mouse per spiegare** | Tieni premuto <kbd>⇧</kbd> e punta un identificatore per una spiegazione di una riga, con le righe su cui si è basata |
| **Risoluzione dei conflitti** | Propone un merge nell'output modificabile — non lo applica mai da solo |
| **Review della PR** | Riassume un diff e segnala i rischi, ognuno ancorato a un vero `path:line` |
| **Descrizione della PR** · **nomi dei branch** | Redatti a partire dai commit e dal diff del branch |
| **Temi** · **palette del grafo** | Generati da un prompt |
| **Staging intelligente** | Suggerimenti su cosa appartiene a questo commit |
| **Procedura guidata di configurazione IA** | Genera i file di configurazione dell'assistente (istruzioni, agenti, hook) per il repository — il pulsante a bacchetta nell'intestazione del pannello chat |

## Ancorata, non improvvisata

La review vede il diff come **hunk etichettati** e può citare solo quelle
etichette; poi è Gitcito a risolvere ogni etichetta in un file e una riga reali.
Un modello che si inventa una posizione viene **rifiutato e interrogato di
nuovo**, così le segnalazioni puntano sempre a codice che esiste davvero.

La spiegazione al passaggio del mouse legge solo una finestra numerata attorno al
token — dentro un diff, solo gli hunk visibili a schermo — quindi quando una
definizione sta altrove lo dice, invece di inventarsela. Le risposte sono in
cache per versione del file.

**I file mascherati perché contengono segreti non vengono mai inviati.** E
nemmeno i file coperti dalle regole di mascheramento dei segreti.

## Limiti

- Gli elenchi di riserva invecchiano fra una versione e l'altra. È proprio a
  questo che serve il recupero in diretta; la riserva copre solo il caso in cui
  recuperare non sia possibile.
- Filtrare l'elenco di un provider ai modelli da chat avviene per nome, quindi un
  modello di chat dal nome insolito può restare fuori. Scrivilo a mano.
- Un account CLI non può riportare il consumo di token se la CLI non lo fa: le
  cifre di utilizzo e costo nelle impostazioni conteggeranno per difetto quelle
  chiamate.
- Le risposte via CLI sono più lente di una chiamata diretta all'API: il binario
  avvia un'intera sessione a ogni richiesta.
- Le chiavi sono conservate per account nel portachiavi del sistema. Eliminare
  un account ne elimina la chiave.

**Vedi anche:** [Wiki del repository](repo-wiki.md) · [Sicurezza e segreti](security.md)
