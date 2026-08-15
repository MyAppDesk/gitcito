---
title: Funzioni AI
category: AI
order: 80
summary: Opzionali, indipendenti dal provider e ancorate al tuo codice reale.
keywords: ai ia openai anthropic ollama llm locale messaggio di commit spiega review wiki grounded
---

# Funzioni AI

Ogni funzione AI è **opzionale** e resta spenta finché non configuri un provider.
Niente viene inviato da nessuna parte finché non chiedi qualcosa di preciso.

![Impostazioni AI](../../screenshots/settings-ai.webp)

## Provider

Preset per **OpenAI, Anthropic, OpenRouter, Groq, Mistral e Ollama**
(interamente locale), oppure qualsiasi endpoint compatibile con OpenAI. I modelli
vengono recuperati in tempo reale e puoi aggiungere istruzioni personalizzate.

> Solo OpenAI è davvero collaudato. Gli altri usano la stessa forma di chiamata
> compatibile con OpenAI e dovrebbero funzionare, ma non sono verificati.

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

**Vedi anche:** [Wiki del repository](repo-wiki.md) · [Sicurezza e segreti](security.md)
