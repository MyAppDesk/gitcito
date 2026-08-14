---
title: Merging & rebasing
category: Branching & surgery
order: 41
summary: Merge, rebase, compare refs, and drag one branch onto another.
keywords: merge rebase fast-forward compare refs drag branch onto revert reset cherry-pick
---

# Merging & rebasing

## From the sidebar

Right-click a branch for **Merge into current** or **Rebase onto**. Or just
**drag one branch onto another** — Gitcito asks which of the two you meant. It
is the quickest gesture in the app for the two most common branch operations.

## Merge

Fast-forward when possible, or force a merge commit when you want the topology
recorded. If it conflicts, you land in [the resolver](conflicts.md).

## Compare any two refs

Pick a base and a compare ref — branch, tag or raw SHA, with a swap button — and
you get ahead/behind counts, the commits unique to each side, the full combined
diff, and a one-click hand-off to **open a PR**.

![Comparing two branches: what is unique to each side, and the combined diff](../screenshots/branch-compare.webp)

Reachable from the sidebar (compare with the current branch), the Tools menu, or
<kbd>⌘K</kbd>.

## Cherry-pick, revert, reset

All three from the graph's context menu. Reset offers **soft / mixed / hard**
and spells out what each one does to your working tree before you pick.

Multi-select commits first and cherry-pick applies the whole selection, in
order.

## Before you merge anything

[Conflict radar](conflict-radar.md) scans every branch against a base and tells
you which ones will fight, without checking anything out.

**See also:** [Interactive rebase](rebase.md) · [Stacked branches](stacks.md) · [Conflict radar](conflict-radar.md)
