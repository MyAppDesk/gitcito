---
title: LFS, sparse-checkout e patches
category: Sincronização e vários repositórios
order: 55
summary: Arquivos grandes, checkouts parciais, e mover mudanças como arquivos.
keywords: lfs large file storage sparse checkout cone clone parcial partial clone patch am apply
---

# LFS, sparse-checkout e patches

## Git LFS

![O gerenciador de LFS](../../screenshots/lfs.webp)

Detecta se o `git-lfs` está instalado, se este repositório o usa, e quais padrões
estão rastreados. A lista de arquivos mostra o que foi **baixado** contra o que
ainda é um **ponteiro**, e dali você pode dar pull ou podar.

## Sparse-checkout

![Sparse-checkout em modo cone](../../screenshots/sparse-checkout.webp)

Modo cone: marque as pastas de primeiro nível em que você de fato trabalha, e o
resto sai da sua árvore de trabalho continuando no histórico. Útil num monorepo em
que você só cuida de dois pacotes.

Um **clone parcial** (`--filter=blob:none`) é oferecido na clonagem, para você não
baixar blobs que nunca vai abrir.

## Patches

- **Exporte** um commit (ou uma seleção múltipla) como um `.patch`.
- **Aplique** um na árvore de trabalho (`git apply`) ou como commit (`git am`).

Os dois pelo menu Ferramentas.

**Veja também:** [Worktrees e submódulos](worktrees.md)
