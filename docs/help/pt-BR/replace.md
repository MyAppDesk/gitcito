---
title: Replace e graft
category: Repositório e histórico
order: 17
summary: Encurte o histórico de um clone sem reescrevê-lo — git replace, grafts, e como colocar o histórico de volta.
keywords: replace git replace graft refs/replace shallow raso truncar histórico arquivo morto parents rewrite filter-branch alternativa clone menor useReplaceRefs no-replace-objects
---

# Replace e graft

O `git replace` diz ao git: *onde quer que você fosse ler o objeto A, leia B*.
Nada é reescrito. Nenhum sha muda. Todo commit continua exatamente onde estava — o
git apenas olha para outro lugar ao passar por ali.

Isso parece uma curiosidade até você querer um clone menor. Aí ele vira a
alternativa honesta a uma reescrita de histórico: **enxerte um commit em nenhum
pai** e tudo antes dele some do log, do grafo e de todo clone feito dali em diante
— continuando guardado, continuando buscável, e a uma ref apagada de voltar.

`⌘K` → **Replace e graft**.

![As substituições existentes, e o formulário de graft abaixo delas](../../screenshots/replace.webp)

## Enxertando

| Dê a ele | E você recebe |
|---------|-------------|
| Um commit, **nenhum pai** | Aquele commit vira o começo do histórico |
| Um commit, **um ou mais pais** | Ele se prende ali em vez de onde realmente está |

A segunda forma é a interessante. Mantenha o histórico completo num repositório de
arquivo morto, trunque o de trabalho, e um graft apontando para a ponta do arquivo
morto reconecta os dois — o mesmo truque que o GitHub usa para servir um clone raso
que ainda pode ser aprofundado.

**Enxertar em nenhum pai pergunta antes**, porque "o histórico sumiu" e "o
histórico está escondido" são idênticos vistos do log e não são de forma alguma a
mesma coisa. Os objetos sobrevivem até um `gc` podá-los; veja
[manutenção](maintenance.md).

## Convivendo com isso

**Substituições são refs**, dentro de `refs/replace/`. Isso tem três consequências
que vale conhecer:

- Elas são **locais até serem enviadas**: `git push origin "refs/replace/*"` as
  compartilha, e quem clonar sem elas vê o histórico intocado.
- **O Desfazer funciona** — apagar a ref restaura a ancestralidade real na hora, e
  o Gitcito registra o graft como uma ação desfazível como qualquer outra.
- `core.useReplaceRefs=false` faz o git ignorar todas de uma vez. O interruptor aqui
  escreve exatamente isso, e o diálogo avisa quando está desligado, porque um
  repositório que ignora silenciosamente as próprias substituições é um lugar
  confuso.

Pela linha de comando, `git --no-replace-objects log` mostra o histórico real sem
mudar configuração nenhuma.

## Quando recorrer a isto em vez de uma reescrita

| Objetivo | Ferramenta |
|------|------|
| O clone é grande demais, o histórico está ok | **Graft** — nada reescrito, reversível |
| Um segredo ou um blob enorme precisa *sumir* | [Remover um arquivo do histórico](history-purge.md) — uma reescrita de verdade |
| Só quero baixar menos, uma vez | `git clone --depth` — raso, sem refs para administrar |

Um graft não remove nada. Se o motivo de você querer os commits antigos fora é que
eles contêm algo que jamais deveria ter sido commitado, esta é a página errada: os
objetos continuam lá, continuam buscáveis pelo sha, e continuam em todo clone
existente.

## Limites que vale conhecer

- **O que você vê deixa de bater com o que está guardado.** Isso é o recurso, e o
  perigo. Qualquer pessoa depurando um clone com substituições precisa saber que
  elas existem.
- **Substituições não viajam por padrão**, então o `git log` de um colega e o seu
  podem legitimamente discordar.
- **Uma substituição pode esconder um commit das ferramentas, não do git.** O
  `git cat-file` e o [explorador de objetos](objects.md) continuam abrindo o
  original pelo sha.
- **O Gitcito não oferece `git replace --edit`** (reescrever o conteúdo de um objeto
  na mão). Isso é trabalho de um editor de texto sobre um objeto cru, e uma arma
  apontada para o próprio pé com uma interface em volta.

Veja também: [Explorador de objetos](objects.md) ·
[Remover um arquivo do histórico](history-purge.md) ·
[Manutenção do repositório](maintenance.md)
