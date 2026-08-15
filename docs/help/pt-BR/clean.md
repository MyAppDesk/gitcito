---
title: Remover arquivos não rastreados
category: Trabalhando com mudanças
order: 35
summary: Um ensaio do git clean — todo caminho não rastreado, com tamanho, os ignorados à parte e a Lixeira como destino padrão.
keywords: clean limpar git clean untracked não rastreado remover apagar lixo build output ignorado gitignore dry run ensaio lixeira trash node_modules dist arrumar
---

# Remover arquivos não rastreados

Uma árvore de trabalho acumula arquivos dos quais o git nunca tirou cópia: uma
anotação de rascunho, um `debug-output.txt`, um `dist/` de um build que falhou, um
`node_modules` de uma branch que você abandonou mês passado. O git tem um comando
para isso — o `git clean` — e ele é a única operação do git com **nada por trás**.
O conteúdo nunca esteve num commit, então não há entrada no reflog, nem stash, nem
undo, nem encantamento de `git` que traga aquilo de volta.

É por isso que essa é a operação que as pessoas rodam no terminal e depois se
arrependem. A versão do Gitcito mostra a lista inteira antes de qualquer coisa
acontecer.

`⌘K` → **Remover arquivos não rastreados**.

![Caminhos não rastreados e ignorados listados separadamente, cada um com seu tamanho, antes de qualquer remoção](../../screenshots/clean.webp)

## O que a lista significa

Cada entrada é um caminho que o `git clean` alcançaria, com o tamanho em disco, em
dois grupos:

| Grupo | O que é | Selecionado por padrão |
|-------|-----------|---------------------|
| **Não rastreados** | Nunca commitados, não casam com o `.gitignore` | Sim |
| **Ignorados** | Casam com o `.gitignore` — saída de build, caches, `.env` | **Não** |

A separação é o ponto principal. Caminhos ignorados costumam não valer nada e, de
vez em quando, são a única cópia de algo que importa: um `.env` local, um dump de
banco, um fixture baixado. Nada que case com o `.gitignore` vem selecionado para
você.

Um **diretório** inteiramente não rastreado é uma linha só, não uma linha por
arquivo — `tmp/`, `dist/`, `node_modules/` — porque essa é a granularidade com que
o git os remove, e uma listagem de 40.000 arquivos é uma listagem que ninguém lê.
O tamanho dele é a soma do que ele contém.

Uma pasta marcada como **repositório próprio** tem o seu próprio `.git`: um clone
que você largou dentro deste, ou um experimento que você nunca conectou. O git se
recusa a removê-las (ele quer `-ff`, uma flag que o Gitcito não oferece) — a
Lixeira dá conta delas.

## Lixeira ou apagar

**Mover para a Lixeira** vem ligado, e não passa pelo git de forma alguma: os
caminhos vão para a Lixeira do sistema, de onde você pode trazê-los de volta. Esse
é o único caminho que remove um repositório aninhado, e o único que sobrevive a um
checkbox marcado por engano.

Desligar isso é um `git clean -f -d -x` de verdade exatamente nos caminhos
selecionados, e pede confirmação com a contagem e o tamanho total na sua frente.
Nada se recupera disso.

## Limites que vale conhecer

- **Só arquivos não rastreados.** Um arquivo rastreado e modificado não está aqui
  — isso é [Descartar](staging.md), que o restaura a partir do índice ou do HEAD.
- **A lista tem teto** nos primeiros 400 caminhos. Se um repositório tiver mais,
  remova o que está listado e aperte **Reescanear** para o resto.
- **Tamanhos de diretório são aproximados** para árvores muito grandes: a
  varredura para depois de 20.000 arquivos, então um `node_modules` gigante pode
  aparecer menor do que é. Ele nunca aparece maior.
- **A varredura é um instantâneo.** Se um build escrever arquivos enquanto o
  diálogo está aberto, aperte **Reescanear** antes de remover qualquer coisa.
- Os caminhos são conferidos contra a própria lista de arquivos removíveis do git
  antes de qualquer coisa ser tocada, então nada rastreado pode ser removido por
  este diálogo, nem mesmo pelo nome.

Veja também: [Staging e descarte](staging.md) · [Ignorando arquivos](hooks.md) ·
[Removendo um arquivo do histórico](history-purge.md)
