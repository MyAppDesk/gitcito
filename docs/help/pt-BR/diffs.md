---
title: Diffs e pré-visualizações
category: Lendo mudanças
order: 20
summary: Visão dividida, destaque em nível de palavra, diff de imagens e pré-visualização de arquivos.
keywords: diff split dividido lado a lado side-by-side palavra word level espaços em branco whitespace imagem image diff preview pré-visualização markdown docx pdf
---

# Diffs e pré-visualizações

## Lendo um diff

| Alternância | O que faz |
|---|---|
| **Unificado ↔ dividido** | Lado a lado quando você quer comparar, empilhado quando você quer ler |
| **Nível de palavra** | Destaca só os tokens alterados dentro de uma linha editada — vermelho no antigo, verde no novo |
| **Ignorar espaços em branco** | Esconde reindentação para a mudança de verdade aparecer |
| **Quebrar linha** (só na visão lado a lado) | Quebra linhas longas dentro da coluna em vez de rolá-las |
| **Vinculado** (lado a lado, sem quebra) | Rola as duas metades juntas, na vertical e na horizontal — desligado, cada coluna rola sozinha |
| <kbd>⌘F</kbd> | Buscar dentro do diff, com navegação para o próximo/anterior |

A quebra vem desligada: uma linha ocupa uma única fileira, então os dois lados
continuam comparáveis fileira a fileira, e cada metade rola na horizontal com a
própria barra. Ligue quando preferir ler uma linha longa a persegui-la — em
troca, uma linha dobrada em três fileiras deixa de ficar de frente para sua
contraparte. Cada interruptor lembra o estado entre arquivos e sessões.

Sem quebra, as duas metades rolam **vinculadas** por padrão — na vertical, o
que mantém as fileiras de frente uma para a outra, e na horizontal, então a
coluna 90 da esquerda fica sobre a 90 da direita. Desvincule quando os lados
tiverem se afastado — um bloco indentado contra um sem indentação, uma
renomeação que deslocou cada linha — ou quando quiser comparar duas regiões
distantes do mesmo arquivo, e deixe cada metade onde está o seu conteúdo.

![Diff dividido com destaque em nível de palavra](../../screenshots/split-diff.webp)

Acima de todo diff fica o [resumo semântico](semantic-diff.md) — o que mudou,
símbolo por símbolo, em vez de linha por linha.

## Diff de imagens

Imagens alteradas ganham uma comparação de verdade: lado a lado, ou uma alça de
arrastar entre o antes e o depois.

![Diff de imagem](../../screenshots/image-diff.webp)

## Pré-visualize qualquer coisa

O modo **Pré-visualização** renderiza o arquivo em vez de mostrar o código-fonte
dele: Markdown, Word (`.docx`), Excel (`.xlsx`), PDF, vídeo, áudio, imagens, e
código com destaque de sintaxe para todo o resto.

![Pré-visualização de Markdown](../../screenshots/markdown-preview.webp)

## Aba de arquivos

A aba **Arquivos** da barra lateral esquerda navega pela própria árvore de
trabalho, com selos de status nas pastas (adicionado / modificado / removido) que
agregam o que está dentro delas.

![A aba de arquivos com uma pré-visualização](../../screenshots/file-tree.webp)

![Selos de pasta somando o que mudou dentro de cada uma](../../screenshots/tree-badges.webp)

**Veja também:** [Diff semântico](semantic-diff.md) · [Staging](staging.md)
