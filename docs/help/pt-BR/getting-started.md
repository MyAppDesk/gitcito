---
title: Primeiros passos
category: Comece por aqui
order: 1
summary: Abra um repositório, leia o grafo, faça seu primeiro commit.
keywords: introdução primeiros passos começar abrir clonar clone abas tabs grafo graph commit
---

# Primeiros passos

O Gitcito abre uma pasta e mostra o histórico dela. Nada é escrito no seu
repositório até você pedir.

![Um repositório recém-aberto, ainda sem nenhum commit](../../screenshots/empty-repo.webp)

## Abrir um repositório

- **Arraste uma pasta** para a janela, ou use **Abrir repositório** na tela de
  boas-vindas.
- **Clone** um a partir de uma URL ou direto do seu host — veja
  [clonagem](cloning.md) para as opções que deixam um repositório gigante rápido
  de clonar.
- Pelo terminal, `gitcito .` abre a pasta atual no app que já está rodando —
  veja [a linha de comando](cli.md).
- Uma pasta que ainda não é um repositório Git também abre, oferecendo
  inicializá-la.

## Os três painéis

| Painel | O que contém |
|---|---|
| Esquerdo | Branches, remotes, tags, stashes, worktrees — e a aba **Arquivos** para a árvore de trabalho |
| Central | O grafo de commits, e o que você selecionar nele |
| Direito | O compositor de commit, ou os detalhes do commit selecionado |

## Achando todo o resto

Dois caminhos, e eles levam aos mesmos lugares:

- **`⌘K`** (`Ctrl+K`) — a paleta de comandos. Digite o que você quer; ela também
  pula para branches, commits e arquivos.
- **Ferramentas** na barra de ferramentas — o mesmo conjunto, no escopo do
  repositório, em forma de menu, com a cauda longa dobrada em grupos para
  continuar legível.

![O menu Ferramentas: as ferramentas frequentes primeiro, o resto agrupado](../../screenshots/tools-menu.webp)

Quando a janela fica estreita, a barra de ações para de disputar espaço: os botões que não cabem mais recolhem-se em um menu **Mais** no final, na ordem da barra e com seus submenus. Alargue a janela e eles voltam.

Tudo o que se alcança por um se alcança pelo outro, então não existe nada que só
usuários avançados consigam encontrar.

## Seu primeiro commit

1. Edite um arquivo. Ele aparece em **Não preparados**.
2. Prepare-o — o arquivo inteiro, um hunk, ou [linhas isoladas](staging.md).
3. Escreva uma mensagem e aperte **Commit**.

Todo o resto no Gitcito é opcional.

