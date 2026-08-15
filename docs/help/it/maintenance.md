---
title: Manutenzione del repository
category: Repository e cronologia
order: 15
summary: Quanto costa il repository su disco, quanto di quello spazio è recuperabile, e cosa farebbe davvero ogni operazione di git.
keywords: manutenzione maintenance gc garbage collect repack prune fsck count-objects loose packed oggetti spazio su disco dimensione ottimizza commit-graph git maintenance pianificazione dangling
---

# Manutenzione del repository

Git non ti dice mai quanto costa un repository. Continua a funzionare qualunque
sia lo stato del suo database degli oggetti, quindi il primo segnale di guai è di
solito un clone che striscia o un portatile senza più disco — molto dopo il punto
in cui un solo comando avrebbe sistemato tutto.

Questo pannello è la lettura mancante: dov'è finito lo spazio, quanto ne è
recuperabile, e cosa fa ogni operazione prima che tu la lanci.

`⌘K` → **Manutenzione del repository**.

![L'uso del disco diviso fra impacchettato, sciolto e irraggiungibile, con sotto le operazioni di manutenzione](../../screenshots/maintenance.webp)

## Leggere i numeri

Tutto viene da `git count-objects -v` e da una vera camminata di
raggiungibilità — non si stima niente.

| Riga | Cos'è | Perché cresce |
|-----|-----------|--------------|
| **Impacchettati** | Oggetti dentro i packfile, compressi e in delta | Questo è lo stato sano |
| **Sciolti** | Un file per oggetto, a malapena compresso | Ogni commit e ogni fetch ne scrive |
| **Irraggiungibili** | Oggetti che nessuno punta più | Commit scartati, messaggi corretti con amend, rebase abbandonati |

Il conteggio accanto a **Sciolti** — *"n oggetti, m già impacchettati"* — è quello
da tenere d'occhio. Quegli `m` sono memorizzati due volte: una volta sciolti, una
volta dentro un pack. Sono pura duplicazione, ed è `git gc` a comprimerli.

**Irraggiungibile non significa ancora spazzatura.** Quegli oggetti sono il modo
in cui `git reflog` ti riporta indietro un commit che hai scaricato con un reset.
Git li conserva per due settimane apposta.

## Le operazioni

| Pulsante | Esegue | Costo |
|--------|------|------|
| **Ottimizza** | `git gc` | Da secondi a un minuto. È quasi sempre la risposta giusta |
| **Reimpacchetta da zero** | `git gc --aggressive` | Minuti su un repository grande. Ricalcola ogni delta |
| **Ricostruisci il commit graph** | `git commit-graph write --reachable` | Veloce. Rende sensibilmente più rapide le camminate di log e grafo |
| **Verifica l'integrità** | `git fsck --dangling` | Lento su un repository grande, non cambia niente |
| **Elimina subito gli irraggiungibili** | `git gc --prune=now` | Distrugge la rete di sicurezza del reflog |

**Ottimizza** è quello a cui ricorrere. Impacchetta gli oggetti sciolti, scarta
ciò che è irraggiungibile da più di due settimane e lascia recuperabile la storia
recente.

**Reimpacchetta da zero** è sopravvalutato. Butta via ogni delta esistente e
ricalcola dal nulla, il che richiede minuti e di solito fa risparmiare qualche
punto percentuale rispetto a un gc normale. Vale la pena farlo una volta dopo
aver importato una storia enorme; non vale la pena farlo di routine.

**Elimina subito gli irraggiungibili** chiede prima conferma, e la conferma dice
quanti oggetti e quanto spazio. Dopo, un commit che hai scaricato con un reset
un'ora fa è irrecuperabile — la voce di reflog può ancora essere elencata, ma
l'oggetto dietro non c'è più.

## Verifica dell'integrità

`git fsck` verifica che ogni oggetto referenziato da un altro oggetto sia
effettivamente presente e internamente coerente.

- **Gli oggetti penzolanti sono normali.** Sono quelli irraggiungibili, elencati
  per nome. Un repository che ne ha centinaia dopo un rebase è in salute.
- **Gli oggetti mancanti sono un danno** — una scrittura troncata, un disco
  guasto, un trasferimento interrotto. Se ne compare qualcuno, non reimpacchettare:
  reimpacchettare un database danneggiato può trasformare un problema recuperabile
  in uno permanente. Clona una copia buona dal tuo remote e portati dietro i
  branch non pubblicati con un [bundle](export.md).

## Manutenzione in background

La casella registra il repository presso **`git maintenance`**, che impacchetta e
prescarica secondo una pianificazione gestita dal tuo sistema operativo (launchd,
systemd o Utilità di pianificazione).

Qui non c'è niente di specifico di Gitcito: la stessa pianificazione serve anche
il tuo terminale, e `git maintenance unregister` la annulla da qualsiasi posto.
Togliere la spunta fa esattamente questo, e lascia in piedi la pianificazione per
tutti gli altri repository registrati.

## Limiti da conoscere

- **Il conteggio degli irraggiungibili richiede una camminata di raggiungibilità
  completa**, quindi aprire il pannello su un repository molto grande richiede un
  momento. Quello è il numero onesto, non una stima.
- **Le dimensioni sono quello che il disco cede**, non la lunghezza del
  contenuto. Un oggetto sciolto da 400 byte occupa comunque un blocco da 4 KB,
  ed è per questo che mille di essi costano megabyte — e per cui impacchettarli
  vale la pena.
- **Un worktree o un sottomodulo ha un proprio `.git`**, quindi la dimensione
  mostrata è solo quella di questo repository.
- **La manutenzione non può rimpicciolire la storia.** Se un blob da 400 MB sta
  dentro un commit, è raggiungibile, e gc lo terrà per sempre — quello è
  [rimuovere un file dalla storia](history-purge.md), un'operazione diversa e
  molto più dirompente.
- **Gitcito non esegue mai gc alle tue spalle.** Il `gc --auto` di git stesso può
  ancora farlo, come ha sempre fatto; se fallisce lascia una nota in
  `.git/gc.log`, che questo pannello porta in superficie.

Vedi anche: [Rimuovere un file dalla storia](history-purge.md) ·
[Bundle e archivi](export.md) · [Recupero](recovery.md)
