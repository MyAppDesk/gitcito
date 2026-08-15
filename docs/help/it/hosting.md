---
title: Hosting e pull request
category: Sincronizzazione e più repo
order: 56
summary: Crea PR ovunque; su GitHub puoi anche recensirle e fonderle.
keywords: pull request PR merge request GitHub GitLab Bitbucket Azure DevOps review revisione approva merge issue
---

# Hosting e pull request

## Creare

Crea una pull request (o merge request) senza uscire dall'app: menu a tendina per
i branch, titolo e corpo precompilati dai commit del branch, un interruttore per
la bozza e — su GitHub — revisori, etichette e assegnatari applicati alla
creazione.

![La creazione di una pull request](../../screenshots/create-pr.webp)

Funziona su **GitHub, GitLab, Bitbucket e Azure DevOps**. Le PR/MR aperte di
tutti e quattro sono elencate nella barra laterale.

Puoi partire dal confronto fra branch, dal grafo, dal `+` nel pannello delle PR,
oppure da una issue (che compila `Closes #N`).

## Revisione — GitHub

| | |
|---|---|
| **Conversazione** | Commenti e stato della revisione |
| **Controlli** | Le check-run della CI con esito/attesa e i link ai log |
| **File visti** | Una spunta ✓ per file, con l'avanzamento |
| **Thread inline** | Commenti di riga raggruppati per `file:line` con il loro hunk di diff, e le risposte |
| **Azioni** | Commenta, approva, richiedi modifiche, e merge / squash / rebase |

Se qualcuno fa un force push a metà revisione,
[cos'è cambiato da](range-diff.md) ti mostra esattamente cosa si è spostato.

## Issue, milestone, release — GitHub

Sfoglia le issue e apri una scheda completa per una di esse: corpo, commenti,
etichette, assegnatari, milestone, campi dei Projects v2, chiusura e riapertura,
e **crea un branch per questa issue** (con la denominazione affidata all'AI). Le
milestone mostrano l'avanzamento e le proprie issue. Le release sono sfogliabili
con una pagina di changelog.

## Notifiche — GitHub

Tutta la tua posta in arrivo — richieste di revisione, menzioni, attività della
CI — su ogni repository, con i filtri non letti/tutte e la marcatura come letto.
La campanella nella barra degli strumenti porta un badge dei non letti, e
notifiche desktop opzionali scattano quando ti viene chiesta una revisione o la
CI finisce.

## Token

Token per profilo per più account o organizzazioni, conservati nel portachiavi
del tuo sistema operativo. Gitcito può anche prendere in prestito quello che il
tuo **credential helper di git** già custodisce, quindi un'organizzazione per cui
ti sei già autenticato spesso non richiede alcuna configurazione. Vedi
[Sicurezza e segreti](security.md).

**Vedi anche:** [Branch impilate](stacks.md) · [Funzioni AI](ai.md)
