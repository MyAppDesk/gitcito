---
title: Worktrees e submódulos
category: Sincronização e vários repositórios
order: 54
summary: Vários checkouts de um mesmo repositório; e repositórios dentro de repositórios.
keywords: worktree worktrees submódulo submodule submodules checkout vinculado init sync
---

# Worktrees e submódulos

## Worktrees

Um worktree é um segundo checkout do mesmo repositório, numa pasta própria — então
você pode olhar a `main` enquanto a `feature/x` fica exatamente como você a deixou,
sem stash nenhum.

- Crie e remova worktrees pela barra lateral, e abra um **na própria janela dele**.
- Clique com o botão direito em qualquer branch local → **Abrir num worktree** para
  criar um numa pasta irmã e abri-lo como aba.

![As seções de worktree e submódulo da barra lateral, as duas povoadas](../../screenshots/worktrees.webp)

## Submódulos

Adicione, atualize (init e checkout), sincronize URLs e remova submódulos, com
status ao vivo para cada um:

| Status | Significa |
|---|---|
| **Em dia** | Em checkout no commit que o pai registra |
| **Modificado** | Em checkout em outro lugar, ou sujo |
| **Não inicializado** | Registrado, mas nunca colocado em checkout |

![Submódulos carregando seu status, uma linha cada](../../screenshots/submodule-states.webp)

**Veja também:** [LFS e sparse-checkout](lfs-sparse.md) · [Fetch, pull e push](syncing.md)
