---
title: Blame & file history
category: Reading changes
order: 22
summary: Who wrote this line, when, and what it looked like before.
keywords: blame history file line author annotate reblame follow
---

# Blame & file history

Open any file and switch the view mode: **Preview · File · Diff · Blame ·
History**.

## Blame

Every line carries its commit, author and date, colour-coded by commit so blocks
of shared history are obvious at a glance.

- **Follow the line into the diff**: jump from a blame line straight to the
  change that produced it.
- **Reblame before this commit**: right-click a line to blame the file as it was
  *before* that commit — the way you walk a line's history backwards without
  leaving the view.

## History

Every commit that touched this file, newest first. Selecting one shows that
commit's version of the file, so you can page through how it grew.

For the whole repository rather than one file, use the
[time machine](time-machine.md).

## Hover to explain

With AI enabled, holding <kbd>⇧</kbd> (configurable, or no key at all) and
pointing at an identifier gives a one-line explanation of it, plus the lines it
drew on — click one to jump there. It reads only a numbered window around the
token, so when something is defined elsewhere it says so instead of inventing
it. See [AI features](ai.md).

**See also:** [The commit graph](graph.md) · [Diffs](diffs.md)
