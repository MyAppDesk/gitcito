---
title: Git flow
category: Branches e cirurgia
order: 46
summary: Comece e finalize features, releases e hotfixes sem decorar qual branch faz merge onde.
keywords: gitflow git flow feature release hotfix develop main master prefixo versiontag modelo de branches start finish tag
---

# Git flow

O [modelo de branches git-flow](https://nvie.com/posts/a-successful-git-branching-model/)
são cinco regras e um monte de burocracia. As regras são fáceis; a burocracia é o
que as pessoas erram às 18h de um dia de release — fazendo merge de um hotfix na
`main` e esquecendo da `develop`, ou tagueando a branch errada.

`⌘K` → **Git flow** cuida da burocracia.

![O diálogo do git flow numa branch de release: começar uma branch acima, finalizá-la abaixo](../../screenshots/gitflow.webp)

## O layout

| Branch | Contém |
|--------|-------|
| **Branch de release** (`main`) | O que está em produção. Todo release é tagueado aqui. |
| **Branch de integração** (`develop`) | Onde o trabalho concluído se acumula entre releases. |
| `feature/*` | Uma unidade de trabalho, ramificada a partir da develop. |
| `release/*` | Uma versão sendo estabilizada, ramificada a partir da develop. |
| `hotfix/*` | Uma correção urgente, ramificada a partir da **main** — produção não pode esperar pela develop. |

O Gitcito lê e escreve as mesmas chaves de git config `gitflow.*` que a CLI
`git flow` usa (`gitflow.branch.master`, `gitflow.prefix.feature`, …). Um
repositório em que alguém já rodou `git flow init` é reconhecido imediatamente, e
um repositório configurado aqui funciona com a CLI depois. O Gitcito roda comandos
git comuns o tempo todo — a CLI não precisa estar instalada.

**Configurar** escreve essas chaves e, se a branch de integração ainda não existe,
a cria a partir da branch de release. Nada mais é tocado. Você pode mudar qualquer
nome ou prefixo depois em **Editar layout**.

## Começando

Escolha um tipo, digite um nome, aperte **Começar**. O diálogo mostra a branch que
está prestes a criar e a branch da qual ela será criada antes de você se
comprometer:

```
feature/search   from develop
hotfix/1.0.1     from main
```

O nome é o que você digita; o prefixo vem do layout.

## Finalizando

**Finalizar** é a parte que vale automatizar, porque são vários passos que
precisam todos acontecer:

| Tipo | O que o Gitcito faz |
|------|-------------------|
| Feature | Faz merge na develop com `--no-ff`, apaga a branch, deixa você na develop |
| Release | Faz merge na main, tagueia, faz merge na develop, apaga a branch, deixa você na develop |
| Hotfix | Faz merge na main, tagueia, faz merge na develop, apaga a branch, deixa você na **main** |

O `--no-ff` é deliberado: o commit de merge é o que torna a branch visível no
[grafo](graph.md) depois. Sem ele, uma feature curta desaparece numa linha reta e o
modelo perde justamente aquilo para que existia.

A tag é `<prefixo da tag de versão><nome>` — `release/1.1.0` vira `v1.1.0` com o
prefixo padrão. Desmarque **Taguear o release** para pular isso, e escreva uma
mensagem de tag se quiser mais do que o padrão.

### O que ele se recusa a fazer

- **Uma árvore de trabalho suja o impede.** Commite ou faça [stash](stashes.md)
  antes; finalizar faz merge de duas branches e move o HEAD duas vezes, e fazer
  isso em volta de trabalho não commitado é como as pessoas o perdem.
- **Um merge conflitante desfaz tudo.** Se o merge na main der certo mas o merge na
  develop conflitar, você ficaria com um release pela metade. O Gitcito restaura
  toda branch para onde ela estava e reporta o conflito. Faça o merge daquela
  branch manualmente, resolva no [resolvedor de conflitos](conflicts.md), e o fluxo
  é seu para terminar na mão.
- **Ele nunca dá push.** Finalizar é local. Envie main, develop e a nova tag quando
  você estiver pronto — veja [sincronização](syncing.md).

### Desfazer

Um **Desfazer** coloca tudo de volta: as duas branches voltam para os commits
anteriores, a tag é apagada, e a branch finalizada é recriada na ponta antiga. Essa
é a razão inteira de finalizar ser seguro de experimentar.

## Quando não usar

O git flow serve para software com releases versionados e uma branch de produção
suportada. Se você faz deploy da `main` várias vezes por dia, as branches de
release e hotfix são cerimônia que você não vai usar — [branches
empilhadas](stacks.md) ou branches curtas e simples saídas da `main` combinam mais.
A metade "feature" do modelo continua funcionando muito bem sozinha.
