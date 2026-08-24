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
Quais seções e pastas você deixa abertas ou fechadas fica lembrado por
repositório, mesmo depois de reiniciar.

![A barra lateral, com as branches fixadas seguras no topo](../../screenshots/pinned-branches.webp)

## Branches

Criar, fazer checkout, renomear e apagar — locais e remotas. As linhas de branch
mostram:

- **↑à frente / ↓atrás** em relação ao upstream delas,
- **selos de presença por remote** (quais remotes têm esta branch),
- um **ponto de risco** depois de uma varredura do [radar de conflitos](conflict-radar.md),
- um **marcador ⟳** quando o remote [reescreveu o histórico](range-diff.md).

Branches com `/` no nome se dobram automaticamente em pastas colapsáveis.
Clique com o botão direito no cabeçalho de uma pasta para agir sobre o grupo
inteiro: *Excluir todas as branches em `feature` (4 branches)* remove tudo o
que há dentro após uma única confirmação que lista exatamente quais branches se
vão — a branch em que você está fica de fora. O mesmo menu existe nas pastas de
branches remotas, excluindo do remote.

O menu suspenso de branches na barra de ferramentas lista branches locais e
remotos. Clique com o botão direito em qualquer branch desse menu para
renomear um branch local, copiar seu nome, abri-lo em um novo worktree,
mesclá-lo no branch ativo ou excluí-lo. Branches remotos omitem a renomeação
e são excluídos do remoto após confirmação. O Gitcito omite a mesclagem
quando a referência selecionada já está contida no branch ativo e desativa a
criação de worktree quando esse branch já está em checkout.

![Ações de branch local no menu suspenso da barra de ferramentas](../../screenshots/branch-dropdown-local-context-menu.webp)

![Ações de branch remoto no menu suspenso da barra de ferramentas](../../screenshots/branch-dropdown-remote-context-menu.webp)

As linhas se selecionam em grupo como arquivos: clique com <kbd>⌘/Ctrl</kbd>
alterna uma linha, clique com <kbd>Shift</kbd> seleciona um intervalo, e
<kbd>Shift</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> amplia a seleção a partir da última
linha clicada. Clique com o botão direito na seleção para o menu em lote —
*Excluir 4 branches* — que confirma com a lista completa. Os mesmos gestos
funcionam em branches remotas, tags e stashes.

![Nomes de branch separados por barra dobrados numa árvore](../../screenshots/branch-grouping.webp)

## Renomeando uma branch

Uma branch chamada `fix` três dias atrás é uma branch que hoje ninguém situa.
Renomeie de onde você percebeu o problema:

| Onde | Como |
|------|------|
| Barra lateral | Clique com o botão direito na branch → *Renomear…* |
| Dropdown de branches na barra de ferramentas | Clique com o botão direito na branch → *Renomear…* |
| Grafo de commits | Clique com o botão direito no selo da branch em um commit → *Renomear…* |
| Paleta de comandos | <kbd>⌘/Ctrl</kbd>+<kbd>K</kbd> → *Renomear branch* (age na branch atual) |

Uma renomeação local é `git branch -m`: instantânea e **desfazível com ⌘Z** — a
entrada de desfazer devolve o nome antigo. Renomear a branch em que você está
mantém você nela.

Quando a branch acompanha um remoto, o menu também oferece *Renomear (incl. no
remoto)…*, que renomeia localmente, envia o nome novo e apaga o antigo no
remoto. Isso **não é desfazível** — a branch remota antiga se foi, e quem a
tinha em checkout precisa reapontar. Num selo do grafo, só aparece quando a
branch acompanha exatamente um remoto; com vários, escolha a branch na barra
lateral para o upstream ficar inequívoco.

**Limites:** o Gitcito não reescreve nada que referenciava o nome antigo — pull
requests abertos continuam apontando para a branch com que foram abertos, e
regras de CI que casam com um padrão de branch deixam de casar. Renomear uma
branch que está em checkout em outro [worktree](worktrees.md) falha, e o git diz
isso.

## Pull e push de uma branch em que você não está

Clique com o botão direito em qualquer branch local: as entradas **Pull** e
**Push** agem sobre *aquela* branch, não sobre a que está em checkout — sem
desvio para colocar três branches em dia. Veja [fetch, pull e push](syncing.md).

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
