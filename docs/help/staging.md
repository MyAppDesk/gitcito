---
title: Staging
category: Working with changes
order: 30
summary: Stage whole files, single hunks, or individual lines.
keywords: staging stage unstage discard discard all undo discard restore hunk lines index partial copy path relative change summary chips
---

# Staging

The commit panel has three lists: **Conflicted**, **Unstaged** and **Staged**.
Each collapses, and each remembers whether you left it open.

![An unstaged diff, with the hunk and file controls beside it](../screenshots/line-staging.webp)

## What changed, by kind

The header above the lists splits the count the way the file rows already
do: the same status tiles (M, +, −, →, !), a number, and a short bar for the
mix. A kind with nothing in it is simply absent, not shown as zero. Hover for
the plain total.

Untracked files count as added. That is the one place staging's summary
disagrees with a commit's, because a commit has no untracked files.

## Three levels of precision

| Level | How |
|---|---|
| **File** | Click the ✚ on the row, or select several rows and stage the lot |
| **Hunk** | Open the diff and use the button on the hunk header |
| **Line** | Select lines inside the diff and stage exactly those |

Line staging is what makes it practical to keep a debug `console.log` out of a
commit without deleting it first.

## Discarding

Discard works at the same levels, and always asks. Untracked files are deleted;
tracked ones go back to their staged (or committed) state.

**Discard everything** (the bin beside the commit button) throws away every
change, staged and unstaged, newly added files included: a file you had
`git add`ed but never committed is removed, not left behind as untracked.

![Discard all changes, saying new files go too and that Undo brings them back](../screenshots/discard-all-undo.webp)

### Undoing a discard

Discarding a file, a folder or everything can be undone. Right before it runs,
Gitcito saves what was staged and what was on disk as two git trees, and the
discard goes on the undo stack. **Undo** (the toolbar button, or
*Repository → Undo last operation*) puts the discarded files back exactly as
they were: the staged part staged, the unstaged part on disk, new and untracked
files recreated. The confirm tells you whether the discard can be undone.

Undo touches only the files that were discarded. Anything you changed elsewhere
since is left alone; a discarded file you have edited again since is
overwritten with the saved version.

**Limits.** While a merge still has conflicts the index cannot be saved as a
tree, so that discard gets no undo entry and its confirm says it cannot be
undone. Ignored files are never discarded, so they are never saved either. The
saved trees are plain git objects with no ref pointing at them: they last as
long as the undo entry, and `git gc` may prune them after its grace period (two
weeks by default). For a safety net that outlives the session, see
[guard snapshots](recovery.md).

## Keyboard

<kbd>↑</kbd> <kbd>↓</kbd> (or <kbd>j</kbd> <kbd>k</kbd>) walk the file lists.
<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> grows a selection from the last row you
clicked, <kbd>⇧</kbd>-click takes a range, and <kbd>⌘</kbd>/<kbd>Ctrl</kbd>-click
toggles individual files. Right-click the selection to stage, unstage, stash or
discard everything in it at once.

## Copying paths

Right-click an uncommitted file for **Copy File Path** (absolute, with the
platform's separators) and **Copy Relative File Path** (`src/index.ts`, no
leading `./`). Several selected files copy one path per line, in list order.
Deleted files stay enabled — those actions only copy text. Folders still copy
the folder path.

## Before you commit

Gitcito checks a few things and asks once, never silently:

- a file that looks like a **secret** (`.env`, `*.pem`, `id_rsa`…),
- a **very large** blob (threshold in Settings → Security),
- committing **straight to a protected branch** (`main`/`master` by default).

Each of those offers a one-click *Ignore & untrack*. See
[Security & secrets](security.md).

**See also:** [Committing](committing.md) · [Diffs](diffs.md) · [Absorb](absorb.md)
