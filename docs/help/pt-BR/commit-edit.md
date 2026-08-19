---
title: Edite qualquer commit
category: Branches e cirurgia
order: 46
summary: Reescreva os arquivos ou a mensagem de um commit histórico no lugar — com a cascata em prévia antes.
keywords: editar commit edit reescrever rewrite história history amend passado reword corrigir erro de digitação typo cascata cascade replay rebase no lugar cirurgia
---

# Edite qualquer commit

O erro de digitação está num commit de três semanas atrás. A solução de sempre é
um rebase interativo: parar no commit, editar, continuar, rezar. A solução do
Gitcito: clique com o botão direito no commit, **Editar este commit**, mude o
texto, pronto. O botão de caneta no painel de detalhes do commit abre o mesmo
editor.

![Editando um commit histórico](../../screenshots/commit-edit.webp)

## O que ele faz

Escolha qualquer commit num caminho linear até o `HEAD`. O modal mostra os
arquivos e a mensagem dele; edite qualquer um dos dois. A partir daí acontecem
duas coisas:

1. **Prévia da cascata** reaplica cada commit acima do editado *em memória*
   (uma cadeia de cherry-picks via `merge-tree` — sem checkout, sem working
   tree, sem refs). Cada descendente aparece verde ou vermelho, então você sabe
   **antes de qualquer coisa se mover** se a edição se propaga limpa ou colide
   com uma mudança posterior.
2. **Reescrever a história** faz de verdade: a mesma cadeia é construída com
   plumbing, e então a branch se move com `reset --keep` — suas mudanças não
   commitadas são levadas junto, ou o reset aborta e nada aconteceu. Um
   [snapshot de guarda](recovery.md) é tirado antes, e o desfazer restaura a
   cadeia antiga.

Autoria e datas de cada commit reaplicado são preservadas; só os hashes mudam —
é isso que reescrever a história significa.

## Quando a cascata conflita

Um commit posterior tocou as mesmas linhas que você está editando. A prévia
marca esse commit em vermelho com os arquivos em conflito e a reescrita se
recusa a rodar — nada fica aplicado pela metade, nunca. Ou edite de outro jeito,
ou encare o conflito de frente com um [rebase interativo](rebase.md).

## Limites

- **Só história linear.** Um merge entre o commit e o `HEAD` desabilita a
  edição — reaplicar merges é um problema diferente e mais difícil.
- Arquivos binários e arquivos com mais de 2 MB são mostrados, mas não são
  editáveis.
- Um commit que já está num remote pode ser editado, mas o seu próximo push terá
  que ser um **force push** — o modal avisa antes de você se comprometer com
  isso.
- Arquivos deletados no commit não podem ser editados (não há conteúdo para
  editar).

**Veja também:** [Rebase interativo](rebase.md) · [Recuperação e o reflog](recovery.md) · [Absorb](absorb.md)
