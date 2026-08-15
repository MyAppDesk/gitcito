---
title: Blame e histórico do arquivo
category: Lendo mudanças
order: 22
summary: Quem escreveu esta linha, quando, e como ela era antes.
keywords: blame histórico history arquivo file linha line autor author anotar annotate reblame seguir follow
---

# Blame e histórico do arquivo

Abra qualquer arquivo e troque o modo de visualização: **Pré-visualização ·
Arquivo · Diff · Blame · Histórico**.

![Blame, com o commit por trás de cada linha na margem](../../screenshots/blame.webp)

## Blame

Cada linha carrega seu commit, autor e data, com cores por commit para que os
blocos de história compartilhada fiquem óbvios de relance.

- **Siga a linha até o diff**: pule de uma linha do blame direto para a mudança
  que a produziu.
- **Reblame antes deste commit**: clique com o botão direito numa linha para
  culpar o arquivo como ele era *antes* daquele commit — é assim que você caminha
  para trás na história de uma linha sem sair da tela.

## Histórico

Todo commit que tocou neste arquivo, do mais novo para o mais antigo. Selecionar
um mostra a versão do arquivo naquele commit, então você pode folhear como ele
cresceu.

![Todo commit que tocou num arquivo, do mais novo para o mais antigo](../../screenshots/file-history.webp)

Para o repositório inteiro em vez de um arquivo só, use a
[máquina do tempo](time-machine.md).

## Passe o mouse para explicar

Com a IA ligada, segurar <kbd>⇧</kbd> (configurável, ou tecla nenhuma) e apontar
para um identificador dá uma explicação de uma linha sobre ele, mais as linhas em
que ela se baseou — clique numa para pular até lá. Ele lê apenas uma janela
numerada em torno do token, então quando algo está definido em outro lugar ele
diz isso em vez de inventar. Veja [Recursos de IA](ai.md).

**Veja também:** [O grafo de commits](graph.md) · [Diffs](diffs.md)
