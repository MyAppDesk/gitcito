---
title: Staging
category: Working with changes
order: 30
summary: Stage whole files, single hunks, or individual lines.
keywords: staging stage unstage discard hunk lines index partial copy path relative change summary chips
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

In the native Rust preview, Changes has **Working tree**, **History** and
**Stashes** tabs. Working tree puts staged and unstaged files in separate
groups on the left, each with its own count and bulk action. The selected
file's diff stays beside the list on the right; drag the divider to give either
side more room. Each row has a colored
Git-status badge, filename and parent path, one vector stage or unstage control,
and a component menu for discard or ignore actions. The diff and commit composer
share the available height in Working tree, keeping both in view on a standard
window. History and Stashes have their own panes, so long commit lists and stash
tools do not push the diff and composer down the page.
WIP snapshots, commit notes sync and range-diff live together under **Tools**,
keeping occasional workflows out of the main staging workspace.
History uses a resizable master/detail layout: commit graph and filters stay on
the left, while the selected commit's message, diff and recovery actions stay on
the right. Each pane scrolls independently.
Stashes also uses a resizable split: saved stashes stay on the left, while the
selected stash's changed files and preview stay together on the right.

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
