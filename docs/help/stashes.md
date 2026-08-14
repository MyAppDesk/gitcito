---
title: Stashes
category: Sync & many repos
order: 52
summary: Partial stashes, per-file apply, and stash → branch.
keywords: stash stashes partial keep-index apply pop drop untracked branch
---

# Stashes

Stashing in Gitcito is not all-or-nothing.

| Action | What it does |
|---|---|
| **Stash** | Everything, including untracked files if you want, with a message |
| **Partial stash** | Tick just the files you want; optionally `--keep-index` |
| **Apply / Pop** | Whole stash, or **just some of its files** |
| **Stash → branch** | `git stash branch` — the escape hatch when a stash will not apply cleanly |

Selecting a stash shows its files and diffs, exactly like a commit.

![A partial stash: tick only the files that should go in](../screenshots/stash-partial.webp)

## When a stash will not apply

If applying a stash would clobber untracked files, git stops. Gitcito offers to
overwrite them and retry, rather than leaving you to work out the incantation.

If the tree has moved too far, **stash → branch** recreates the branch the stash
was taken from, applies it there cleanly, and drops the stash.

## Not to be confused with snapshots

[WIP snapshots](recovery.md) are automatic and hidden; stashes are deliberate
and listed. Snapshots never touch your stash list.

**See also:** [Recovery](recovery.md) · [Staging](staging.md)
