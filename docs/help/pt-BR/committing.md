---
title: Commitando
category: Trabalhando com mudanças
order: 31
summary: Estilos de mensagem, templates, coautores e o linter.
keywords: commit mensagem message compositor composer conventional gitmoji ticket amend template coautor co-author linter
---

# Commitando

## Estilos de mensagem

Escolha um nas Configurações; o compositor se adapta a ele.

| Estilo | Se parece com |
|---|---|
| **Conventional** | `feat(api)!: add rate limiting` — com um dropdown de tipo |
| **Gitmoji** | `✨ add rate limiting` — com um seletor de emoji |
| **Ticket** | `ABC-123: add rate limiting` — semeado a partir do nome da branch |
| **Simples** · **Auto** | O que você digitar; o Auto deixa a IA decidir o formato |
| **Homem das cavernas** · **Haicai** | Exatamente o que o nome sugere |

![Compositor pré-preenchido a partir de um template de commit](../../screenshots/commit-template.webp)

## Coisas que o compositor faz por você

- <kbd>↑</kbd> <kbd>↓</kbd> trazem de volta suas **mensagens recentes**.
- Um **seletor de coautores** adiciona trailers `Co-authored-by:` a partir dos
  próprios contribuidores do repositório.
- `commit.template` / `.gitmessage` **pré-preenchem** a mensagem, com as linhas de
  comentário removidas.
- Durante um merge, cherry-pick ou revert, a mensagem vem **pré-preenchida** do
  jeito que o git faria.
- Rascunhos **persistem** por repositório, então trocar de aba nunca perde uma
  mensagem.

## O linter

Uma verificação ao vivo e não bloqueante: comprimento do assunto (com contador de
caracteres), ponto final sobrando, assunto não imperativo ou em minúsculas, linhas
do corpo largas demais. São dicas, nunca um portão — ele não vai impedir você de
commitar.

## Amend

O amend reescreve o último commit com o que estiver preparado. O Gitcito mostra a
mensagem existente primeiro, então você está editando, não redigitando.

**Veja também:** [Staging](staging.md) · [Absorb](absorb.md) · [Gerador de changelog](changelog.md)
