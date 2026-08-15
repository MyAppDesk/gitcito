---
title: Hook e .gitignore
category: Strumenti dell'area di lavoro
order: 92
summary: Gestisci gli hook di git e ignora i file senza modificarli a mano.
keywords: hooks hook pre-commit husky core.hooksPath gitignore ignora untrack
---

# Hook e .gitignore

## Hook

Elenca ogni hook del repository, mostra quali sono veri e quali sono ancora
`.sample`, e permette di abilitarli, disabilitarli, modificarli o crearli.

![Il gestore degli hook](../../screenshots/hooks.webp)

Gitcito rileva un `core.hooksPath` personalizzato (husky e simili) e la
configurazione di un **framework pre-commit**, e ti dice quando gli hook vivono
da qualche altra parte rispetto a `.git/hooks` — altrimenti modificheresti un
file che git non esegue mai.

> Per i commit fatti da Gitcito gli hook girano esattamente come per
> `git commit`. Un hook che fallisce blocca il commit, e il suo output torna
> dentro l'errore.

## .gitignore intelligente

Clic destro su un file → **Ignora**, e scegli:

| Scelta | Scrive |
|---|---|
| Questo file | `path/to/file.log` |
| Tutti i `*.ext` | `*.log` |
| L'intera cartella | `path/to/folder/` |

![Il selettore per .gitignore](../../screenshots/gitignore-chooser.webp)

La regola finisce nel `.gitignore` della **cartella più vicina**, o nella radice
del repository, con un'anteprima dal vivo della riga prima che tu la confermi. I
file già tracciati ottengono un **Ignora e togli dal tracciamento** nella stessa
finestra.

**Vedi anche:** [Sicurezza e segreti](security.md) · [Staging](staging.md)
