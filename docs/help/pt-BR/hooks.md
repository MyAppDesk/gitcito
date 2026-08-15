---
title: Hooks e .gitignore
category: Ferramentas de workspace
order: 92
summary: Gerencie os hooks do git, e ignore arquivos sem editar nada na mão.
keywords: hooks pre-commit husky core.hooksPath gitignore ignorar ignore untrack parar de rastrear
---

# Hooks e .gitignore

## Hooks

Liste todo hook do repositório, veja quais são de verdade e quais ainda são
`.sample`, e habilite, desabilite, edite ou crie hooks.

![O gerenciador de hooks](../../screenshots/hooks.webp)

O Gitcito detecta um **`core.hooksPath`** personalizado (husky e companhia) e uma
configuração de **framework de pre-commit**, e te avisa quando os hooks moram em
outro lugar que não `.git/hooks` — senão você editaria um arquivo que o git nunca
roda.

> Os hooks rodam nos commits do Gitcito exatamente como rodam no `git commit`. Um
> hook que falha bloqueia o commit, e a saída dele volta dentro do erro.

## .gitignore inteligente

Clique com o botão direito num arquivo → **Ignorar**, e escolha:

| Escolha | Escreve |
|---|---|
| Este arquivo | `path/to/file.log` |
| Todos os `*.ext` | `*.log` |
| A pasta inteira | `path/to/folder/` |

![O seletor de .gitignore](../../screenshots/gitignore-chooser.webp)

A regra vai para o `.gitignore` da **pasta mais próxima**, ou para a raiz do
repositório, com uma pré-visualização ao vivo da linha antes de você se comprometer
com ela. Arquivos já rastreados ganham um **Ignorar e parar de rastrear** no mesmo
diálogo.

**Veja também:** [Segurança e segredos](security.md) · [Staging](staging.md)
