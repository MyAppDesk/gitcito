---
title: Branches empilhadas
category: Branches e cirurgia
order: 43
summary: Correntes de branches dependentes — restack em cascata e PRs encadeados com um clique.
keywords: stack pilha branches empilhadas stacked graphite restack dependente corrente pai parent PR por nível submit enviar autopilot piloto automático retarget mudar base
---

# Branches empilhadas

Uma pilha é uma corrente de branches em que cada uma se constrói sobre a de baixo:
`main → api → ui`. Revisar três PRs pequenos é melhor que revisar um PR enorme.

![Uma pilha de branches](../../screenshots/branch-stack.webp)

O Gitcito mostra a pilha de baixo → cima com a contagem de commits em cada
nível. Cada nível que tem um PR aberto carrega o número dele como um chip —
clique nele para abrir o PR.

## Envie a pilha como PRs encadeados

**Enviar pilha como PRs** faz com um clique o que as ferramentas de stacking
cobram para fazer:

1. Faz push de cada nível com `--force-with-lease` (branches novas toleram,
   as que passaram por restack precisam).
2. Abre um PR para cada nível que não tem um — cada um **baseado na branch
   pai**, não na `main`, de forma que cada revisão mostre apenas os próprios
   commits. Título e descrição vêm dos commits do próprio nível.
3. Muda a base de qualquer PR existente cuja base tenha derivado.
4. Escreve uma **seção de navegação da pilha** no corpo de cada PR, para que um
   revisor em qualquer nível veja a corrente inteira e onde este PR se encaixa
   nela.

A ação é **idempotente**: aperte depois de cada restack, novo nível ou PR
mesclado e ela converge — nada é duplicado, só o que derivou é tocado.

Quando o PR de baixo foi **mesclado**, o mesmo botão limpa o que ficou: o
filho do nível mesclado passa a ter o trunk como pai, o nível deixa de ser
rastreado, a branch local dele é apagada (sem risco — o trunk comprovadamente
a contém), a corrente passa por restack e todos os PRs restantes têm a base
atualizada. Mescle de baixo para cima, aperte Enviar, repita.

## Restack

Quando uma branch mais abaixo muda — você atendeu aos comentários de revisão na
`api` — toda branch acima dela passa a estar construída sobre a base errada. O
**Restack** faz rebase em cascata da corrente inteira com `rebase --onto`, de forma
que a reescrita de um pai não duplique commits nos filhos. Depois de um restack,
aperte **Enviar** de novo: ele faz force-push dos níveis reescritos e os PRs se
atualizam no lugar.

## Limites

- O envio é **só para o GitHub** por enquanto (a criação funciona nos quatro
  hosts, mas mudar a base e atualizar o corpo exigem a API do GitHub).
- A limpeza após o merge de baixo enxerga merges e merges por rebase pela
  ancestralidade, e merges por **squash** perguntando ao GitHub se o PR da
  branch foi integrado — então, com um token do GitHub, todo estilo de merge é
  limpo. Em outros hosts, ou sem um token, um nível mesclado com squash ainda
  precisa deixar de ser rastreado à mão. Faça fetch antes, também — a
  verificação de ancestralidade lê o trunk como estava no seu último fetch.
- A seção da pilha no corpo de um PR é mantida entre marcadores ocultos — a sua
  própria descrição acima dela é preservada.

## Onde os vínculos ficam

Os vínculos de pai são guardados no **git config**, então viajam com o repositório
e sobrevivem a um novo clone. Nada mora num serviço.

**Veja também:** [Rebase interativo](rebase.md) · [Hosting e pull requests](hosting.md)
