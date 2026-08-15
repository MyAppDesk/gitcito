---
title: Fetch, pull e push
category: Sincronização e vários repositórios
order: 50
summary: Ficar em dia, com proteções nas operações que mordem.
keywords: fetch pull push force forçado auto-fetch prune remotes upstream branch protegida vários remotes fork mirror push tags all
---

# Fetch, pull e push

## Pull

Três modos, escolhidos no dropdown: **padrão**, **somente fast-forward** ou
**rebase**. As mudanças locais entram e saem do stash automaticamente em volta do
pull, então uma árvore suja não te bloqueia.

## Push

Force pushes sempre usam `--force-with-lease` — a variante segura, que recusa se o
remote se mexeu desde a última vez que você olhou. Dar push forçado numa **branch
protegida** pede confirmação (a lista fica na engrenagem de configurações do repo).

![A confirmação que uma branch protegida exige antes de um force-push](../../screenshots/force-push-guard.webp)

### Mais de um remote

O botão **Push** mira no upstream da branch. A seta ao lado dele também oferece,
assim que um repositório tem mais de um remote:

| | |
|---|---|
| **Push para um remote** | Escolha um único remote — um fork, um mirror, um destino de deploy |
| **Push para todos os N remotes** | Um push por remote, em ordem |
| **Push de todas as tags para** | `git push <remote> --tags`, toda tag local de uma vez |

As mesmas duas ações ficam na linha de cada remote na barra lateral, que costuma
ser onde você está quando a pergunta aparece.

**Uma rejeição não cancela o resto.** Dar push num fork e no upstream dele é
exatamente o caso em que um lado recusa e o outro ainda deve passar, então cada
remote reporta separadamente: os sucessos são nomeados num toast, e cada falha ganha
o seu próprio, com o motivo do git.

Somente o **primeiro** remote da lista define o upstream da branch. Uma branch tem
um upstream, e o último remote para o qual você deu push não é automaticamente o
que você quer que ela rastreie.

Os dois caminhos rodam as mesmas verificações de um push comum — a confirmação de
branch protegida e a [proteção contra segredos](security.md). Publicar em dois
remotes é o dobro da exposição, não metade do cuidado.

## Fetch

**Fetch em todos e prune** em cada remote, mais o **auto-fetch** em segundo plano
num intervalo que você define (Configurações → Geral) e um selo "buscado há X" na
barra de ferramentas.

Um fetch que encontra **histórico reescrito** avisa: um toast nomeia a branch, e a
linha dela ganha um marcador que abre [o que mudou desde](range-diff.md) exatamente
no commit para o qual ela apontava antes.

## Muitos repositórios de uma vez

- Uma aba de grupo pode fazer **Fetch em todos / Pull em todos** de toda a sua
  subárvore.
- A [central de controle](mission-control.md) faz isso no workspace inteiro, e pode
  dar pull *apenas* nos repositórios que estão de fato atrasados.

## Remotes

Adicione, edite, remova e busque remotes individuais pela barra lateral. As linhas
de branch carregam selos de presença por remote, então você vê de relance quais
remotes têm uma cópia de uma branch.

**Veja também:** [Central de controle](mission-control.md) · [Hosting e pull requests](hosting.md)
