---
title: Recuperação e o reflog
category: Recuperação e proteção
order: 60
summary: A rede de proteção: reflog, snapshots de WIP e bisect.
keywords: reflog recuperação recovery desfazer undo commits perdidos snapshots wip guarda guard não rastreados untracked descartar discard limpar clean bisect bisect run script automatizado código de saída restaurar hard reset
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
Gitcito tira snapshots dele: a **árvore de trabalho inteira — arquivos
modificados, preparados e não rastreados** — commitada por meio de um índice
descartável e fixada em `refs/gitcito/wip`. Nem o seu índice de verdade nem a
sua lista de stashes são tocados.

![Snapshots de WIP](../../screenshots/snapshots.webp)

Três coisas tiram um:

| Gatilho | Quando |
|---------|------|
| **Guarda** | Automaticamente, logo antes de uma ação destrutiva — descartar, clean, hard reset, restaurar de um commit. Ligada por padrão; ligue ou desligue no diálogo de snapshots. |
| **Timer** | A cada 5 / 15 / 30 minutos enquanto o repositório estiver aberto. |
| **Na mão** | O botão **Tirar snapshot agora**. |

A guarda é a que importa: o momento em que o trabalho costuma se perder para
sempre é o segundo depois de um descarte que você não queria. Com a guarda
ligada, aquele estado é um snapshot — abra a lista, clique em restaurar,
respire de novo.

Selecione um snapshot para ver os arquivos que ele capturou, pré-visualizar a
mudança de qualquer arquivo, e restaurar um **único arquivo** ou a árvore
inteira. Restaurar copia arquivos do snapshot por cima das cópias atuais — um
snapshot de guarda é tirado antes, então uma restauração é ela mesma
desfazível.

**Limites que vale a pena conhecer.** Um tique do timer ou da guarda que não
encontra nada de novo não registra nada. Restaurar sobrescreve e recria
arquivos, mas nunca apaga um arquivo que você criou depois do snapshot.
Arquivos ignorados não são capturados. Snapshots são refs locais escondidas:
nunca enviadas por push, a salvo do `git gc`, os 50 mais recentes são mantidos.

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
