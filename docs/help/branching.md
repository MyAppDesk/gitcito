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

**See also:** [Merging & rebasing](merging.md) · [Worktrees](worktrees.md)
