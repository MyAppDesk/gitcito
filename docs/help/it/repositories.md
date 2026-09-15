---
title: Repository
category: Sincronizzazione e più repo
order: 52
summary: Ogni repository che Gitcito conosce, aperto o no, in un elenco ricercabile.
keywords: repository registro tutti i repo preferiti stellati recenti scansione cartella sfogliare trovare aprire gestire gestione repository colore sezione tinta evidenziare aree di lavoro da cartelle albero generare importazione massiva repositories registry favourites starred recent scan folder workspaces
---

# Repository

[Mission control](mission-control.md) risponde a "quale dei miei repository
aperti ha bisogno di me?". Conosce solo le schede dell'area di lavoro attiva.
Repository risponde a un'altra domanda: **dov'è quel repo, ed è proprio
aperto da qualche parte?** Copre tutto ciò che Gitcito ha mai visto. Ogni
area di lavoro, ogni scheda, più ciò che trova scansionando le cartelle che
gli indichi.

![La pagina Repository: sezioni colorate per repository aperti, preferiti,
recenti e di aree di lavoro, ogni riga con nome, proprietario, branch e
stato di lavoro](../../screenshots/repositories.webp)

## Le sezioni

Un repository può comparire in **più di una sezione**. Di proposito: ogni
sezione è una risposta completa alla propria domanda, non una fetta di un
unico elenco.

| Sezione | Cosa c'è dentro |
|---|---|
| Repository aperti | Ogni scheda dell'area di lavoro attiva in questo momento |
| Preferiti | Repository con stella, in tutte le aree di lavoro |
| Recenti | Tutto ciò che hai aperto, il più nuovo per primo. **Senza tetto**, a differenza dell'elenco da 8 voci del launcher |
| Una per area di lavoro salvata | Le schede di quell'area, così puoi saltare in un'altra senza prima passare a quella |
| Tutti i repository | Ogni repository che il registro conosce, aperto o no |

La barra sopra l'elenco è una sola striscia: **Comprimi tutto** e **Espandi
tutto**, poi un campo di ricerca che prende il resto della larghezza, poi
l'interruttore del riepilogo WIP.

La ricerca filtra le righe in tutte le sezioni insieme, e **nasconde le
sezioni che non trovano nulla** così i risultati non restano sepolti sotto
una colonna di intestazioni vuote. Abbina il nome del repository, il suo
alias, il proprietario o qualsiasi parte del percorso. Quando non coincide
niente da nessuna parte, la pagina lo dice invece di diventare bianca.

Con il riquadro vuoto ogni sezione è mostrata anche se non contiene niente:
"Preferiti 0" ti dice che la sezione esiste ed è vuota, e vale la pena
saperlo. Diventa rumore solo quando stai già cercando.

### Colori di sezione

Le sezioni arrivano **già colorate**. Ogni intestazione riceve la propria
tinta dalla palette standard, compreso un'area di lavoro nuova nel momento
in cui compare. Il punto è orientarti, non decorare: con una sezione per
progetto e cinque sezioni fisse sopra, un elenco lungo smette di dirti dove
sei, e una tinta rende riconoscibile un'intestazione prima ancora di
leggerla.

Per cambiarne una, usa il **⋮** sulla sua intestazione: **Cambia colore…**
apre lo stesso [selettore di colore](workspaces.md) usato per le schede di
gruppo e le cartelle, dieci campioni predefiniti più un valore hex libero.
**Ripristina colore** compare dopo che hai sovrascritto una sezione, e la
riporta al valore assegnato di default.

Tre cose da sapere:

- L'assegnazione è **stabile, non casuale**. Le stesse sezioni ricevono gli
  stessi colori a ogni avvio, e aggiungere un'area di lavoro non ricolora
  mai quelle sopra. Vengono salvati solo i colori che cambi.
- Il colore è **locale a questa pagina**. Tingere qui la sezione di un'area
  non dice nulla di quell'area altrove in Gitcito. Il colore della sua
  scheda è un'impostazione a parte.
- Il colore è **diluito** a una percentuale bassa della superficie invece
  che applicato a piena forza, così una scelta satura resta uno sfondo
  leggibile nei temi chiari e scuri. Un colore molto pallido sembrerà quasi
  neutro.

Con più di dieci sezioni la palette si ripete, quindi due intestazioni
possono condividere una tinta.

## Cosa rende noto un repository

Una riga esiste qui quando Gitcito lo ha **aperto** a un certo punto, o lo
ha trovato sotto una **cartella da scansionare**. Niente viene indicizzato
solo perché esiste su disco in un posto di cui non hai mai parlato a
Gitcito.

Aprire questa pagina indicizza anche ciò che hai **aperto in una scheda**,
ed è così che i repository ripristinati all'avvio ottengono una riga senza
che tu debba riaprirli. Copre solo le schede aperte, e succede alla prima
visita di ogni sessione, non una volta per sempre. Un repository a cui fai
**Forget** resta dimenticato, a meno che non lo apri di nuovo.

Le cartelle da scansionare si configurano in Impostazioni:

- **Profondità** è quanti livelli di directory la scansione scende sotto la
  radice (predefinito 3, tetto 10).
- La scansione **si ferma a un repository**. Un checkout venduto insieme o
  un sottomodulo dentro un repo non viene indicizzato come riga propria.
- Non entra mai nelle directory che iniziano con un punto, e salta
  `node_modules` e cartelle di dipendenze simili.
- **Legge solo i nomi delle cartelle**: trovare una directory `.git` è ciò
  che rende qualcosa un repository qui. Nome, proprietario e branch arrivano
  da file dentro `.git` (`HEAD`, la config), mai eseguendo `git`.

## Le righe

Le righe sono disposte a colonne: stella, nome (tiene conto dell'alias se
l'hai rinominato), proprietario (letto dall'URL del remote origin), chip di
branch, riepilogo WIP e azioni. Le colonne sono **condivise da tutta la
pagina**, non dimensionate per sezione, così un nome nell'ultima sezione si
allinea sotto un nome della prima e l'elenco si legge come una tabella, non
come una pila.

Le azioni in coda si vedono da ferme, non rivelate al passaggio del mouse:
**apri in una scheda**, e un **⋮** che apre lo stesso [menu contestuale del
repository](repo-menu.md) di un clic destro. È il menu usato ovunque in
Gitcito, esteso con due voci specifiche di questa pagina:

| Azione | Cosa fa |
|---|---|
| Stella / togli stella | Aggiunge o toglie il repository dai Preferiti |
| Locate… | Ripunta una cartella spostata o rinominata. Alias, profilo e stella restano. Se la destinazione aveva già le sue impostazioni, **vince la destinazione** |
| Forget | Toglie la voce da questo elenco. **Non tocca mai la cartella su disco** |

Un repository la cui cartella non esiste più si mostra come **mancante**,
con **Locate…** e **Forget** in linea al posto delle azioni abituali.

La stella è un interruttore dei preferiti, non una casella di selezione
multipla. Il lavoro a lotti qui è per sezione, non per selezione. Vedi sotto.

## Trasformare un albero di cartelle in aree di lavoro

La tua cartella del codice già codifica il raggruppamento che vuoi. Se
`~/Code` contiene `client-a`, `client-b` e `personal`, quelli sono contesti
tra cui passi, e un'[area di lavoro](workspaces.md) è esattamente quello,
con la propria striscia di schede.

**Aggiungi cartella da scansionare…** offre di costruirle. Dopo che la
scansione ha indicizzato ciò che ha trovato, una finestra elenca le cartelle
**direttamente dentro** quella che hai scelto, con quanti repository
contiene ciascuna. Spunta quelle che vuoi. Ognuna diventa un'area di lavoro
con **una scheda per repository**.

| Riga | Significato |
|---|---|
| Un nome di cartella e un conteggio | Spuntata di default. Diventa un'area di lavoro |
| "{n} nuovi, unisce in …" | Un'area per questa cartella esiste già. Vengono aggiunti solo i repository nuovi |
| "Già in un workspace" | Niente da fare, in grigio invece che nascosto |
| Il nome della radice stessa | Repository sciolti nella cartella che hai scelto, non in una sottocartella. Non spuntata di default |

Un repository viene archiviato sotto la **prima cartella sotto la radice**,
per quanto in profondità stia: `~/Code/client-a/nested/app` va in
`client-a`. Le cartelle senza repository non vengono offerte.

**Non viene creato nulla finché non confermi**, e annullare lascia al suo
posto l'indicizzazione della scansione. I repository sono noti in ogni caso,
ed è quello che faceva già questo pulsante.

### Scansionare di nuovo più tardi

Si può ripetere senza rischi. Una seconda scansione **aggiunge e non toglie
mai**:

- I repository nuovi vengono accodati all'area di lavoro corrispondente.
- Quelli che hai spostato, rinominato o rimosso a mano restano come li hai
  lasciati.
- Un'area che hai **rinominato** viene ancora riconosciuta. Gitcito ricorda
  la cartella da cui è nata, quindi unisce invece di creare un duplicato.
- Un repository cancellato dal disco tiene la sua scheda e si mostra
  mancante.

Le aree generate sono aree normali. Rinomina, riordina, ricolora o
cancellale come qualsiasi altra. Niente in loro resta speciale.

## Chiudere tutto ciò che è aperto

L'intestazione **Repository aperti** porta un pulsante di chiusura. **Chiudi
repository** quando ne è aperto uno, **Chiudi tutte le schede** quando sono
più di uno. È disattivato quando non c'è niente di aperto.

Chiude le schede che tengono repository e **lascia stare le schede di
pagina**, così la pagina Repository su cui sei non si chiude da sola. Niente
su disco viene toccato, e niente viene committato, messo in stash o
scartato. Una scheda è solo una vista.

Chiudere più di uno chiede prima, e dice quanti. Chiuderne uno solo no: è un
errore economico, annullato con la solita scorciatoia per riaprire la scheda
chiusa. Le schede chiuse vanno sulla stessa pila da dieci che usa una
chiusura singola, e si riaprono nell'ordine in cui stavano nella striscia.
Più di dieci in una volta non si possono riportare tutte.

## Fetch e pull di un'intera sezione

Ogni intestazione di sezione porta un pulsante **fetch** e un pulsante
diviso **pull**. Agiscono su ogni repository di quella sezione, saltando
quelli la cui cartella è **mancante**. I repository non devono essere
aperti. Una sezione di repo che non hai aperto in questa sessione funziona
uguale.

Entrambi girano **in sequenza**, non in parallelo, così una sezione di
quaranta repository non lancia quaranta processi git in un colpo. La barra
di stato mostra quale repository è in lavorazione e a che punto sei del
giro, e l'intero lotto finisce con **un** toast, non uno per repository. Se
alcuni falliscono, il toast dice quanti sono andati a buon fine e quanti no.
Il giro non si ferma al primo fallimento.

La freccia accanto a **pull** sceglie cosa significa fare pull:

| Modalità | Cosa fa |
|---|---|
| Pull (fast-forward se possibile) | Il default di Git. Fast-forward quando può, merge quando non può |
| Pull (solo fast-forward) | Rifiuta invece di creare un commit di merge |
| Pull (rebase) | Riproduce i tuoi commit locali sopra l'upstream |

Quella scelta è una **preferenza globale unica**, non una per sezione:
descrive come fai pull, e impostarla dalla freccia di una sezione la cambia
ovunque. Ogni pull **su più repository** la rispetta. I pulsanti di sezione
qui, il fetch/pull su una [scheda di gruppo](workspaces.md) e il pull di
massa di [mission control](mission-control.md). Fare pull di un **singolo**
repository dalla barra non è toccato, perché quel menu ti chiede già che
tipo di pull vuoi.

## La barra delle azioni

**Apri cartella…**, **Clona…** e **Aggiungi cartella da scansionare…**. Tre
modi per portare un repository nel registro di Gitcito, dalla stessa pagina
in cui ne cerchi uno che c'è già.

## Riepilogo WIP

Una casella facoltativa. Accesa, ogni riga **espansa** esegue un vero `git
status` e mostra il lavoro non committato e lo stato di sync. Spenta, le
righe non costano nulla oltre a leggere file dentro `.git`.

È facoltativa di proposito: un riepilogo costa circa cinque processi git per
repository, a lotti di otto, perché un registro grande non blocchi
l'interfaccia. Accenderlo è un "controlla tutto ciò che sto vedendo adesso"
voluto, non un costo permanente.

## Limiti

- **Niente in questa pagina si aggiorna a timer.** Riapri la pagina, o
  spegni e riaccendi il riepilogo WIP, per vedere lo stato attuale.
- **Il riepilogo WIP copre solo le sezioni espanse.** Una sezione compressa
  non mostra alcuno stato, casella spuntata o no.
- **Un repository è noto solo quando l'hai aperto, o hai scansionato una
  cartella che lo contiene.** Da qui non si cerca nel file system.
- **Costruire aree di lavoro non si annulla in un solo passo.** Annullare
  la finestra non crea nulla, ma un piano che hai confermato e poi rimpiangi
  si disfa cancellando le aree a mano.
- **Solo un livello di profondità.** Le cartelle sotto il primo livello
  vengono appiattite nella striscia di schede dell'area.
  `client-a/nested/app` diventa una scheda in `client-a`, non una cartella
  dentro.
- **"Scansiona ora" delle Impostazioni non offre questo.** Riscaniona tutte
  le radici configurate in una volta, dove una finestra per cartella non ha
  senso, e si limita a indicizzare.
- **Chiudi tutte riapre una scheda alla volta, fino a dieci.** Chiudere più
  di dieci repository in un colpo significa che i più vecchi non si possono
  riaprire dalla pila, anche se sono tutti ancora in **Recenti**.
- **Il pull non è filtrato da chi è indietro.** Fa pull di ogni repository
  della sezione, perché sapere quali sono indietro vorrebbe dire fare fetch
  prima. Fare pull di un repository già aggiornato è un no-op, costa tempo,
  non sicurezza.
- **Un fetch o un pull di sezione non si annulla dalla pila di annulla.**
  Fetch non cambia ciò che avevi già. Un pull che fa merge o rebase si
  inverte per repository dalla storia di quel repository, non da qui.
- **I colori di sezione sono cosmetici.** Non filtrano, ordinano,
  raggruppano né sincronizzano da nessuna parte, e un colore sulla sezione
  di un'area non è il colore di quell'area.
- **Forget toglie la voce dall'elenco, mai dal disco.** Se la cartella c'è
  ancora, scansionare la stessa radice (o riaprirla) la riporta subito.

**Vedi anche:** [Mission control](mission-control.md) · [Aree di lavoro, schede e gruppi](workspaces.md)
