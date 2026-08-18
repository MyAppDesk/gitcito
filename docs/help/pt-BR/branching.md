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

### Quando seu branch local está atrás

Ele é avançado (fast-forward) até a ponta do remoto durante o checkout. Uma
árvore de trabalho suja vai para um stash nomeado e é restaurada depois, para
que suas edições locais não abortem a atualização.

### Quando seu branch local está à frente

Se o branch local está à frente e o remoto não tem nada novo, fazer checkout
responderia a um pedido pelo branch *remoto* com o seu próprio trabalho não
enviado — então nada é trocado até você dizer de que lado estava falando:

| Escolha | O que acontece |
|---------|----------------|
| Fazer checkout do local | Muda para o branch local, com os commits intactos. O que todo outro cliente faz em silêncio. |
| Redefinir (soft) | Leva o branch de volta à ponta do remoto; as alterações dos commits ficam **no stage**, prontas para recommitar. |
| Redefinir (mixed) | O mesmo movimento, com as alterações **fora do stage** na árvore de trabalho. |
| Redefinir (hard) | Descarta os commits *e* suas alterações. |

![O diálogo de branch à frente: checkout do local, ou reset soft, mixed ou hard](../../screenshots/ahead-checkout.webp)

Deixe *Criar antes um branch de backup* marcado e a ponta local é salva como
`backup/<branch>-<carimbo-de-tempo>` antes de qualquer movimento, de modo que até
um reset hard fica a um checkout de ser desfeito. O reset também entra na pilha
de desfazer (⌘Z), mas só até você fechar o repositório — o branch de backup dura
mais.

**Limites:** o diálogo só compara o branch com a referência de rastreamento
recém-buscada, então um remoto que recusou o fetch (offline, credenciais
inválidas) é comparado com a última ponta conhecida. Ele não diz se seus commits
são *bons* — apenas que existem aqui e não lá.

**Veja também:** [Merge e rebase](merging.md) · [Worktrees](worktrees.md)
