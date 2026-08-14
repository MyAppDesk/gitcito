---
title: Recovery & the reflog
category: Recovery & safety
order: 60
summary: The undo net: reflog, WIP snapshots and bisect.
keywords: reflog recovery undo lost commits snapshots wip bisect restore hard reset
---

# Recovery & the reflog

Git rarely loses anything. The hard part is finding it again.

## Reflog

Every move of `HEAD` — and of each branch — with what caused it: checkout,
reset, rebase, amend, a forced fetch. From any past entry you can **check it
out**, **branch from it**, or **hard-reset to it**.

![The reflog viewer](../screenshots/reflog.webp)

This is the "I just reset the wrong branch" button.

## WIP snapshots

Uncommitted work is the one thing the reflog cannot save, so Gitcito snapshots
it: your tracked changes plus the staged index, captured as a `git stash create`
commit pinned under `refs/gitcito/wip`.

![WIP snapshots](../screenshots/snapshots.webp)

- It **never touches your working tree** and **never appears in your stash
  list** — it is a hidden ref, not a stash.
- Take one by hand, or let it run every **5 / 15 / 30 minutes**.
- Restore or delete any snapshot from the list.

## Guided bisect

Mark commits good and bad, watch the range narrow, land on the first bad commit.
Gitcito tracks how many steps are left, so you know whether you are two
questions from the answer or ten.

![Guided bisect](../screenshots/bisect.webp)

## Undo / redo

Most operations push an entry onto an undo stack, so <kbd>⌘Z</kbd> reverses the
last one where git allows it.

**See also:** [What changed since](range-diff.md) · [Stashes](stashes.md)
