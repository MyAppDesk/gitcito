---
title: Rebase interattivo
category: Branch e chirurgia
order: 42
summary: Riordina, fai squash, fixup, reword, edit o drop — trascinando.
keywords: rebase interattivo squash fixup reword drop edit autosquash todo
---

# Rebase interattivo

La lista di cose da fare di `git rebase -i`, come un elenco che puoi trascinare.

![L'editor del rebase interattivo](../../screenshots/interactive-rebase.webp)

| Azione | Significa |
|---|---|
| **pick** | Tienilo com'è |
| **reword** | Tieni la modifica, cambia il messaggio |
| **squash** | Incorpora nel commit sopra, unendo i due messaggi |
| **fixup** | Incorpora nel commit sopra, scartando questo messaggio |
| **edit** | Fermati qui così puoi fare un amend |
| **drop** | Butta via il commit |

Trascina le righe per riordinarle. L'editor non si apre mai in un terminale —
è Gitcito a scrivere la todo al posto tuo.

## Autosquash, con un clic

- **Fai il fixup delle modifiche in stage dentro questo commit** crea il
  `fixup!` per te.
- **Autosquash da qui** incorpora ogni `fixup!` / `squash!` nel proprio bersaglio.

Se hai una pila di correzioni di review invece che una sola,
[absorb](absorb.md) capisce a quale commit appartiene ciascun hunk, così non devi
farlo tu.

> Il rebase riscrive la storia. Tutto ciò che è già stato pubblicato richiederà
> un force push, e chi l'aveva rivisto vorrà
> [cos'è cambiato da](range-diff.md).

**Vedi anche:** [Absorb](absorb.md) · [Cos'è cambiato da](range-diff.md) · [Recupero](recovery.md)
