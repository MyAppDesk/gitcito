---
title: External diff & merge tools
category: Branching & surgery
order: 43
summary: Hand a file to Kaleidoscope, Beyond Compare, Meld or whatever you already use — Gitcito reads git's own tool list.
keywords: difftool mergetool external diff merge kaleidoscope beyond compare meld kdiff3 p4merge araxis opendiff filemerge vimdiff winmerge diff.tool merge.tool orig backup
---

# External diff & merge tools

Gitcito's [diff viewer](diffs.md) and [three-pane resolver](conflicts.md) handle
most days. Some days they do not: a 4,000-line generated file, a merge where you
need to see four columns at once, or simply the tool you have used for a decade
and read faster than any new one.

**Settings → General → External diff & merge tools.**

## It is git's list, not ours

Gitcito keeps no table of its own. The dropdowns are `git difftool --tool-help`
and `git mergetool --tool-help`, which is why:

- The tools git already found on your machine are listed first; the ones it
  knows but cannot find are listed after, marked *not installed*.
- **A custom tool works with no extra support.** If you have

  ```sh
  git config --global difftool.mine.cmd 'mycompare "$LOCAL" "$REMOTE"'
  ```

  then `mine` appears in the dropdown like any built-in.
- Your choices are written to **`diff.tool` and `merge.tool` in your global git
  config** — the same keys your terminal reads. Set it here and `git difftool`
  on the command line behaves the same way. Set it there and Gitcito picks it up.

Git knows roughly thirty tools out of the box, including Kaleidoscope, Beyond
Compare, Meld, KDiff3, P4Merge, Araxis, DiffMerge, WinMerge, FileMerge, VS Code
and the vim family.

## Where the actions appear

| Surface | Action |
|---------|--------|
| A changed file in the [commit composer](committing.md) | **Diff in \<tool\>** — working tree against the index |
| The [conflict resolver](conflicts.md) | **Merge in \<tool\>** — the full three-way merge |

Both entries only appear when a tool is actually configured; an unconfigured
`git difftool` would just error, and an inert button is worse than no button.

## What happens while the tool is open

Gitcito waits for it to close. That is deliberate — `git mergetool` only stages
the resolved file *after* the tool exits, so there is a real result to report —
and it is why the button shows a spinner rather than returning immediately.

The rest of the app stays responsive: these run outside the per-repository lock
that serialises normal git operations, so a merge tool left open over lunch does
not freeze the tab behind it.

When an external merge succeeds, git stages the file itself and Gitcito closes
the resolver and refreshes. If you close the tool without saving, git says so and
nothing changes.

## The `.orig` file

`git mergetool` leaves a `<file>.orig` backup next to the resolved file by
default — git's behaviour, not Gitcito's. The toggle in Settings writes
`mergetool.keepBackup`; turn it off and a resolved file leaves nothing behind.

## Limits

- **Working-tree diffs only.** The composer's entry compares what you have now
  against the index. Comparing two historical commits externally is not wired up
  — use the built-in [diff viewer](diffs.md) or the [comparison](merging.md) for
  that.
- **One file at a time.** There is no "diff every changed file" sweep.
- **Gitcito never installs anything.** A tool marked *not installed* stays
  selectable, because git may still find it after you install it — but it will
  fail until you do.
