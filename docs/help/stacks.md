---
title: Stacked branches
category: Branching & surgery
order: 43
summary: Chains of dependent branches — cascade restack and one-click chained PRs.
keywords: stack stacked branches graphite restack dependent chain parent PR per level submit autopilot retarget route stop start reorder move up down add stop remove picker typeahead push all gh-stack gs add
---

# Stacked branches

A stack is a chain of branches where each one builds on the one below:
`main → api → ui`. Reviewing three small PRs beats reviewing one enormous one.

![A branch stack](../screenshots/branch-stack.webp)

Gitcito draws it as a **route**: a start branch at the top, then one stop per
level. Each stop's PR targets the stop above it, and the first stop lands on the
start branch. A stop shows its own commit count, whether it needs a restack, and
its PR number once submitted.

## Editing the route

| Control | What it does |
|---------|--------------|
| The **Start** field | Where the stack lands. Change it and the whole chain re-links onto the new branch and replays. |
| A **stop's** field | Swaps which branch occupies that position. The branch that leaves is untracked, never deleted. |
| **↑ / ↓** | Moves a stop one place along the route. |
| **✕** | Takes the stop off the route; its neighbours join up. |
| **Add stop** | Pick a branch you already have and it joins the top of the route — or type a name that does not exist yet, and it is created on the last stop's tip and checked out. |
| The arrow button | Checks that stop out. |

Every field is a typeahead: type to filter, ↑/↓ and Enter to pick, and anything
you type that is not in the list still counts — so a remote-tracking ref like
`origin/main` works as a start branch.

Each of those edits is the *same* operation underneath: the whole route, handed
back at once. That is why one gesture is one undo entry (<kbd>⌘Z</kbd>) rather
than a trail of half-applied link changes.

## What a route edit costs

Anything that changes the order — a swap, a move, a different start — **replays**
the chain: each stop's own commits are rebased onto its new base. So it can
**conflict**, exactly like a restack. Gitcito stops at the first conflict and
hands you the conflict view; the stops before it have already moved.

Undo replays the previous route. It does not resurrect the old commits, because
the new ones are the same work with different parents.

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
- Reordering and changing the start **rewrite history** on every stop they touch. The
  The branches are yours and unpushed stops cost nothing, but a stop that is
  already under review gets a force-push on the next submit.
- A stop moves one place at a time. Two swaps are two rebases, and
  stopping halfway is a legible state; a drag that lands three places away is
  not.

## Where the links live

Parent links are stored in **git config**, so they travel with the repository
and survive a reclone. Nothing lives in a service.

**See also:** [Interactive rebase](rebase.md) · [Hosting & pull requests](hosting.md)
