---
title: Chat del repository
category: AI
order: 82
summary: Fai domande su questo repository, con i file e i commit che fissi come contesto — e lascia che proponga azioni git che approvi prima dell'esecuzione.
keywords: chat domanda chiedere assistente contesto allegare fissare trascinare commit file prova ancorato ai pannello azioni eseguire approvare approvazione automatica consentire correggere errore notifica
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

Una sfumatura: con le [proposte di azioni](#eseguire-azioni-dalla-chat)
attivate, i **nomi** dei file non tracciati vengono inclusi nello stato del
repository — «metti in stage il file nuovo» ne ha bisogno — ma il loro
contenuto continua a non essere mai letto.

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
| **Proponi azioni su file e Git in chat** | Disattivata riporta la chat alla sola lettura: niente schede di azioni, niente menu di approvazione |
| **Modalità file di sola lettura** | Attivata blocca creazione, modifica, sostituzione ed eliminazione dei file, ma mantiene disponibili le azioni Git. È attiva per impostazione predefinita |
| **Come vengono eseguite le azioni proposte** | La modalità di approvazione — vedi [Modalità di approvazione](#modalità-di-approvazione). Le azioni distruttive chiedono comunque conferma |

Con l’IA spenta del tutto la chat sparisce con lei: nessun pannello che offre
risposte che nessuno può dare.

Il modello della chat si cambia anche dall’intestazione del pannello, accanto al
nome del provider: è la stessa impostazione, senza aprire le Impostazioni.

Il pulsante a bacchetta accanto al titolo del pannello apre la **procedura
guidata di configurazione IA** — un percorso guidato che genera i file di
configurazione dell'assistente (istruzioni, agenti, hook) per questo
repository. Vedi [Funzioni IA](ai.md).

![Impostazioni della chat del repository](../../screenshots/settings-repo-chat.webp)

## Lavorare con i messaggi

I messaggi sono testo normale. Seleziona una parte qualsiasi e copiala, oppure
fai clic destro su una bolla: **Copia** prende la selezione, **Copia
messaggio** l'intero messaggio — una risposta viene copiata come sorgente
Markdown — e, se il clic è caduto su un link, **Copia link** ne prende
l'indirizzo.

I link si aprono nel browser predefinito, mai dentro Gitcito — sia i link
Markdown nelle risposte sia gli indirizzi `https://` nei tuoi messaggi.

Quando un messaggio menziona un'immagine — un percorso del repository come
`docs/logo.png`, o un URL che termina con un'estensione immagine — passare il
cursore sulla menzione mostra una piccola anteprima. I percorsi del repository
vengono letti dal tuo albero di lavoro; una menzione che non corrisponde a
un'immagine leggibile semplicemente non mostra nulla.

![Anteprima dell'immagine al passaggio del cursore](../../screenshots/repo-chat-image-hover.webp)

## Eseguire azioni dalla chat

Chiedi una modifica invece di un fatto — *metti in stage i file markdown,
committa questo come fix, aggiungi l'output di build alla lista degli ignore* —
e la risposta arriva con una **scheda di azioni**. Una conversazione vuota
offre alcune richieste di esempio come chip sotto l'introduzione; cliccarne una
riempie il campo di testo, così puoi modificarla prima dell'invio. La scheda
elenca i passi concreti che
l'assistente vuole compiere, una riga per azione, con i pulsanti **Esegui** e
**Ignora**. Nulla di ciò che c'è nella scheda è già accaduto; il modello può
solo proporre, e ogni proposta viene verificata contro la copia di lavoro prima
ancora che tu la veda — un'azione che nomina un file inesistente viene
rifiutata, non mostrata.

![Chat vuota con richieste di esempio](../../screenshots/repo-chat-empty.webp)

![Azioni proposte in chat](../../screenshots/repo-chat-actions.webp)

La chat del repository può proporre modifiche esatte, la creazione o sostituzione
completa e l'eliminazione di file, seguite dalle azioni Git dell'assistente
**Esegui**. Gitcito calcola localmente ogni diff espandibile. I file esistenti
devono provenire dalle prove lette; vengono rifiutati percorsi non sicuri,
segreti, ignorati, generati, binari, obsoleti, troppo grandi o collegati tramite
symlink. Push, pull, reset, rebase e operazioni forzate restano nell'interfaccia
dedicata.

L'intero gruppo viene ricontrollato prima della prima scrittura e ripristinato se
un passaggio fallisce. Prima di un commit, Gitcito verifica che ci siano modifiche
in stage. La scheda indica ogni azione completata, fallita o saltata e conserva i
risultati parziali. Poi una chiamata separata, senza azioni, riepiloga il risultato
effettivo.

### Modalità di approvazione

Il menu con lo scudo sotto il campo di testo (anche in **Impostazioni → IA →
Chat del repository**) decide come viene eseguita una scheda:

| Modalità | Esegue |
|---|---|
| **Chiedi sempre** | Nulla finché non premi **Esegui** sulla scheda |
| **Esegui in automatico le azioni sicure** | Le proposte fatte solo di operazioni reversibili — stage, unstage, ignore, branch, tag — partono all'arrivo; il resto aspetta il pulsante |
| **Esegui in automatico tutte le azioni** | Ogni proposta parte all'arrivo, tranne quelle distruttive |

Una proposta che **scarterebbe modifiche non committate chiede sempre prima**,
in ogni modalità, e la conferma nomina i file che andrebbero persi. La scheda
riporta che cosa è successo davvero — quante azioni sono state eseguite, o
l'errore che le ha fermate — e l'assistente conosce l'esito, così una domanda
successiva sa se il suo piano è stato eseguito o ignorato.

### Correggere gli errori con l'assistente

Quando un'operazione git fallisce e la chat IA è disponibile, la notifica di
errore guadagna un pulsante a scintilla: apre la chat con il fallimento
incollato nel campo di testo, così «perché è fallita e che cosa faccio» è un
solo clic. La bozza è modificabile — nulla viene inviato finché non premi
Invia.

## Che cosa rifiuta

- **I file che sembrano segreti non vengono mai letti**, fissati o no: il chip
  torna come saltato, con il motivo. Fissare non aggira il
  [mascheramento dei segreti](security.md).
- **I binari e i file oltre 512 KB** presi da fuori del repository vengono
  saltati allo stesso modo. Dentro valgono le regole consuete.
- **Non scrive mai da sola.** Il modello non ha strumenti, solo testo: una
  modifica arriva come scheda di proposta, viene eseguita solo secondo le
  [tue regole di approvazione](#modalità-di-approvazione), e un passo
  distruttivo chiede sempre conferma. Con **Proponi azioni git in chat**
  disattivata, non propone nemmeno.
- **Le conversazioni vivono solo in memoria.** Ogni repository tiene il suo filo;
  chiudendo Gitcito si perdono.

## Come aprirla

| Tasti | Effetto |
|---|---|
| Il pulsante a fumetto nella barra strumenti | Mostra o nasconde la scheda Chat |
| <kbd>⌘⌥B</kbd> / <kbd>Ctrl+Alt+B</kbd> | Mostra o nasconde tutto il pannello destro |
| <kbd>Invio</kbd> | Invia il messaggio |
| <kbd>Maiusc+Invio</kbd> | Inserisce una nuova riga |

[Tastiera e scorciatoie](keyboard.md) ha il resto, incluso come riassegnare gli
interruttori dei pannelli.

**Vedi anche:** [Funzioni IA](ai.md) · [Sicurezza e segreti](security.md) ·
[Wiki del repository](repo-wiki.md)
