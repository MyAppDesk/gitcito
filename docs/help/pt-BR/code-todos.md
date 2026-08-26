---
title: TODOs no código
category: Ferramentas do workspace
order: 93
summary: Todo TODO, FIXME e HACK que o código carrega, agrupados por etiqueta, por responsável ou por pasta.
keywords: todo todos fixme hack xxx note marcador marcadores comentário comentários árvore etiqueta responsável atribuído cgm dívida técnica grep varredura
---

# TODOs no código

Um TODO é uma promessa que alguém fez a si mesmo e depois perdeu. Ele é escrito
onde o problema está, que é exatamente onde ninguém volta a olhar, e quando
passa a importar quem o escreveu já mudou de time. O grep encontra todos, e mil
linhas de saída do grep é o mesmo que não encontrar nenhum.

A aba **TODOs** do painel do analisador lê todos eles e faz o que o grep não
consegue: agrupa. Abra o painel pela barra de status ou pela paleta de comandos
(`TODOs no código`) e mude para a segunda aba.

A barra de status conta os marcadores ao lado dos erros e avisos dos
analisadores; clicar nesse contador abre esta aba.

![A aba TODOs, agrupada por responsável](../../screenshots/code-todos.webp)

## O que conta como marcador

Uma etiqueta, dentro de um comentário, num arquivo que o Git versiona ou
versionaria:

| Escrito | Lido como |
|---------|-----------|
| `// TODO: publicar isso` | etiqueta `TODO`, sem responsável |
| `//todo publicar isso` | o mesmo — os dois-pontos e o espaço são opcionais |
| `# todo publicar isso` | o mesmo — nem maiúsculas nem linguagem importam |
| `/* TODO(cgm): publicar isso */` | etiqueta `TODO`, responsável `cgm` |
| `-- TODO (CGM) publicar isso` | o mesmo responsável: `cgm`, `(CGM)` e `[cgm]` são uma pessoa só |
| `<!-- TODO: @cgm publicar isso -->` | de novo o mesmo |

As etiquetas são `TODO`, `FIXME`, `BUG`, `HACK`, `XXX`, `NOTE`, `OPTIMIZE`,
`REVIEW`, `REFACTOR`, `DEPRECATED`, `QUESTION`, `IDEA`, `WIP` e `TEMP`. As
quatro primeiras têm cor, porque "isto está quebrado" e "isto é uma ideia que eu
tive" não podem parecer a mesma coisa numa lista.

A etiqueta precisa vir depois de um início de comentário — `//`, `#`, `--`, `;`,
`%`, `/*`, `*`, `<!--`, `"""`. Nada mais conta: `todo = [l for l in lines]` é
código, e um painel que anota uma atribuição de variável como dívida é um painel
em que não se confia duas vezes. A mesma regra mantém uma função chamada
`reviewNotes` fora da lista.

## Agrupar é a função

Quatro eixos, um clique cada:

| Agrupar por | Responde |
|-------------|----------|
| **Etiqueta** | Que tipo de dívida este repositório carrega? |
| **Responsável** | O que cada pessoa deixou — e o que está na pilha sem dono? |
| **Pasta** | Qual canto da árvore está apodrecendo? |
| **Arquivo** | A lista comum, quando você já sabe aonde vai. |

**Sem responsável** é um grupo de verdade, não uma sobra: os marcadores em que
ninguém pôs o nome são os que nunca são recolhidos, e vê-los contados é
justamente o ponto.

Os chips de etiqueta no topo filtram a lista; clicar no selo de responsável numa
linha também, assim como a busca, que casa com a mensagem, o arquivo, a etiqueta
e o responsável. **Só alterados** restringe aos arquivos que você editou e ainda
não commitou — a última conferida antes do push, quando um `// FIXME` deixado uma
hora atrás está prestes a virar permanente.

Clicar numa linha abre o arquivo naquela linha.

## O que ele não faz

- **Ele lê, nunca escreve.** Não existe "marcar como feito": fechar um TODO é
  apagar a linha e commitar isso. Para uma lista que o Gitcito guarda para você,
  veja [todos](todos.md), que é outra coisa: notas privadas que vivem no app, não
  no código.
- **Arquivos ignorados são pulados**, junto com `node_modules`, digam o que
  disserem as etiquetas lá dentro. Arquivos não rastreados entram: um marcador
  escrito cinco minutos atrás é o que mais vale ver.
- **Ele não distingue comentário de string.** Uma linha
  `const banner = "// TODO"` é um marcador para a varredura. Ele não tem um
  parser de quarenta linguagens e não finge ter.
- **A varredura é um retrato.** Edite um arquivo e o painel mantém os números que
  tinha até você varrer de novo; o botão de atualizar é a história inteira.
- **Ele para em 5.000 marcadores.** Um repositório além disso tem um problema de
  dívida que painel nenhum resolve.

## Onde ele roda

Um `git grep` sobre a árvore de trabalho, por isso leva milissegundos onde a aba
[Problemas](problems.md) leva segundos: nada é compilado, nenhuma toolchain
entra em cena, e a busca pula binários e caminhos ignorados porque o Git já sabe
quais são.
