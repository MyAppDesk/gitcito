---
title: CI locale
category: Sincronizzazione e più repo
order: 58
summary: Esegui le GitHub Actions del repo in locale con act — prima che qualcosa venga pushato.
keywords: ci locale local ci act actions workflow runner docker pipeline test prima del push nektos verdict badge notes per-commit verdetto note per commit
---

# CI locale

Il ciclo push–attesa–croce rossa–correzione–push spreca dieci minuti a ogni
giro. Con [act](https://nektosact.com) gli stessi workflow girano in container
Docker sulla tua macchina, e Gitcito li pilota: scegli un workflow, premi
Esegui, guarda lo stesso log che stamperebbe la CI — prima che qualcosa lasci
la tua macchina.

![CI locale](../../screenshots/local-ci.webp)

## Un'integrazione, non un runtime incluso

Gitcito deliberatamente **non** include act né Docker — un'app che si trascina
dietro un runtime per container è l'opposto di un client git. È
un'integrazione opt-in: attivala in **Impostazioni → Integrazioni** (o nella
finestra stessa), e Gitcito rileva cosa è installato e ti guida per il resto —
`brew install act`, un demone Docker in esecuzione, fatto. Nulla viene eseguito
finché non sono vere tutte e tre le condizioni: attivata, act installato,
Docker raggiungibile.

## Cosa fa

- Elenca ogni workflow sotto `.github/workflows`, per `name:`.
- **Esegui** lancia il workflow con act sul tuo **albero di lavoro** — incluse
  le modifiche non committate, che è esattamente il punto: testare prima di
  committare, non dopo il push.
- L'output arriva in streaming nella finestra; **Stop** termina l'esecuzione.
  Uscita 0 mostra **Superato**, qualsiasi altro valore **Fallito** con il
  codice.

## Verdetti per commit sul grafo

![Verdetti Local-CI sul grafo](../../screenshots/local-ci-verdicts.webp)

Un'esecuzione conclusa appunta il suo risultato al commit che ha testato: una
piccola ampolla segna la riga in **verde o rosso** nel grafo, così vedi a colpo
d'occhio quali commit sono già sopravvissuti alla CI in locale. Il verdetto è
salvato come nota git sotto `refs/notes/gitcito-ci` — locale alla tua macchina,
mai pushato per impostazione predefinita.

Regola di onestà: il verdetto viene appuntato solo se il tuo albero di lavoro
era **pulito**. Un'esecuzione su modifiche non committate ha testato qualcosa
che nessun commit contiene, quindi mostra il risultato nella finestra ma non
segna nulla.

## Testa un commit o un intervallo — senza lasciare il tuo branch

La sezione **Testa un commit o un intervallo** della finestra esegue un
workflow su commit su cui *non* ti trovi. Ogni commit viene estratto **in
modalità detached in un worktree usa e getta** sotto la directory temporanea
di sistema, act gira lì, e il worktree viene rimosso comunque finisca
l'esecuzione — il tuo albero di lavoro e il tuo branch non si muovono mai.
Poiché quel checkout è immacolato per costruzione, il verdetto viene sempre
appuntato al commit testato. Un clic destro su un commit nel grafo offre
direttamente **Esegui la CI locale su questo commit**.

Il costo viene dichiarato prima che qualcosa parta, non scoperto dopo: digita
una revisione o un intervallo (`main..HEAD`, `HEAD~5..`, uno sha), premi
**Anteprima**, e Gitcito mostra quanti commit corrispondono alla specifica e
quali N più recenti — il budget esplicito, con un tetto di 50 — verrebbero
davvero eseguiti. Una passata li esegue **in sequenza** (act più Docker pesa
abbastanza da far litigare esecuzioni parallele per la macchina), trasmette il
log di ogni esecuzione, segna ogni commit superato/fallito in tempo reale, e
**Interrompi** annulla tra un commit e l'altro uccidendo quello in corso.
Aspettati minuti veri per ogni commit.

Un altro limite da conoscere: il worktree usa e getta contiene i file del
commit ma non i checkout dei submodule del tuo repository — un workflow che
dipende da submodule inizializzati si comporterà come su un clone appena fatto
senza di essi.

## Limiti

- act è un'ottima imitazione dei runner di GitHub, non perfetta: le action che
  richiedono servizi ospitati da GitHub, secret o immagini runner esotiche
  possono comportarsi diversamente. Un verde locale è una prova forte, non una
  garanzia.
- Una sola esecuzione alla volta per repository; avviarne un'altra annulla la
  prima.
- Solo esecuzioni a livello di workflow — scegliere singoli job, matrici o
  eventi è territorio di act; eseguilo nel [terminale](terminal.md) quando ti
  servono i flag.
- La prima esecuzione scarica le immagini dei runner — aspettati che una volta
  sia lenta.

**Vedi anche:** [Hosting e pull request](hosting.md) · [Terminale integrato](terminal.md)
