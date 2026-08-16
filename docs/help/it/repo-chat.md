---
title: Chat del repository
category: AI
order: 82
summary: Fai domande su questo repository, con i file e i commit che fissi come contesto.
keywords: chat domanda chiedere assistente contesto allegare fissare trascinare commit file prova ancorato ai pannello
---

# Chat del repository

Alcune domande si fanno più in fretta di quanto si cerchi la risposta. *Dove
avviene davvero il refresh del token? Che cosa ha cambiato questo commit, in una
frase? Perché esiste questo file?* La chat del repository risponde sul
repository aperto e mostra le righe su cui si è basata.

Condivide la colonna destra con **Dettagli**: le schede in alto passano dall’una
all’altra, così il grafo non perde la sua selezione.

![La chat del repository con contesto fissato](../../screenshots/repo-chat.webp)

## Che cosa legge

Ogni risposta nasce in due passaggi. Il primo sceglie un piccolo insieme di
percorsi e ricerche letterali dall’elenco dei file tracciati del repository. Il
secondo risponde usando solo gli estratti riportati, e può citare soltanto
quelli: un file o una riga inventati sono un errore di validazione, non una
risposta plausibile.

| Incluso | Escluso |
|---|---|
| File tracciati, come sono nella copia di lavoro | File non tracciati |
| Diff in stage e non, dei file tracciati | Tutto ciò che una regola di ignore intercetta, anche se tracciato |
| Branch, avanti/indietro e l’elenco dei percorsi modificati | [File che sembrano segreti](security.md), binari, percorsi generati |

Leggere la copia di lavoro permette di parlare di modifiche non committate.
Significa anche che quelle modifiche lasciano la macchina: le riceve il provider
configurato in [Funzioni IA](ai.md).

## Fissare il contesto

Il modello decide cosa leggere. Fissare serve a scavalcarlo: ciò che è fissato
viene letto **per primo** e prende la fetta maggiore del budget di contesto.

Quattro modi, tutti verso la stessa fila di chip sopra il campo di testo:

| Fai così | Ottieni |
|---|---|
| Clicca un chip suggerito | Il file aperto nel visualizzatore, o il commit selezionato nel grafo |
| Trascina una riga dalla scheda **File** | Quel file |
| Trascina una riga dal **grafo dei commit** | Quel commit — messaggio e diff a blocchi |
| **+** → *Scegli un file…*, o trascina dal Finder/Esplora file | Qualsiasi file su disco, anche fuori dal repository |

I chip restano fissati per le domande successive; la `×` ne toglie uno, e
cancellare la conversazione li toglie tutti. Il limite è otto.

Un commit fissato porta il suo messaggio e fino a dodici blocchi di diff. I
blocchi su percorsi esclusi vengono tolti da quel diff, non l’intero commit.

## Impostazioni

**Impostazioni → IA → Chat del repository**:

| Impostazione | Effetto |
|---|---|
| **Fai domande sul repository** | Disattivata toglie la scheda, il pulsante e il bersaglio della scorciatoia. Il resto dell’IA continua |
| **Modello della chat** | Un modello solo per la chat. Vuoto significa quello del profilo: chiedere costa meno che revisionare, spesso basta uno più piccolo |
| **Solo contenuti committati** | Risponde dall’ultimo commit invece che dal working tree: le modifiche non committate non lasciano mai la macchina |

Con l’IA spenta del tutto la chat sparisce con lei: nessun pannello che offre
risposte che nessuno può dare.

Il modello della chat si cambia anche dall’intestazione del pannello, accanto al
nome del provider: è la stessa impostazione, senza aprire le Impostazioni.

![Impostazioni della chat del repository](../../screenshots/settings-repo-chat.webp)

## Che cosa rifiuta

- **I file che sembrano segreti non vengono mai letti**, fissati o no: il chip
  torna come saltato, con il motivo. Fissare non aggira il
  [mascheramento dei segreti](security.md).
- **I binari e i file oltre 512 KB** presi da fuori del repository vengono
  saltati allo stesso modo. Dentro valgono le regole consuete.
- **Non scrive mai.** Niente stage, niente commit, niente cambio di branch: non
  ha strumenti, solo testo. Una risposta che dice di aver fatto qualcosa sta
  descrivendo, non riferendo.
- **Le conversazioni vivono solo in memoria.** Ogni repository tiene il suo filo;
  chiudendo Gitcito si perdono.

## Come aprirla

| Tasti | Effetto |
|---|---|
| Il pulsante a fumetto nella barra strumenti | Mostra o nasconde la scheda Chat |
| <kbd>⌘⌥B</kbd> / <kbd>Ctrl+Alt+B</kbd> | Mostra o nasconde tutto il pannello destro |
| <kbd>⌘⏎</kbd> / <kbd>Ctrl+Invio</kbd> | Invia il messaggio |

[Tastiera e scorciatoie](keyboard.md) ha il resto, incluso come riassegnare gli
interruttori dei pannelli.

**Vedi anche:** [Funzioni IA](ai.md) · [Sicurezza e segreti](security.md) ·
[Wiki del repository](repo-wiki.md)
