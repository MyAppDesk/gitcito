---
title: Branches, remotes & the sidebar
category: Branching & surgery
order: 40
summary: Everything the left sidebar does, and pinned branches.
keywords: branch branches create checkout rename delete remote pinned sidebar presence
---

# Branches, remotes & the sidebar

One reorderable, searchable sidebar holds **branches, remotes, tags, stashes,
worktrees and submodules**. Every section can be hidden or reordered
(Settings → Layout), and the filter box applies to all of them.

![The sidebar, with pinned branches held at the top](../screenshots/pinned-branches.webp)

## Branches

Create, check out, rename and delete — local and remote. Branch rows show:

- **↑ahead / ↓behind** against their upstream,
- **per-remote presence badges** (which remotes have this branch),
- a **risk dot** after a [conflict radar](conflict-radar.md) scan,
- a **⟳ marker** when the remote [rewrote history](range-diff.md).

Branches with `/` in their names fold into collapsible folders automatically.

![Slash-separated branch names folded into a tree](../screenshots/branch-grouping.webp)

## Pinned branches

Star the branches you keep coming back to — hover the row and click ★, or
right-click → *Pin branch*. They surface in a **Pinned** group at the top of the
Local section, remembered per repository, while staying in their normal place
below.

## Checking out a remote branch

Double-click a remote branch to create the local one that tracks it. If a local
branch of that name already exists and has **diverged**, Gitcito asks how to
reconcile — rebase, merge or reset — and offers to back the branch up first.

![The diverged-branch prompt: rebase, merge or reset, with a backup option](../screenshots/diverged-checkout.webp)

### When your local branch is behind

It is fast-forwarded to the remote tip as part of the checkout. A dirty working
tree is stashed under a named stash and restored afterwards, so local edits do
not abort the update.

### When your local branch is ahead

If the local branch is ahead and the remote has nothing new, checking out would
answer a request for the *remote* branch with your own unpushed work — so
nothing is checked out until you say which side you meant:

| Choice | What happens |
|--------|--------------|
| Check out local | Switches to the local branch, commits intact. What every other client does silently. |
| Reset (soft) | Moves the branch back to the remote tip; the commits' changes stay **staged**, ready to recommit. |
| Reset (mixed) | Same move, changes left **unstaged** in the working tree. |
| Reset (hard) | Discards the commits *and* their changes. |

![The ahead-branch prompt: check out local, or reset soft, mixed or hard](../screenshots/ahead-checkout.webp)

Leave *Create a backup branch first* ticked and the local tip is saved as
`backup/<branch>-<timestamp>` before anything moves, so even a hard reset is a
branch checkout away from being undone. The reset also lands in the undo stack
(⌘Z) — but only until you close the repository, which the backup branch
outlives.

**Limits:** the picker only compares the branch against the tracking ref that
was just fetched, so a remote that rejected the fetch (offline, bad
credentials) is compared against the last known tip. It says nothing about
whether your commits are *good* — only that they exist here and not there.

**See also:** [Merging & rebasing](merging.md) · [Worktrees](worktrees.md)
