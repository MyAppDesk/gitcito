---
title: Menu de contexto do repositório
category: Comece por aqui
order: 4
summary: Clique com o botão direito em qualquer chip ou aba de repositório para alias, worktrees, GitHub, terminal e remoção.
keywords: menu de contexto botão direito alias worktree github terminal mostrar editor remover aba repositório context menu right-click reveal editor remove repository tab
---

# Menu de contexto do repositório

Clique com o botão direito num repositório — uma aba avulsa, um chip dentro de
um grupo, um chip dentro de uma pasta aninhada, uma linha na lista de
boas-vindas/launcher, ou uma linha no dropdown de repositórios da barra de
ferramentas — e você recebe o mesmo menu com escopo de repositório. O chip do
grupo em si ainda abre o menu do grupo; o clique precisa cair no repositório.

![O menu de contexto do repositório num chip agrupado](../../screenshots/repo-context-menu.webp)

O dropdown de repositórios na barra de ferramentas lista todos os repositórios
abertos, do mesmo jeito que o dropdown de branches lista as branches. Clique
numa linha com o botão esquerdo para alternar para ela. Clique com o botão
direito numa linha (ou na própria pílula do repositório atual) para alias,
worktrees, GitHub, terminal, mostrar no gerenciador de arquivos, editor e
remoção. **Abrir repositório…** no rodapé abre o launcher.

![Clicando com o botão direito numa linha do dropdown de repositórios da barra de ferramentas](../../screenshots/repo-dropdown-context-menu.webp)

## O que cada ação faz

| Ação | Efeito |
|---|---|
| **Criar alias…** / **Alterar alias…** | Só um nome de exibição. O Gitcito nunca renomeia nem move a pasta no disco. O mesmo alias segue o repositório por abas, grupos e workspaces. |
| **Remover alias** | Aparece quando um alias existe. Restaura o nome da pasta. |
| **Mostrar worktrees** | Foca este repositório e abre a seção de worktrees da barra lateral. |
| **Nova worktree…** | O mesmo diálogo de criar worktree usado a partir de uma branch. Desabilitado enquanto o caminho está faltando ou um merge/rebase/cherry-pick/revert está em andamento. |
| **Copiar nome do repositório** | Copia o nome canônico da pasta, não o alias. |
| **Copiar caminho do repositório** | Copia o caminho absoluto. |
| **Ver no GitHub** | O origin se for github.com, senão o primeiro remoto GitHub interpretável. Desabilitado quando nenhum pode ser derivado. |
| **Abrir no terminal** | Abre o terminal do Gitcito com este repositório como diretório de trabalho. |
| **Mostrar no Finder / Explorador de Arquivos** | Destaca a pasta do repositório no gerenciador de arquivos da plataforma. |
| **Abrir no editor externo** | O editor configurado nas Configurações. Visível, mas desabilitado até um ser definido. |
| **Remover…** | Fecha a aba ou tira o chip do grupo. Usa o mesmo aviso de trabalho não commitado do botão **×**. Nunca apaga arquivos do disco. |

Um caminho faltando ou inválido mantém copiar, alias e remover disponíveis, e
acinzenta tudo que abriria ou inspecionaria o diretório.

**Veja também:** [Workspaces, abas e grupos](workspaces.md) · [Worktrees e submódulos](worktrees.md) · [Editor externo](editor.md) · [Terminal integrado](terminal.md)
