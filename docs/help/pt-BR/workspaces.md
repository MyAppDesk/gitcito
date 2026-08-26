---
title: Workspaces, abas e grupos
category: Comece por aqui
order: 3
summary: Muitos repositórios sem se afogar: abas, grupos, pastas e workspaces.
keywords: workspace workspaces abas tabs grupos groups pastas folders múltiplos repositórios organizar alternar layout
---

# Workspaces, abas e grupos

Três níveis, do mais solto ao mais apertado.

## Abas

Um repositório, uma aba. Use <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> para abrir o
seletor de nova aba e <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> para fechar a aba ativa.
Você também pode arrastar para reordenar, clicar com o botão do meio para fechar,
ou apertar <kbd>⌘⇧T</kbd> para reabrir a última que fechou. Clique com o botão
direito numa aba de repositório (ou num chip dentro de um [grupo](#grupos)) para
o [menu de contexto do repositório](repo-menu.md) — alias, worktrees, GitHub,
terminal, mostrar no gerenciador de arquivos, editor e remoção. Feche a última
aba e o <kbd>⌘W</kbd> fecha a janela. Um ponto na aba significa trabalho não commitado;
um ponto diferente significa conflitos.

Se um aviso de fechamento aparecer, <kbd>Escape</kbd> sempre cancela.
<kbd>Enter</kbd> confirma apenas quando a aba está limpa — quando há mudanças não
commitadas ou conflitos, o aviso deliberadamente obriga você a ir até o botão,
para que uma tecla apertada por engano depois do <kbd>⌘W</kbd> não feche um
trabalho que você ainda estava segurando.

## Grupos

Junte repositórios relacionados numa **aba de grupo** nomeada e com cor. Dentro de
um grupo você ganha uma segunda linha com um chip por repositório, e o próprio
grupo pode fazer **Fetch em todos** ou **Pull em todos** de uma vez.

![Uma aba de grupo com vários repositórios](../../screenshots/repo-groups.webp)

Grupos podem conter **pastas, aninhadas em qualquer profundidade**: clique com o
botão direito no grupo → *Nova pasta…*, e depois arraste repositórios para o chip
da pasta. Cada pasta ganha uma cor, colapsa num chip com contagem, agrega os
pontos de status de tudo que está dentro dela, e pode fazer fetch ou pull de toda
a sua subárvore.

![Pastas na faixa de abas do grupo, cada uma um chip com contagem — Internal aninhada dentro de Services](../../screenshots/nested-folders.webp)

> Pastas só organizam. Apagar uma sobe os repositórios dela para a pasta-mãe —
> nunca fecha um repositório.

## Páginas que pertencem a um repositório

Algumas páginas não são coisa à parte: a [wiki](repo-wiki.md) de um
repositório, seus [insights](insights.md), as [dev tools](devtools.md) que uma
sessão de launch anunciou. Elas não tomam uma aba — aparecem como ícones
pequenos no próprio repositório.

- **Clique num ícone** para mostrar a página. **Clique de novo — ou clique no
  nome do repositório** — para voltar ao repositório. Enquanto uma página está
  aberta, o nome ganha cursor de mãozinha e uma pastilha ao passar o mouse: é o
  caminho de volta.
- **Passe o mouse num ícone** para o ✕ que fecha só aquela página.
- Dentro de um **grupo**, os ícones ficam no chip do repositório a que
  pertencem, e só enquanto aquele repositório é o selecionado. Escolher outro
  repo do grupo mostra *aquele* repositório, não a ferramenta do vizinho.
- Reabrir a mesma página acende o ícone que já existe, em vez de somar outro.

Um repositório que não está aberto em lugar nenhum não tem ícone para carregar,
então uma página dele abre em aba própria — abrir algo sempre abre algo.

## Workspaces

Um workspace é uma **faixa de abas inteira, salva**. Alternar troca todas as abas
de uma vez: `Trabalho` e `Pessoal` param de pisar um no outro.

O nome do workspace fica no canto superior esquerdo, ao lado da marca do Gitcito.
Clique nele para alternar, criar, renomear, reordenar ou apagar. Ao lado dele fica
o medidor que abre a [Central de controle](mission-control.md) do workspace em que
você está.

**Veja também:** [Central de controle](mission-control.md) · [A linha de comando](cli.md)
