---
title: O grafo de commits
category: Repositório e histórico
order: 10
summary: Lendo o histórico: faixas, refs, colunas, filtros e seleção múltipla.
keywords: grafo graph histórico history commits faixas lanes branches merges colunas columns filtro filter linear first-parent
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

![Percorrendo os detalhes de um commit](../../screenshots/clip-commit-details.webp)

**Veja também:** [Blame e histórico do arquivo](blame.md) · [Busca](search.md) · [Máquina do tempo](time-machine.md)
