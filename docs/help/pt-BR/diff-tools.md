---
title: Ferramentas externas de diff e merge
category: Branches e cirurgia
order: 43
summary: Entregue um arquivo ao Kaleidoscope, Beyond Compare, Meld ou ao que você já usa — o Gitcito lê a própria lista do git.
keywords: difftool mergetool diff externo merge externo kaleidoscope beyond compare meld kdiff3 p4merge araxis opendiff filemerge vimdiff winmerge diff.tool merge.tool orig backup
---

# Ferramentas externas de diff e merge

O [visualizador de diff](diffs.md) e o [resolvedor de três painéis](conflicts.md)
do Gitcito dão conta da maioria dos dias. Em alguns dias não dão: um arquivo
gerado de 4.000 linhas, um merge em que você precisa ver quatro colunas ao mesmo
tempo, ou simplesmente a ferramenta que você usa há uma década e lê mais rápido do
que qualquer novidade.

**Configurações → Geral → Ferramentas externas de diff e merge.**

## A lista é do git, não nossa

O Gitcito não mantém tabela própria. Os dropdowns são `git difftool --tool-help` e
`git mergetool --tool-help`, e é por isso que:

- As ferramentas que o git já encontrou na sua máquina vêm listadas primeiro; as
  que ele conhece mas não acha vêm depois, marcadas como *não instalada*.
- **Uma ferramenta personalizada funciona sem suporte extra.** Se você tem

  ```sh
  git config --global difftool.mine.cmd 'mycompare "$LOCAL" "$REMOTE"'
  ```

  então `mine` aparece no dropdown como qualquer uma nativa.
- Suas escolhas são escritas em **`diff.tool` e `merge.tool` no seu git config
  global** — as mesmas chaves que o seu terminal lê. Configure aqui e o
  `git difftool` na linha de comando se comporta igual. Configure lá e o Gitcito
  reconhece.

O git conhece cerca de trinta ferramentas de fábrica, incluindo Kaleidoscope,
Beyond Compare, Meld, KDiff3, P4Merge, Araxis, DiffMerge, WinMerge, FileMerge,
VS Code e a família vim.

## Onde as ações aparecem

| Superfície | Ação |
|---------|--------|
| Um arquivo alterado no [compositor de commit](committing.md) | **Diff no \<ferramenta\>** — árvore de trabalho contra o índice |
| O [resolvedor de conflitos](conflicts.md) | **Merge no \<ferramenta\>** — o merge de três vias completo |

As duas entradas só aparecem quando há uma ferramenta de fato configurada; um
`git difftool` não configurado só daria erro, e um botão inerte é pior do que
botão nenhum.

## O que acontece enquanto a ferramenta está aberta

O Gitcito espera ela fechar. Isso é deliberado — o `git mergetool` só prepara o
arquivo resolvido *depois* que a ferramenta sai, então existe um resultado real
para reportar — e é por isso que o botão mostra um spinner em vez de retornar na
hora.

O resto do app continua responsivo: essas ferramentas rodam fora do lock por
repositório que serializa as operações normais do git, então uma ferramenta de
merge deixada aberta durante o almoço não congela a aba atrás dela.

Quando um merge externo dá certo, o próprio git prepara o arquivo e o Gitcito
fecha o resolvedor e atualiza. Se você fechar a ferramenta sem salvar, o git avisa
e nada muda.

## O arquivo `.orig`

O `git mergetool` deixa por padrão um backup `<file>.orig` ao lado do arquivo
resolvido — comportamento do git, não do Gitcito. O interruptor nas Configurações
escreve `mergetool.keepBackup`; desligue-o e um arquivo resolvido não deixa nada
para trás.

## Limites

- **Só diffs da árvore de trabalho.** A entrada do compositor compara o que você
  tem agora contra o índice. Comparar dois commits históricos externamente não está
  ligado — use o [visualizador de diff](diffs.md) embutido ou a
  [comparação](merging.md) para isso.
- **Um arquivo por vez.** Não existe uma varredura de "dar diff em todo arquivo
  alterado".
- **O Gitcito nunca instala nada.** Uma ferramenta marcada como *não instalada*
  continua selecionável, porque o git ainda pode encontrá-la depois que você a
  instalar — mas ela vai falhar até lá.
