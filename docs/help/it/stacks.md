---
title: Branch impilate
category: Branch e chirurgia
order: 43
summary: Catene di branch dipendenti — restack a cascata e PR concatenate con un clic.
keywords: stack impilate branch graphite restack dipendenti catena genitore PR per livello submit invio autopilot pilota automatico retarget cambiare base
---

# Branch impilate

Uno stack è una catena di branch in cui ciascuno si costruisce su quello sotto:
`main → api → ui`. Rivedere tre PR piccole batte rivederne una enorme.

![Uno stack di branch](../../screenshots/branch-stack.webp)

Gitcito la disegna come un **itinerario**: in alto un ramo di partenza, poi una
tappa per livello. La PR di ogni tappa punta alla tappa sopra, e la prima atterra
sul ramo di partenza. Ogni tappa mostra i propri commit, se le serve un restack e,
una volta inviata, il numero della PR.

## Modificare l'itinerario

| Comando | Cosa fa |
|---------|---------|
| Il campo **Partenza** | Dove atterra la pila. Cambialo e l'intera catena viene ricollegata al nuovo ramo e riprodotta. |
| Il campo di una **tappa** | Scambia quale ramo occupa quella posizione. Il ramo che esce viene solo scollegato, mai cancellato. |
| **↑ / ↓** | Sposta una tappa di un posto. |
| **✕** | Toglie la tappa dall'itinerario; le vicine si ricongiungono. |
| **Aggiungi tappa** | Scegli un ramo che hai già e si unisce in cima, oppure scrivi un nome che non esiste ancora: viene creato sulla punta dell'ultima tappa e ci si sposta sopra. |
| Il pulsante freccia | Passa a quella tappa. |

Tutti i campi sono a digitazione predittiva: scrivi per filtrare, ↑/↓ e Invio per
scegliere, e ciò che scrivi vale anche fuori elenco — quindi un riferimento remoto
come `origin/main` funziona come ramo di partenza.

Sotto, tutte queste modifiche sono la *stessa* operazione: l'itinerario intero,
restituito in una volta. Per questo un gesto è un solo annullamento
(<kbd>⌘Z</kbd>) e non una scia di collegamenti applicati a metà.

## Quanto costa modificare l'itinerario

Tutto ciò che cambia l'ordine — uno scambio, uno spostamento, un'altra partenza —
**riproduce** la catena: i commit propri di ogni tappa vengono rebasati sulla nuova
base. Quindi può dare **conflitti**, esattamente come un restack. Gitcito si ferma
al primo e ti consegna la vista dei conflitti; le tappe precedenti si sono già
spostate.

L'annullamento riproduce l'itinerario precedente. Non resuscita i vecchi commit,
perché i nuovi sono lo stesso lavoro con genitori diversi.

## Invia tutto

**Invia tutto** spinge ogni livello con `--force-with-lease` e si ferma lì — `gh
stack push` senza aprire niente. **Invia la pila come PR** fa lo stesso push e
poi il lavoro sulle PR; usa **Invia tutto** quando vuoi i rami sul remoto ma non
sei ancora pronto per la revisione.

## Invia lo stack come PR concatenate

**Invia lo stack come PR** fa in un clic quello che gli strumenti di stacking
fanno pagare:

1. Fa il push di ogni livello con `--force-with-lease` (i branch nuovi lo
   tollerano, quelli ristackati lo richiedono).
2. Apre una PR per ogni livello che ne è privo — ciascuna **basata sul branch
   genitore**, non su `main`, così ogni review mostra solo i propri commit.
   Titolo e descrizione vengono dai commit del livello stesso.
3. Cambia la base di qualsiasi PR esistente la cui base è andata alla deriva.
4. Scrive una **sezione di navigazione dello stack** nel corpo di ogni PR, così
   un reviewer su qualsiasi livello può vedere l'intera catena e dove si colloca
   questa PR al suo interno.

L'azione è **idempotente**: premila dopo ogni restack, nuovo livello o PR
mergiata e converge — niente viene duplicato, viene toccato solo ciò che è
andato alla deriva.

Quando la PR più in basso è stata **mergiata**, lo stesso pulsante ripulisce
dopo di lei: il figlio del livello mergiato viene riagganciato al trunk, il
livello smette di essere tracciato, il suo branch locale viene eliminato
(senza rischi — il trunk lo contiene in modo dimostrabile), la catena viene
ristackata e ogni PR rimasta cambia base. Fai il merge dal basso verso l'alto,
premi Invia, ripeti.

## Restack

Quando un branch più in basso cambia — hai sistemato i commenti della review su
`api` — ogni branch sopra di lui è adesso costruito sulla base sbagliata.
**Restack** fa il rebase a cascata dell'intera catena con `rebase --onto`, così
la riscrittura di un genitore non duplica i commit dentro i suoi figli. Dopo un
restack, premi di nuovo **Invia**: fa il force-push dei livelli riscritti e le
PR si aggiornano sul posto.

## Limiti

- Per ora l'invio è **solo per GitHub** (la creazione funziona su tutti e
  quattro gli host, ma il cambio di base e l'aggiornamento del corpo richiedono
  l'API di GitHub).
- La pulizia dopo il merge in basso vede i merge e i merge via rebase tramite
  la discendenza, e i merge con **squash** chiedendo a GitHub se la PR del
  branch è atterrata — quindi con un token GitHub ogni stile di merge viene
  ripulito. Su altri host, o senza token, per un livello mergiato con squash
  devi ancora smettere di tracciarlo a mano. Fai prima anche il fetch — il
  controllo di discendenza legge il trunk com'era al tuo ultimo fetch.
- La sezione dello stack nel corpo di una PR è mantenuta tra marcatori
  nascosti — la tua descrizione sopra di essa viene preservata.
- Riordinare e cambiare tronco **riscrivono la storia** su ogni livello toccato.
  I rami sono tuoi e i livelli non ancora inviati non costano nulla, ma un
  livello già in revisione riceverà un force-push al prossimo invio.
- Un livello si sposta di un posto alla volta. Due scambi sono due rebase, e
  fermarsi a metà è uno stato leggibile; un trascinamento che atterra tre posti
  più in là non lo è.
- Una tappa viene **rebasata**, quindi il ramo su cui atterra la pila non è mai
  anche una tappa, e nemmeno lo è un ramo **protetto** (`main` e `master`, se non
  cambi l'elenco). Entrambi vengono rifiutati invece di riscrivere in silenzio
  storia condivisa.
- Prima di aprire qualsiasi cosa, l'invio chiede al remoto quali rami sono
  davvero arrivati e nomina quelli che mancano. GitHub risponde a una head
  assente con un secco "Validation Failed", che non serve a nessuno.

## Dove vivono i collegamenti

I collegamenti ai genitori sono conservati nella **configurazione git**
(`git config`), quindi viaggiano con il repository e sopravvivono a un nuovo
clone. Niente vive dentro un servizio.

**Vedi anche:** [Rebase interattivo](rebase.md) · [Hosting e pull request](hosting.md)
