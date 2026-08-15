---
title: Staging
category: Trabalhando com mudanças
order: 30
summary: Prepare arquivos inteiros, hunks isolados ou linhas individuais.
keywords: staging stage preparar unstage despreparar descartar discard hunk linhas lines índice index parcial partial
---

# Staging

O painel de commit tem três listas: **Em conflito**, **Não preparados** e
**Preparados**. Cada uma colapsa, e cada uma lembra se você a deixou aberta.

![Um diff não preparado, com os controles de hunk e de arquivo ao lado](../../screenshots/line-staging.webp)

## Três níveis de precisão

| Nível | Como |
|---|---|
| **Arquivo** | Clique no ✚ da linha, ou selecione várias linhas e prepare o lote |
| **Hunk** | Abra o diff e use o botão no cabeçalho do hunk |
| **Linha** | Selecione linhas dentro do diff e prepare exatamente aquelas |

O staging por linha é o que torna prático manter um `console.log` de depuração
fora de um commit sem precisar apagá-lo antes.

## Descartando

Descartar funciona nos mesmos níveis, e sempre pergunta. Arquivos não rastreados
são apagados; os rastreados voltam ao estado preparado (ou commitado).

## Teclado

<kbd>↑</kbd> <kbd>↓</kbd> (ou <kbd>j</kbd> <kbd>k</kbd>) percorrem as listas de
arquivos, com <kbd>⇧</kbd> para um intervalo e <kbd>⌘</kbd>/<kbd>Ctrl</kbd> para
alternar arquivos individuais.

## Antes de você commitar

O Gitcito verifica algumas coisas e pergunta uma vez, nunca em silêncio:

- um arquivo que parece um **segredo** (`.env`, `*.pem`, `id_rsa`…),
- um blob **muito grande** (limite em Configurações → Segurança),
- commitar **direto numa branch protegida** (`main`/`master` por padrão).

Cada um desses oferece um *Ignorar e parar de rastrear* em um clique. Veja
[Segurança e segredos](security.md).

**Veja também:** [Commitando](committing.md) · [Diffs](diffs.md) · [Absorb](absorb.md)
