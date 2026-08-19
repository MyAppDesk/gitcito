---
title: Stash
category: Sincronizzazione e più repo
order: 52
summary: Stash parziali, applicazione per file e stash → branch.
keywords: stash parziale keep-index apply pop drop non tracciati branch
---

# Stash

Fare stash in Gitcito non è tutto o niente.

| Azione | Cosa fa |
|---|---|
| **Stash** | Tutto, compresi i file non tracciati se vuoi, con un messaggio |
| **Stash parziale** | Spunta solo i file che vuoi; opzionalmente `--keep-index` |
| **Applica / Pop** | Lo stash intero, oppure **solo alcuni dei suoi file** |
| **Stash → branch** | `git stash branch` — la via di fuga quando uno stash non si applica pulito |

Selezionando uno stash ne vedi i file e i diff, esattamente come per un commit.

L'elenco dei file si seleziona in gruppo con gli stessi gesti dello
[staging](staging.md) — clic <kbd>⌘</kbd>/<kbd>Ctrl</kbd>, clic <kbd>⇧</kbd>,
<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> — e un clic destro (o il pulsante
*Applica n file*) ripristina solo la selezione.

![Uno stash parziale: spunta solo i file che devono entrarci](../../screenshots/stash-partial.webp)

## Quando uno stash non si applica

Se applicare uno stash calpesterebbe dei file non tracciati, git si ferma.
Gitcito ti offre di sovrascriverli e riprovare, invece di lasciarti a scoprire la
formula magica.

Se l'albero si è spostato troppo, **stash → branch** ricrea il branch da cui lo
stash era stato preso, ce lo applica pulito ed elimina lo stash.

## Da non confondere con gli snapshot

Gli [snapshot del lavoro in corso](recovery.md) sono automatici e nascosti; gli
stash sono deliberati ed elencati. Gli snapshot non toccano mai il tuo elenco
degli stash.

**Vedi anche:** [Recupero](recovery.md) · [Staging](staging.md)
