---
title: Fetching, pulling & pushing
category: Sync & many repos
order: 50
summary: Staying in step, with guards on the operations that bite.
keywords: fetch pull push force auto-fetch prune remotes upstream protected branch
---

# Fetching, pulling & pushing

## Pull

Three modes, picked from the dropdown: **default**, **fast-forward only**, or
**rebase**. Local changes are auto-stashed and restored around the pull, so a
dirty tree does not block you.

## Push

Force pushes always use `--force-with-lease` — the safe variant that refuses if
the remote moved since you last looked. Pushing a **protected branch** with force
asks for confirmation (list in the repo-settings gear).

![The confirmation a protected branch demands before a force-push](../screenshots/force-push-guard.webp)

## Fetch

**Fetch all & prune** across every remote, plus background **auto-fetch** on an
interval you set (Settings → General) and a "fetched X ago" badge in the toolbar.

A fetch that finds **rewritten history** says so: a toast names the branch, and
its row gains a marker that opens [what changed since](range-diff.md) at exactly
the commit it used to point at.

## Many repositories at once

- A group tab can **Fetch all / Pull all** its whole subtree.
- [Mission control](mission-control.md) does it across the workspace, and can
  pull *only* the repositories that are actually behind.

## Remotes

Add, edit, remove and fetch individual remotes from the sidebar. Branch rows
carry per-remote presence badges, so you can see at a glance which remotes have
a copy of a branch.

**See also:** [Mission control](mission-control.md) · [Hosting & pull requests](hosting.md)
