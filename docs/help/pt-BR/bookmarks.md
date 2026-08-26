---
title: Marcadores
category: Ferramentas do workspace
order: 94
summary: Lugares do código que você lembra e que sobrevivem ao arquivo mudar embaixo deles.
keywords: marcador marcadores marcar linha nota lugar código navegação barra lateral movido perdido trecho
---

# Marcadores

Um lugar em que você quer voltar: a linha onde mora o bug, a função que você está
renomeando pela metade, aquilo para apagar quando o refactor entrar. Clique com o
botão direito numa linha do visualizador e escolha **Marcar esta linha**; ela
aparece na barra lateral, e um clique te leva de volta.

![Marcadores na barra lateral](../../screenshots/bookmarks.webp)

Uma linha marcada leva uma marca na calha, e passar o mouse por qualquer linha
mostra uma apagadinha para clicar — o menu de contexto é para quando você já
sabe que o recurso existe.

Marcadores são privados desta máquina e deste repositório. Nada é escrito no
repo, então não dá para commitar, empurrar, nem ninguém mais vê — igualzinho aos
[todos](todos.md).

## A linha se move. O problema é todo esse.

`cart.ts:42` apodrece no instante em que alguém insere uma linha acima, e um
marcador que abre em silêncio a linha errada é pior do que marcador nenhum. Por
isso o **texto** da linha é guardado junto do número, e abrir relocaliza:

1. a linha lembrada, se ainda tiver aquele texto;
2. senão a linha mais próxima com o mesmo texto — a mais próxima, para que uma
   linha repetida pelo arquivo caia na cópia mais perto de onde estava;
3. senão a linha mais próxima que bate ignorando espaços, o que sobrevive a uma
   reindentação;
4. senão ele diz que **a linha sumiu** e abre onde ela estava, em vez de chutar.

Quando se move, o marcador se cura: o novo número é guardado, e a próxima
abertura já parte de onde ele realmente está. Dá para adicionar uma **nota** pelo
menu de contexto — sem ela, o rótulo é o próprio texto da linha.

## Os limites

- **Um marcador aponta para a árvore de trabalho**, não para um commit. Ele segue
  suas edições; não viaja para trás no histórico.
- **Arquivo reescrito perde os marcadores.** Se nem o texto exato nem a forma sem
  espaços aparecem em algumas centenas de linhas ao redor, não sobra nada honesto
  para apontar.
- **Renomear um arquivo quebra seus marcadores.** O caminho é a chave; o git
  percebe rename num diff, mas marcador não faz parte de diff.
- **Linha em branco não tem texto para procurar**, então o marcador dela depende
  só do número.

**Veja também:** [Todos](todos.md) · [Problemas](problems.md)
