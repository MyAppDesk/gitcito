---
title: Branches empilhadas
category: Branches e cirurgia
order: 43
summary: Correntes de branches dependentes, com um restack em cascata.
keywords: stack pilha branches empilhadas stacked graphite restack dependente corrente pai parent PR por nível
---

# Branches empilhadas

Uma pilha é uma corrente de branches em que cada uma se constrói sobre a de baixo:
`main → api → ui`. Revisar três PRs pequenos é melhor que revisar um PR enorme.

![Uma pilha de branches](../../screenshots/branch-stack.webp)

O Gitcito mostra a pilha de baixo → cima com a contagem de commits em cada nível, e
deixa você **abrir um PR por nível**, cada um mirando no seu pai em vez de mirar
na `main`.

## Restack

Quando uma branch mais abaixo muda — você atendeu aos comentários de revisão na
`api` — toda branch acima dela passa a estar construída sobre a base errada. O
**Restack** faz rebase em cascata da corrente inteira com `rebase --onto`, de forma
que a reescrita de um pai não duplique commits nos filhos.

## Onde os vínculos ficam

Os vínculos de pai são guardados no **git config**, então viajam com o repositório
e sobrevivem a um novo clone. Nada mora num serviço.

**Veja também:** [Rebase interativo](rebase.md) · [Hosting e pull requests](hosting.md)
