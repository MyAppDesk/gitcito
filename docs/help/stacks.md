---
title: Stacked branches
category: Branching & surgery
order: 43
summary: Chains of dependent branches, with a cascade restack.
keywords: stack stacked branches graphite restack dependent chain parent PR per level
---

# Stacked branches

A stack is a chain of branches where each one builds on the one below:
`main → api → ui`. Reviewing three small PRs beats reviewing one enormous one.

![A branch stack](../screenshots/branch-stack.webp)

Gitcito shows the stack bottom → top with the commit count at each level, and
lets you **open a PR per level**, each targeting its parent rather than `main`.

## Restack

When a lower branch changes — you addressed review comments on `api` — every
branch above it is now built on the wrong base. **Restack** cascade-rebases the
whole chain with `rebase --onto`, so a parent rewrite does not duplicate commits
into its children.

## Where the links live

Parent links are stored in **git config**, so they travel with the repository
and survive a reclone. Nothing lives in a service.

**See also:** [Interactive rebase](rebase.md) · [Hosting & pull requests](hosting.md)
