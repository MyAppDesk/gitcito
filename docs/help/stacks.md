---
title: Stacked branches
category: Branching & surgery
order: 43
summary: Chains of dependent branches — cascade restack and one-click chained PRs.
keywords: stack stacked branches graphite restack dependent chain parent PR per level submit autopilot retarget reorder move up down insert add level adopt trunk base picker typeahead push all gh-stack gs add
---

# Stacked branches

A stack is a chain of branches where each one builds on the one below:
`main → api → ui`. Reviewing three small PRs beats reviewing one enormous one.

![A branch stack](../screenshots/branch-stack.webp)

Gitcito draws the stack top → bottom, ending at the trunk it lands on. Each
level shows its own commit count, **what its PR will target** — the level below
it, and the trunk for the bottom one — and, once submitted, its PR number as a
chip you can click.

## Building one

| Do this | And |
|---------|-----|
| **Add level** | Creates a branch on top of the leaf and checks it out. This is `gh stack add`, with a picker instead of a required argument. |
| **Add above** on any level | Same, but in the *middle* of the stack: whatever sat on that level is re-pointed at the new branch, so the chain keeps its order and gains a floor. Nothing is replayed — the new branch is created at its parent's tip. |
| **Add an existing branch** | A branch you already have joins the stack on top of the leaf. Useful when you started ordinarily and only later realised it was a stack. |

Every branch field is a **typeahead**: type to filter, ↑/↓ and Enter to pick,
and anything you type that is not in the list still counts, so a remote-tracking
ref like `origin/main` works as a base.

## Reordering

The **↑ / ↓** arrows on a level swap it with its neighbour. That is not a
metadata edit: the chain is re-linked and replayed, so each level's own commits
land on their new base. The move is undoable (<kbd>⌘Z</kbd>) — the undo replays
the old order, it does not resurrect the old commits.

Because a reorder is a series of rebases, it can **conflict**, exactly like a
restack. Gitcito stops on the first conflict and hands you the conflict view;
the levels below it are already moved.

## Pointing it somewhere else

**Set parent** on a level opens the same typeahead: pick a different branch and
that level's link moves. The **base** row at the bottom does it for the trunk —
change it and the whole stack is re-linked onto the new trunk and replayed.

## Push all

**Push all** pushes every level with `--force-with-lease` and stops there — `gh
stack push` without opening anything. **Submit stack as PRs** below does the
same push and then the PR work; use **Push all** when you want the branches on
the remote but are not ready for review.

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

The action is **idempotent**: press it after every restack, new level or merged
PR and it converges — nothing is duplicated, only what drifted is touched.

When the bottom PR has **merged**, the same button cleans up after it: the
merged level's child is reparented onto the trunk, the level is untracked, its
local branch deleted (safe — the trunk provably contains it), the chain
restacked and every remaining PR retargeted. Merge bottom-up, press Submit,
repeat.

## Restack

When a lower branch changes — you addressed review comments on `api` — every
branch above it is now built on the wrong base. **Restack** cascade-rebases the
whole chain with `rebase --onto`, so a parent rewrite does not duplicate commits
into its children. After a restack, press **Submit** again: it force-pushes the
rewritten levels and the PRs update in place.

## Limits

- Submission is **GitHub-only** for now (creation works on all four hosts, but
  retargeting and body updates need the GitHub API).
- The merged-bottom cleanup sees merge and rebase merges by ancestry, and
  **squash** merges by asking GitHub whether the branch's PR landed — so with a
  GitHub token every merge style is cleaned up. On other hosts, or without a
  token, a squash-merged level still needs a manual untrack. Fetch first, too —
  the ancestry check reads the trunk as of your last fetch.
- The stack section in a PR body is maintained between hidden markers — your
  own description above it is preserved.
- Reordering and re-trunking **rewrite history** on every level they touch. The
  branches are yours and unpushed levels cost nothing, but a level that is
  already under review gets a force-push on the next submit.
- A level can only move one place at a time. Two swaps are two rebases, and
  stopping halfway is a legible state; a drag that lands three places away is
  not.

## Where the links live

Parent links are stored in **git config**, so they travel with the repository
and survive a reclone. Nothing lives in a service.

**See also:** [Interactive rebase](rebase.md) · [Hosting & pull requests](hosting.md)
