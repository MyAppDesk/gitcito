---
title: Máquina do tempo
category: Repositório e histórico
order: 13
summary: Arraste um controle deslizante e veja o próprio repositório mudar, commit a commit.
keywords: máquina do tempo time machine navegar histórico slider passado árvore tree explorar rebobinar versão antiga
---

# Máquina do tempo

Ler um commit antigo normalmente significa fazer checkout dele, o que significa dar
stash no que você estava fazendo. Isto não.

Arraste o controle deslizante e a **árvore de arquivos é redesenhada a cada
commit**: pastas aparecem, arquivos se mudam entre elas, arquivos apagados voltam.
Escolha um arquivo e você o lê como ele era naquele commit.

Tudo é lido do banco de objetos (`git ls-tree`, `git show`). **Sem checkout, o HEAD
nunca se move, seu trabalho não commitado fica intocado** — você pode percorrer um
ano de histórico no meio de uma alteração.

![A árvore como ela estava num commit anterior, com um arquivo aberto ao lado](../../screenshots/time-machine.webp)

![Arrastando o controle: a árvore se reconstrói commit a commit](../../screenshots/clip-time-machine.webp)

## Controles

| Tecla | Ação |
|---|---|
| <kbd>←</kbd> <kbd>→</kbd> | Um commit |
| <kbd>⇧</kbd> + <kbd>←</kbd> <kbd>→</kbd> | Dez commits |
| <kbd>Home</kbd> / <kbd>End</kbd> | Mais antigo / mais novo |

As setas dos dois lados do controle fazem o mesmo. Os arquivos que o commit atual
tocou ficam destacados na árvore, com uma contagem no cabeçalho.

## A seleção sobrevive ao tempo

Escolha um arquivo e volte para antes do commit que o criou: o painel diz que ele
não existe aqui, e **mantém a sua seleção**. Avance de novo e o arquivo volta com o
conteúdo antigo. Esse é o ponto — você está movendo o repositório, não o seu
cursor.

**Abrir esta versão** entrega o arquivo à visualização normal naquele commit.

**Veja também:** [Timelapse](timelapse.md) · [Blame e histórico](blame.md)
