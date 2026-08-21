---
title: O grafo de commits
category: Repositório e histórico
order: 10
summary: Lendo o histórico: faixas, refs, colunas, filtros e seleção múltipla.
keywords: grafo graph histórico history commits faixas lanes branches merges colunas columns filtro filter linear first-parent amend desfazer undo reset github
---

# O grafo de commits

Branches, merges e merges polvo desenhados direito, no claro ou no escuro. A
renderização é por janela, então um repositório com cem mil commits rola como um
com cem.

| | |
|---|---|
| ![Grafo de commits, claro](../../screenshots/graph-light.webp) | ![Grafo de commits, escuro](../../screenshots/graph-dark.webp) |

## Se movimentando

- <kbd>↑</kbd> <kbd>↓</kbd> (ou <kbd>j</kbd> <kbd>k</kbd>) andam com a seleção.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd>-clique alterna um commit numa **seleção múltipla**;
  <kbd>⇧</kbd>-clique pega um intervalo. Com vários selecionados, clique com o
  botão direito para fazer cherry-pick deles na branch atual, dar squash numa
  sequência contígua, exportar um patch combinado, ou copiar os SHAs.
- Commits que chegaram no seu **último fetch ou pull** são sinalizados como novos.
- Clique com o botão direito num commit para **Amend**, **Desfazer**,
  **Resetar para o commit…** e **Ver no GitHub**, além de checkout, cherry-pick,
  revert, branch, tag e cópia. Ações inseguras continuam visíveis e se
  desabilitam.

## Fazendo o grafo mostrar o que você quer

- A **visão linear** (first-parent) esconde tudo que foi mesclado para dentro,
  deixando o tronco.
- **Filtrar por caminho**: clique com o botão direito num arquivo ou pasta →
  *Filtrar grafo por este caminho*, e só os commits que o tocaram continuam acesos.

![Grafo filtrado até um único caminho](../../screenshots/graph-path-filter.webp)

- **Colunas**: mostre, esconda, redimensione e reordene as colunas de branch,
  mensagem, autor, data, SHA, assinatura e deploy.
- **Estilo**: Configurações → Temas → **Grafo** — paleta de faixas (8 nativas,
  personalizada ou gerada por IA), estilo de canto, densidade das linhas e
  espessura dos traços, com uma pré-visualização ao vivo em mini-grafo.

![Configurações de estilo do grafo com pré-visualização ao vivo](../../screenshots/settings-graph.webp)

## Detalhes do commit

Selecionar um commit mostra os arquivos alterados dele (em árvore ou plano), autor,
SHA, coautores e a assinatura. Referências `#123` e `@menções` viram links
automáticos para o seu host.

A lista de arquivos se seleciona em grupo com os gestos de sempre (clique com
<kbd>⌘</kbd>/<kbd>Ctrl</kbd>, clique com <kbd>⇧</kbd>,
<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd>). Clique com o botão direito na seleção
→ *Restaurar {n} arquivos na árvore de trabalho* pega esses arquivos exatamente
como este commit os tinha: depois de uma única confirmação sobrescreve as
cópias de trabalho, sem tocar em HEAD nem no índice.

![Percorrendo os detalhes de um commit](../../screenshots/clip-commit-details.webp)

**Veja também:** [Blame e histórico do arquivo](blame.md) · [Busca](search.md) · [Máquina do tempo](time-machine.md)
