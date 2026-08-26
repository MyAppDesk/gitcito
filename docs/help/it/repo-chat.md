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

**Una seconda occhiata.** La prima passata deve indovinare quali file contano
solo dal nome, ed è esattamente l'ipotesi che sbaglia su «da dove viene
chiamato». Perciò una risposta può richiedere invece di indovinare: può indicare
altri percorsi, altre ricerche letterali o hash di commit dalla cronologia
recente, e la domanda viene ripetuta con ciò che emerge. Succede al massimo due
volte — ogni giro è un'altra chiamata al modello che aspetti — e all'ultima deve
rispondere con quello che ha. Non ne vedi nulla, se non un'attesa un po' più
lunga e una risposta migliore.

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
| **Consenti alla chat di proporre azioni remote** | Disattivo per impostazione predefinita. Attivo aggiunge fetch, pull, push, apertura di una pull request e invio di uno stack |

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

La chat del repository può proporre modifiche esatte, creazione o sostituzione
di interi file e la loro eliminazione, poi azioni Git: pattern di ignore, stage,
unstage, commit, stash, scarto, branch, cambio di branch, tag e — poiché le
vengono mostrati l'elenco dei branch e i commit recenti — merge, rebase, revert
e cherry-pick. Gitcito calcola in locale il diff espandibile. I file esistenti
devono provenire dalle prove lette; destinazioni non sicure, segrete, ignorate,
generate, binarie, obsolete, troppo grandi o raggiunte via symlink vengono
rifiutate. Reset, riscrittura della cronologia, eliminazione di branch e ogni
operazione forzata restano solo nella loro interfaccia dedicata.

Un merge o un rebase può fermarsi su un conflitto. In tal caso l'esecuzione si
arresta lì, la scheda segna quella riga come fallita e mantiene il conteggio di
quanto è già stato eseguito, e il banner dei conflitti prende il posto esattamente
come per la stessa operazione avviata dalla barra.

L'intero gruppo viene ricontrollato prima della prima scrittura e ripristinato se
un passaggio fallisce. Prima di un commit, Gitcito verifica che ci siano modifiche
in stage. La scheda indica ogni azione completata, fallita o saltata e conserva i
risultati parziali. Poi una chiamata separata, senza azioni, riepiloga il risultato
effettivo.

**Può anche scrivere `.gitcito.json`.** Alla chat viene data la forma del
[file di configurazione del repository](repo-config.md), così *aggiungi i link
ai ticket per JIRA-1234* o *proteggi i branch di release* diventa un'azione su
file scritta contro lo schema reale, non chiavi plausibili che il loader
rifiuterebbe. Richiede le azioni sui file abilitate — lo stesso interruttore
della modalità di sola lettura dei file.

**Le righe che meritano un'immagine ce l'hanno.** Una riga di riepilogo basta
per «metti in stage due file» e non basta affatto per «apri quattro pull request
su uno stack»: le righe che descrivono una forma la disegnano — il branch che un
push pubblica e di quanto è avanti, i due riferimenti di un merge o di un
rebase, i commit che un revert o un cherry-pick ripeterebbe con il loro oggetto,
la pull request come sarà, e uno stack come una scala con la base di ogni
livello e cosa vi farebbe l'invio: aprire, ripuntare o lasciare com'è.

### Azioni che escono dalla macchina

Recuperare, aggiornare, pubblicare, aprire una pull request e inviare uno stack
sono **disattivi per impostazione predefinita**, dietro **Consenti alla chat di
proporre azioni remote**. Pubblicare il lavoro merita una scelta esplicita, e con
l'impostazione disattiva al modello non viene nemmeno detto che quelle azioni
esistono: non può proporne una e vedersela rifiutare, il difetto che insegna alle
persone ad attivare opzioni senza leggerle.

Con l'impostazione attiva:

| Azione | Fa |
|---|---|
| **Recupera** / **Aggiorna** | Lo stesso fetch e pull della barra; la modalità di pull (merge, solo fast-forward, rebase) fa parte della proposta |
| **Pubblica** | Pubblica un branch su un remoto. **Mai con force**: un push forzato non esiste nel vocabolario di una proposta, quindi non può essere proposto |
| **Apri PR** | Apre una pull request, bozza o no, verso l'origin del repository. La scheda ne conserva il link |
| **Invia stack** | L'invio completo dello [stack di PR](stacks.md): pubblicare ogni livello, aprire o ripuntare una pull request per livello, scrivere la sezione di navigazione, registrare lo stack GitHub |

![Un piano della chat che pubblica e apre una pull request](../../screenshots/repo-chat-remote-actions.webp)

Un push proposto supera prima gli stessi controlli del push della barra: la
conferma per i branch protetti, l'avviso sulla pubblicazione di
[file che sembrano credenziali](security.md) e la checklist pre-push del
repository. Sono finestre di dialogo, quindi si rispondono prima che il piano
parta, non dall'interno.

### Annullare un piano

Un piano si approva in blocco, quindi si annulla in blocco. Prima della prima
azione capace di cambiare qualcosa, Gitcito registra dov'era il branch e scatta
uno snapshot dell'albero di lavoro; la scheda conclusa offre allora **Annulla il
piano**. Riporta il branch a quel commit e ripristina l'albero, buttando via ciò
che il piano ha prodotto: perciò chiede conferma e nomina il commit di ritorno.
Le pull request aperte restano aperte — un remoto non è qualcosa che uno
snapshot locale possa ritirare.

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
