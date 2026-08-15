---
title: Recuperação e o reflog
category: Recuperação e proteção
order: 60
summary: A rede de proteção: reflog, snapshots de WIP e bisect.
keywords: reflog recuperação recovery desfazer undo commits perdidos snapshots wip bisect bisect run script automatizado código de saída restaurar hard reset
---

# Recuperação e o reflog

O git raramente perde alguma coisa. A parte difícil é achar de novo.

## Reflog

Todo movimento do `HEAD` — e de cada branch — com o que o causou: checkout, reset,
rebase, amend, um fetch forçado. De qualquer entrada passada você pode **fazer
checkout dela**, **criar uma branch a partir dela**, ou **dar hard reset para ela**.

![O visualizador de reflog](../../screenshots/reflog.webp)

Este é o botão de "acabei de resetar a branch errada".

## Snapshots de WIP

Trabalho não commitado é a única coisa que o reflog não consegue salvar, então o
Gitcito tira snapshots dele: suas mudanças rastreadas mais o índice preparado,
capturados como um commit de `git stash create` fixado em `refs/gitcito/wip`.

![Snapshots de WIP](../../screenshots/snapshots.webp)

- Ele **nunca toca na sua árvore de trabalho** e **nunca aparece na sua lista de
  stashes** — é uma ref escondida, não um stash.
- Tire um na mão, ou deixe rodar a cada **5 / 15 / 30 minutos**.
- Restaure ou apague qualquer snapshot pela lista.

## Bisect guiado

Marque commits como bons e ruins, veja o intervalo estreitar, e caia no primeiro
commit ruim. O Gitcito acompanha quantos passos faltam, então você sabe se está a
duas perguntas da resposta ou a dez.

![Bisect guiado](../../screenshots/bisect.webp)

### Deixe um comando decidir

Assim que o intervalo estiver semeado, **Deixe um comando decidir** entrega a busca
inteira ao `git bisect run`. O git faz checkout de cada candidato, roda o seu
comando, e lê o código de saída:

| Código de saída | Significa |
|-----------|-------|
| `0` | Bom — o bug não está aqui |
| `125` | Não dá para testar este; pule |
| qualquer outro | Ruim |

Uma suíte de testes já fala essa língua, que é por que `npm test` costuma ser a
resposta inteira. O Gitcito oferece os próprios scripts deste projeto como
preenchimentos em um clique, transmite a saída enquanto roda, e cai no primeiro
commit ruim sem você responder uma única pergunta.

![A caixa de comando, pronta para entregar a busca a uma suíte de testes](../../screenshots/bisect-run.webp)

**O que observar.** O comando roda em *todo* commit que o git testar, então um
comando que faz deploy, publica, ou escreve fora do repositório vai fazer isso
várias vezes. Mantenha-o em algo que só lê e reporta. **Parar** mata a execução e
deixa a sessão aberta, para você seguir marcando na mão; **Abortar** encerra o
bisect por completo.

Um comando que falha por um motivo não relacionado — uma dependência faltando
naquele ponto do histórico, digamos — marca um commit bom como ruim e manda a busca
para o lugar errado. Sair com `125` a partir de um script wrapper é a saída que o
git oferece para isso.

## Desfazer / refazer

A maioria das operações empilha uma entrada numa pilha de desfazer, então
<kbd>⌘Z</kbd> reverte a última onde o git permitir.

**Veja também:** [O que mudou desde](range-diff.md) · [Stashes](stashes.md)
