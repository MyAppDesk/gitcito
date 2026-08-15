---
title: Stashes
category: Sincronização e vários repositórios
order: 52
summary: Stashes parciais, apply por arquivo, e stash → branch.
keywords: stash stashes parcial partial keep-index apply pop drop untracked não rastreado branch
---

# Stashes

Dar stash no Gitcito não é tudo ou nada.

| Ação | O que faz |
|---|---|
| **Stash** | Tudo, incluindo arquivos não rastreados se você quiser, com uma mensagem |
| **Stash parcial** | Marque só os arquivos que você quer; opcionalmente `--keep-index` |
| **Apply / Pop** | O stash inteiro, ou **só alguns arquivos dele** |
| **Stash → branch** | `git stash branch` — a saída de emergência quando um stash não aplica limpo |

Selecionar um stash mostra os arquivos e diffs dele, exatamente como um commit.

![Um stash parcial: marque só os arquivos que devem entrar](../../screenshots/stash-partial.webp)

## Quando um stash não aplica

Se aplicar um stash fosse atropelar arquivos não rastreados, o git para. O Gitcito
oferece sobrescrevê-los e tentar de novo, em vez de deixar você descobrir o
encantamento sozinho.

Se a árvore andou demais, **stash → branch** recria a branch de onde o stash foi
tirado, aplica ali limpinho, e descarta o stash.

## Não confunda com snapshots

[Snapshots de WIP](recovery.md) são automáticos e escondidos; stashes são
deliberados e listados. Snapshots nunca tocam na sua lista de stashes.

**Veja também:** [Recuperação](recovery.md) · [Staging](staging.md)
