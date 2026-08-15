---
title: Branches, remotes e a barra lateral
category: Branches e cirurgia
order: 40
summary: Tudo o que a barra lateral esquerda faz, e branches fixadas.
keywords: branch branches criar create checkout renomear rename apagar delete remote fixada pinned barra lateral sidebar presença
---

# Branches, remotes e a barra lateral

Uma única barra lateral, reordenável e pesquisável, guarda **branches, remotes,
tags, stashes, worktrees e submódulos**. Toda seção pode ser escondida ou
reordenada (Configurações → Layout), e a caixa de filtro vale para todas elas.

![A barra lateral, com as branches fixadas seguras no topo](../../screenshots/pinned-branches.webp)

## Branches

Criar, fazer checkout, renomear e apagar — locais e remotas. As linhas de branch
mostram:

- **↑à frente / ↓atrás** em relação ao upstream delas,
- **selos de presença por remote** (quais remotes têm esta branch),
- um **ponto de risco** depois de uma varredura do [radar de conflitos](conflict-radar.md),
- um **marcador ⟳** quando o remote [reescreveu o histórico](range-diff.md).

Branches com `/` no nome se dobram automaticamente em pastas colapsáveis.

![Nomes de branch separados por barra dobrados numa árvore](../../screenshots/branch-grouping.webp)

## Branches fixadas

Marque com estrela as branches às quais você sempre volta — passe o mouse na linha
e clique em ★, ou clique com o botão direito → *Fixar branch*. Elas aparecem num
grupo **Fixadas** no topo da seção Locais, lembradas por repositório, sem sair do
lugar normal delas mais abaixo.

## Fazendo checkout de uma branch remota

Dê duplo clique numa branch remota para criar a branch local que a rastreia. Se
uma branch local com esse nome já existir e tiver **divergido**, o Gitcito pergunta
como reconciliar — rebase, merge ou reset — e oferece fazer backup da branch antes.

![O aviso de branch divergente: rebase, merge ou reset, com uma opção de backup](../../screenshots/diverged-checkout.webp)

**Veja também:** [Merge e rebase](merging.md) · [Worktrees](worktrees.md)
