---
title: Stacked branches
category: Branching & surgery
order: 43
summary: Chains of dependent branches — cascade restack and one-click chained PRs.
keywords: stack stacked branches graphite restack dependent chain parent PR per level submit autopilot retarget
---

# Stacked branches

A stack is a chain of branches where each one builds on the one below:
`main → api → ui`. Reviewing three small PRs beats reviewing one enormous one.

![A branch stack](../screenshots/branch-stack.webp)

Gitcito shows the stack bottom → top with the commit count at each level. Each
level that has an open PR wears its number as a chip — click it to open the PR.

## Submit the stack as chained PRs

**Submit stack as PRs** does in one click what stacking tools charge for:

1. Pushes every level with `--force-with-lease` (fresh branches tolerate it,
   restacked ones need it).
2. Opens a PR for every level that lacks one — each **based on its parent
   branch**, not on `main`, so every review shows only its own commits. Title
   and description come from the level's own commits.
3. Retargets any existing PR whose base has drifted.
4. Writes a **stack navigation section** into every PR body, so a reviewer on
   any level can see the whole chain and where this PR sits in it.

The action is **idempotent**: press it after every restack or new level and it
converges — nothing is duplicated, only what drifted is touched.

## Restack

When a lower branch changes — you addressed review comments on `api` — every
branch above it is now built on the wrong base. **Restack** cascade-rebases the
whole chain with `rebase --onto`, so a parent rewrite does not duplicate commits
into its children. After a restack, press **Submit** again: it force-pushes the
rewritten levels and the PRs update in place.

## Limits

- Submission is **GitHub-only** for now (creation works on all four hosts, but
  retargeting and body updates need the GitHub API).
- After the bottom PR merges, git still sees the old chain: **untrack** the
  merged level (or set its child's parent to the trunk), restack, submit. The
  bottom-merge cleanup is not automated yet.
- The stack section in a PR body is maintained between hidden markers — your
  own description above it is preserved.

## Where the links live

Parent links are stored in **git config**, so they travel with the repository
and survive a reclone. Nothing lives in a service.

**See also:** [Interactive rebase](rebase.md) · [Hosting & pull requests](hosting.md)
