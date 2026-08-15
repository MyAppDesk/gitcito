---
title: Rebase interativo
category: Branches e cirurgia
order: 42
summary: Reordene, faça squash, fixup, reword, edit ou drop — arrastando.
keywords: rebase interativo interactive rebase squash fixup reword drop edit autosquash todo
---

# Rebase interativo

A lista de tarefas do `git rebase -i`, como uma lista que você pode arrastar.

![O editor de rebase interativo](../../screenshots/interactive-rebase.webp)

| Ação | Significa |
|---|---|
| **pick** | Manter como está |
| **reword** | Manter a mudança, editar a mensagem |
| **squash** | Dobrar no commit acima, juntando as duas mensagens |
| **fixup** | Dobrar no commit acima, descartando esta mensagem |
| **edit** | Parar aqui para você poder fazer amend |
| **drop** | Jogar o commit fora |

Arraste as linhas para reordenar. O editor nunca abre num terminal — o Gitcito
escreve o todo por você.

## Autosquash, em um clique

- **Fixup das mudanças preparadas neste commit** cria o `fixup!` para você.
- **Autosquash a partir daqui** dobra cada `fixup!` / `squash!` no alvo dele.

Se você tem uma pilha de correções de revisão em vez de uma só, o
[absorb](absorb.md) descobre a qual commit cada hunk pertence, para você não
precisar descobrir.

> O rebase reescreve o histórico. Qualquer coisa já enviada vai precisar de um
> force-push, e quem revisou vai querer [o que mudou desde](range-diff.md).

**Veja também:** [Absorb](absorb.md) · [O que mudou desde](range-diff.md) · [Recuperação](recovery.md)
