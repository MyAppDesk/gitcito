---
title: Opzioni di merge
category: Branch e chirurgia
order: 45
summary: Le opzioni di git merge per i merge che vanno storti sempre allo stesso modo — -X ours, spazi, squash, subtree.
keywords: merge opzioni strategia -X ours theirs ignore-space-change whitespace spazi squash no-ff ff-only no-commit subtree resolve ort recursive log --merge perché conflitto
---

# Opzioni di merge

Un merge normale è un pulsante, e quasi sempre la storia finisce lì. Questa
pagina è per le altre volte: il lockfile che si scontra a ogni merge, il file che
qualcuno ha reindentato, il progetto di terze parti i cui percorsi non
combaciano. Git ha le opzioni per tutti e tre da anni; sono solo sepolte in una
pagina di manuale che nessuno apre in mezzo a un conflitto.

Clic destro su un branch → **Merge con opzioni…** — sia nelle righe dei branch e
dei remote nella barra laterale *sia* sui badge colorati dei ref nel grafo, che
condividono lo stesso blocco di menu — oppure `⌘K` → **Merge con opzioni**.

![Le opzioni di merge, con sotto il comando git esatto scritto per esteso](../../screenshots/merge-options.webp)

Il comando viene stampato man mano che lo componi. Sta lì per essere confrontato
con il manuale — e per essere lanciato da terminale la prossima volta, senza
questa finestra.

## Quando un hunk va in conflitto

| Scelta | Flag | Significa |
|--------|------|-------|
| Fermati e chiedimelo | — | Il default. Lo risolvi tu |
| Tieni il lato di questo branch | `-X ours` | Gli hunk in scontro si risolvono con ciò che è già in checkout |
| Prendi il lato in arrivo | `-X theirs` | Gli hunk in scontro si risolvono con il branch in arrivo |

**`-X ours` non è `-s ours`.** L'opzione qui decide solo gli hunk che si scontrano
davvero; ogni altra modifica dell'altro branch si fonde normalmente. La strategia
chiamata `ours` — che Gitcito non offre — prende il tuo albero in blocco e butta
via l'altro lato, producendo un commit di merge che dichiara di contenere lavoro
che non contiene. Quella distinzione è la cosa più fraintesa in assoluto sui
merge di git.

**Non può decidere tutto.** Un conflitto modify/delete — un lato ha modificato un
file, l'altro l'ha eliminato — non è un hunk di contenuto, e `-X` lo lascia a te.
Ed è corretto: non esiste una versione di "preferisci i nostri" che risponda alla
domanda se un file eliminato debba tornare.

## Spazi

| Scelta | Flag |
|--------|------|
| Ignora le modifiche agli spazi esistenti | `-X ignore-space-change` |
| Ignora del tutto gli spazi | `-X ignore-space-at-eol`, `-X ignore-all-space` |

Il caso per cui esiste tutto questo: un branch ha reindentato un file (o l'ha
fatto un formattatore), l'altro ha modificato le stesse righe. Git vede due
modifiche sulla stessa riga e si ferma. Con gli spazi ignorati, la reindentazione
non è una modifica da soppesare, e la modifica vera passa.

Il risultato mantiene gli spazi dell'*altro* lato sulle righe che ha toccato,
quindi far girare poi il formattatore non è una cattiva idea.

## Cosa registrare

| Scelta | Flag | Con cosa ti lascia |
|--------|------|-----------------|
| Fast-forward quando possibile | — | Un commit di merge solo quando la storia è divergente |
| Fai sempre un commit di merge | `--no-ff` | Un commit di merge anche per un fast-forward, così il branch resta visibile per sempre nel grafo |
| Solo fast-forward, altrimenti rifiuta | `--ff-only` | Niente, se servisse un merge vero. Utile come controllo |
| Squash | `--squash` | Le modifiche in stage, nessun merge registrato, il commit da scrivere a te |
| Fondi ma non committare | `--no-commit` | Il merge in stage e in corso, così puoi prima ispezionarlo o correggerlo |

**Squash e `--no-commit` non sono la stessa cosa.** Lo squash dimentica del tutto
che ci sia stato un merge: git non registra alcun secondo genitore, e la prossima
volta il branch sembrerà non fuso. `--no-commit` è un merge in corso che sta
semplicemente aspettando te — `MERGE_HEAD` è impostato, e committare lo conclude
normalmente.

**`--ff-only` non fallisce in silenzio.** Se servisse un commit di merge, git
rifiuta e non si muove niente, ed è esattamente quello che ne fa un buon
controllo di sanità prima di un merge scriptato.

## Strategia

| Strategia | Serve per |
|----------|-----|
| Predefinita (`ort`) | Tutto. Il merge a tre vie moderno di git |
| `subtree` | I due lati vivono a percorsi diversi — un progetto incorporato in una sottodirectory di questo |
| `resolve` | Il vecchio merge a tre vie. Ogni tanto riesce dove `ort` si arrende su una storia intrecciata |

`-s subtree` è quella che vale la pena ricordare. Fondere gli aggiornamenti di un
progetto che sta in `vendor/parser/` altrimenti si leggerebbe come "ogni file
eliminato, ogni file aggiunto"; la strategia subtree calcola prima lo spostamento
dei percorsi. Vedi [subtree](subtree.md) per l'intero flusso di lavoro.

## Perché questo va in conflitto

Dentro il [risolutore di conflitti](conflicts.md) c'è un pulsante **Perché questo
va in conflitto**. Esegue `git log --merge` per il file che hai davanti ed
elenca, lato per lato, i commit che l'hanno toccato da quando i branch si sono
separati.

![I commit di ciascun lato che hanno toccato il file in conflitto](../../screenshots/conflict-why.webp)

I marcatori di conflitto dicono *cosa* si scontra. Questo dice *chi l'ha
cambiato, quando e perché* — che di solito è la domanda che decide davvero la
risoluzione, e il motivo per cui conviene andare a chiedere a qualcuno prima di
scegliere un lato.

Se non mostra niente, nessuno dei due lati ha committato una modifica
esattamente a questo file: lo scontro viene da una rinomina o dallo spostamento
di una directory più in alto.

## Limiti da conoscere

- **Le opzioni valgono per un solo merge.** Non vengono ricordate, e non cambiano
  la voce semplice **Fondi nel corrente** né il menu del trascinamento.
- **L'annullamento funziona comunque**: un merge eseguito con opzioni registra la
  stessa voce di annullamento, che fa un reset a `ORIG_HEAD`.
- **I merge a piovra** (più di due branch alla volta) non sono offerti qui.
- **Le voci "Fondi X in Y" per ref del menu dei commit** restano merge semplici.
  Usa il badge del ref quando vuoi le opzioni.
- **`-X` decide in silenzio.** Nulla segnala quali hunk sono stati risolti
  automaticamente, quindi su un merge importante leggi il diff dopo, invece di
  fidarti dell'assenza di conflitti.

Vedi anche: [Merge e rebase](merging.md) · [Conflitti](conflicts.md) ·
[Subtree](subtree.md) · [Radar dei conflitti](conflict-radar.md)
