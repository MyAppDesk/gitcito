---
title: Recovery & the reflog
category: Recovery & safety
order: 60
summary: The undo net: reflog, WIP snapshots and bisect.
keywords: reflog recovery undo lost commits snapshots wip guard untracked discard clean bisect bisect run automated script exit code restore hard reset
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
it: the **whole working tree — modified, staged and untracked files** —
committed through a throwaway index and pinned under `refs/gitcito/wip`.
Neither your real index nor your stash list is touched.

![WIP snapshots](../screenshots/snapshots.webp)

Three things take one:

| Trigger | When |
|---------|------|
| **Guard** | Automatically, right before a destructive action — discard, clean, hard reset, restore from a commit. On by default; toggle it in the snapshots dialog. |
| **Timer** | Every 5 / 15 / 30 minutes while the repo is open. |
| **By hand** | The **Snapshot now** button. |

The guard is the one that matters: the moment work is usually lost forever is
the second after a discard you didn't mean. With the guard on, that state is a
snapshot — open the list, click restore, breathe again.

Select a snapshot to see the files it captured, preview any file's change, and
restore a **single file** or the whole tree. Restoring copies files out of the
snapshot over the current copies — a guard snapshot is taken first, so a
restore is itself undoable.

**Limits worth knowing.** A timer or guard tick that finds nothing new records
nothing. Restore overwrites and recreates files, but never deletes a file you
created after the snapshot. Ignored files are not captured. Snapshots are
local hidden refs: never pushed, safe from `git gc`, newest 50 kept.

## Guided bisect

Mark commits good and bad, watch the range narrow, land on the first bad commit.
Gitcito tracks how many steps are left, so you know whether you are two
questions from the answer or ten.

![Guided bisect](../screenshots/bisect.webp)

### Let a command decide

Once the range is seeded, **Let a command decide** hands the whole search to
`git bisect run`. Git checks out each candidate, runs your command, and reads
its exit code:

| Exit code | Means |
|-----------|-------|
| `0` | Good — the bug is not here |
| `125` | Cannot test this one; skip it |
| anything else | Bad |

A test suite already speaks that language, which is why `npm test` is usually
the whole answer. Gitcito offers this project's own scripts as one-click fills,
streams the output while it runs, and lands on the first bad commit without you
answering a single question.

![The command box, ready to hand the search to a test suite](../screenshots/bisect-run.webp)

**What to watch for.** The command runs on *every* commit git tests, so a
command that deploys, publishes, or writes outside the repository will do that
several times over. Keep it to something that only reads and reports. **Stop**
kills the run and leaves the session open, so you can carry on marking by hand;
**Abort** ends the bisect entirely.

A command that fails for an unrelated reason — a missing dependency at that
point in history, say — marks a good commit bad and sends the search to the
wrong place. Exiting `125` from a wrapper script is git's way out of that.

## Undo / redo

Most operations push an entry onto an undo stack, so <kbd>⌘Z</kbd> reverses the
last one where git allows it.

**See also:** [What changed since](range-diff.md) · [Stashes](stashes.md)
