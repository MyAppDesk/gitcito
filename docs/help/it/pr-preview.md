---
title: Anteprima di una pull request
category: Sincronizzazione e più repo
order: 57
summary: Esegui la pull request di qualcun altro sulla tua macchina senza committare niente — su qualsiasi host, incluse le PR dai fork.
keywords: anteprima preview pull request merge request PR MR fork checkout locale prova test refs/pull refs/merge-requests pull-requests remote branch
---

# Anteprima di una pull request

Rivedere un diff in un browser ti dice se il codice si legge bene. Non ti dice se
l'applicazione parte ancora. Per scoprirlo devi eseguire il branch — ed è lì che
la gente si arena, perché una pull request da un fork vive in un repository che
non hai mai clonato, spesso uno su cui non puoi fare push.

L'anteprima locale risolve la cosa con un fatto che quasi nessuno ha bisogno di
imparare: le forge pubblicano la testa di ogni pull request come normale ref git
**sul repository di destinazione**. Il fork non deve essere raggiungibile, non ti
serve un token API e non viene aggiunto alcun secondo remote. Un fetch, e il
codice è sul tuo disco.

![Anteprima locale: scegli il remote, la pull request e come applicarla](../../screenshots/pr-preview.webp)

| Host | Dove vive la testa della PR |
|------|-------------------------|
| GitHub, GitHub Enterprise, Gitea, Forgejo, Gogs | `refs/pull/<n>/head` |
| GitLab (cloud e self-hosted) | `refs/merge-requests/<n>/head` |
| Bitbucket Cloud, Bitbucket Server | `refs/pull-requests/<n>/from` |
| Azure DevOps | `refs/pull/<n>/merge` |

Gitcito sonda tutti e quattro in un unico `ls-remote`, quindi una forge
sconosciuta o self-hosted funziona finché segue una di queste convenzioni.

## Aprirla

- L'elenco delle pull request nella barra laterale — il pulsante freccia su una
  voce qualsiasi. Questo funziona su ogni host, a differenza della vista di
  dettaglio, che è solo per GitHub.
- La tavolozza dei comandi: **Anteprima locale della pull request**.
- Dentro la vista di dettaglio di una pull request, accanto al pulsante "apri nel
  browser".

## Cosa le devi dare

**Remote** — il repository *contro* cui è stata aperta la pull request,
normalmente `origin`. Non il fork.

**Pull request** — il numero, o un URL del browser incollato. `7`, `#7` e
`https://github.com/owner/repo/pull/7` funzionano tutti; così come le forme di
URL di GitLab, Bitbucket e Azure DevOps. Premi **Trova** e Gitcito ti riporta il
ref che ha risolto e il commit che punta, prima che venga recuperato qualsiasi
cosa.

**Branch remoto** — la seconda scheda, per quando non c'è alcun ref di PR da
trovare: un host che non li pubblica, o semplicemente un branch che vuoi provare.
Indica il nome del branch così com'è sul remote.

## I due modi di applicarla

Nessuno dei due scrive un commit. È voluto — un'anteprima da cui non puoi
andartene non è un'anteprima.

| Modalità | Cosa succede | Come si annulla |
|------|--------------|-----------------|
| **Un branch locale** | Il ref viene recuperato su un branch tutto suo (`pr/7` di default) e ne viene fatto il checkout. Gli altri tuoi branch restano intatti. | L'annullamento torna al branch su cui eri ed elimina il branch di anteprima. |
| **Un merge che non hai committato** | Il ref viene fuso nel branch corrente con `--no-commit --no-ff`, lasciando l'albero combinato in stage così puoi compilarlo e provarlo. | L'annullamento interrompe il merge. |

Fare l'anteprima della stessa pull request due volte riusa lo stesso branch,
spostandolo sulla nuova testa — comodo quando l'autore pubblica una correzione
mentre stai provando. Quando quel branch esiste già, Gitcito lo dice e chiede
prima di resettarlo, perché qualunque commit che viva solo lì andrebbe perso.

## Cosa non farà

- **Non può inventarsi un ref che l'host non pubblica.** Alcune configurazioni
  self-hosted disabilitano i ref delle PR; certe forge non li hanno mai avuti.
  Ottieni un chiaro "nessun ref per #n" e la scheda del branch remoto come via
  d'uscita.
- **Non recupera i tag.** Un'anteprima non dovrebbe trascinarti nel repository lo
  spazio dei nomi dei tag di qualcun altro.
- **La modalità merge richiede un albero di lavoro pulito.** Git si rifiuta di
  fondere sopra lavoro non committato; prima fai [stash](stashes.md).
- **Un'anteprima non è una revisione.** Mette il codice sulla tua macchina — non
  approva, non commenta e non fonde niente. Quello è
  [hosting e pull request](hosting.md).
- **I fork privati restano privati.** Il ref della PR è servito dal repository di
  destinazione, quindi l'accesso segue le tue credenziali per *quel* remote —
  vedi [sicurezza](security.md).

## Fare pulizia

Un branch di anteprima è un branch ordinario: eliminalo dalla barra laterale
quando hai finito, oppure premi annulla subito dopo l'anteprima. Un merge di
anteprima lasciato non committato può essere scartato con l'annullamento, o
risolto e committato se hai deciso che lo vuoi davvero — momento in cui smette di
essere un'anteprima e diventa [un merge](merging.md).
