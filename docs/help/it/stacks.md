---
title: Branch impilate
category: Branch e chirurgia
order: 43
summary: Catene di branch dipendenti, con un restack a cascata.
keywords: stack impilate branch graphite restack dipendenti catena genitore PR per livello
---

# Branch impilate

Uno stack è una catena di branch in cui ciascuno si costruisce su quello sotto:
`main → api → ui`. Rivedere tre PR piccole batte rivederne una enorme.

![Uno stack di branch](../../screenshots/branch-stack.webp)

Gitcito mostra lo stack dal basso verso l'alto con il numero di commit a ogni
livello, e ti permette di **aprire una PR per livello**, ciascuna diretta al
proprio genitore invece che a `main`.

## Restack

Quando un branch più in basso cambia — hai sistemato i commenti della review su
`api` — ogni branch sopra di lui è adesso costruito sulla base sbagliata.
**Restack** fa il rebase a cascata dell'intera catena con `rebase --onto`, così
la riscrittura di un genitore non duplica i commit dentro i suoi figli.

## Dove vivono i collegamenti

I collegamenti ai genitori sono conservati nella **configurazione git**, quindi
viaggiano con il repository e sopravvivono a un nuovo clone. Niente vive dentro
un servizio.

**Vedi anche:** [Rebase interattivo](rebase.md) · [Hosting e pull request](hosting.md)
