---
title: Paleta de comandos e busca
category: Repositório e histórico
order: 11
summary: Pule para qualquer lugar, e dê grep na árvore ou no histórico.
keywords: paleta de comandos command palette busca search grep busca em código code search pickaxe encontrar fuzzy pular
---

# Paleta de comandos e busca

## A paleta — <kbd>⌘K</kbd>

Pule com busca aproximada para uma **branch** (faz checkout dela), um **commit**
(rola o grafo até ele), um **arquivo da árvore de trabalho**, ou uma **ação** —
fetch, pull, push, stash, terminal, reflog, configurações, e todo recurso deste
manual.

Ela aprende: o que você usou recentemente vem primeiro, e o que você usa com
frequência passa na frente do que você não usa.

![A paleta de comandos](../../screenshots/command-palette.webp)

## Busca em código — <kbd>⌘⇧F</kbd>

Duas perguntas diferentes, um diálogo só:

| Modo | Pergunta que ele responde |
|---|---|
| **Conteúdo** | "Onde está esta string agora?" — `git grep` sobre arquivos rastreados *e* não rastreados, com diferenciação de maiúsculas / palavra inteira / regex. |
| **Pickaxe no histórico** | "Quando esta string apareceu ou desapareceu?" — `git log -S` / `-G`. |

Os resultados voltam com destaque de sintaxe e a ocorrência marcada, agrupados por
arquivo e expansíveis até as linhas exatas. Clique num para abrir o arquivo naquela
linha, ou o commit que a introduziu.

![Resultados da busca em código](../../screenshots/code-search.webp)

## Filtrando o grafo

A caixa de busca acima do grafo filtra commits por mensagem, autor, SHA ou status
de deploy. Para "só os commits que tocaram neste arquivo", use o filtro por caminho
— veja [o grafo de commits](graph.md).

**Veja também:** [O grafo de commits](graph.md) · [Teclado e atalhos](keyboard.md)
