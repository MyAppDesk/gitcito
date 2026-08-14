---
title: Resolving conflicts
category: Working with changes
order: 32
summary: A three-pane resolver that tells you which side is which.
keywords: conflict resolver merge conflicts ours theirs resolve markers three-way
---

# Resolving conflicts

When a merge, rebase, cherry-pick or revert stops, a banner tells you **what**
stopped and **between what** — "merging `feature/x` into `main`", not just
"conflict".

![The conflict resolver](../screenshots/conflict-resolver.webp)

## The three panes

| Pane | Is |
|---|---|
| Left | **Ours** — the side you were on, labelled with its commit |
| Right | **Theirs** — the side coming in, labelled with its commit |
| Middle | The **output**: editable, with line numbers, and what actually gets staged |

All three panes resize.

## Picking

Per **line**, per **chunk**, or the **whole side** at once — and you can take
both sides of a chunk when the answer is "keep both". A conflict-by-conflict
navigator walks you through what is left, so you cannot accidentally leave a
marker behind.

## AI assist

With AI enabled, **Resolve with AI** proposes a merge into the output pane. It
never applies anything on its own: you read it, edit it, and stage it. See
[AI features](ai.md).

## Avoiding them in the first place

[Conflict radar](conflict-radar.md) tells you which branches will conflict
before you merge any of them.

**See also:** [Conflict radar](conflict-radar.md) · [Merging & rebasing](merging.md)
