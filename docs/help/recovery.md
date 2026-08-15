---
title: Recovery & the reflog
category: Recovery & safety
order: 60
summary: The undo net: reflog, WIP snapshots and bisect.
keywords: reflog recovery undo lost commits snapshots wip bisect bisect run automated script exit code restore hard reset
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
