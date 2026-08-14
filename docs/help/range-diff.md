---
title: What changed since
category: Reading changes
order: 23
summary: Someone force-pushed the branch you reviewed. See what actually changed.
keywords: range-diff force push rebase rewritten review interdiff reflog forced update
---

# What changed since

You reviewed a branch. Someone rebased it and force-pushed. A normal diff is now
worthless: every commit after a rebase is a new commit, so everything looks new.

`git range-diff` pairs the two versions commit by commit, and Gitcito reads the
old positions straight out of the **reflog** — so nothing had to be recorded in
advance for this to work.

![Rewritten, new and dropped commits after a force-push](../screenshots/range-diff.webp)

| Verdict | Meaning |
|---|---|
| **Rewritten** | Same commit, changed. Expand it for the interdiff — the message tweak and the extra check, not the whole file. |
| **New** | Added since you looked. |
| **Dropped** | Gone since you looked. |
| **Unchanged** | Survived the rewrite untouched. |

## Getting there

- **A fetch that finds rewritten history tells you.** A toast names the branch,
  and its row under Remotes gains a **⟳** you can click to open the comparison
  at exactly the commit it used to point at.
- Right-click any branch → *What changed since…*
- <kbd>⌘K</kbd> → *What changed since*

## Previous positions

The chips under the ref fields are the branch's reflog: forced updates, rebases,
resets, each with when it happened. Pick one and the comparison re-runs against
it. That is the whole feature — the history of where a branch has been is
already on your disk.

**See also:** [Conflict radar](conflict-radar.md) · [Recovery & reflog](recovery.md)
