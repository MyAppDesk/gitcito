---
title: Edit any commit
category: Branching & surgery
order: 46
summary: Rewrite a historical commit's files or message in place — cascade previewed first.
keywords: edit commit rewrite history amend past reword fix typo cascade replay rebase in place surgery
---

# Edit any commit

The typo is in a commit from three weeks ago. The usual fix is an interactive
rebase: stop at the commit, edit, continue, pray. Gitcito's fix is: right-click
the commit, **Edit this commit**, change the text, done. The pen button in the
commit details panel opens the same editor.

![Editing a historical commit](../screenshots/commit-edit.webp)

## What it does

Pick any commit on a linear path to `HEAD`. The modal shows its files and
message; edit either. Two things happen from there:

1. **Preview cascade** replays every commit above the edited one *in memory*
   (a chain of `merge-tree` cherry-picks — no checkout, no working tree, no
   refs). Each descendant shows up green or red, so you know **before anything
   moves** whether the edit ripples cleanly or collides with a later change.
2. **Rewrite history** does it for real: the same chain is built with plumbing,
   then the branch moves with `reset --keep` — your uncommitted changes are
   carried over, or the reset aborts and nothing has happened. A
   [guard snapshot](recovery.md) is taken first, and undo restores the old
   chain.

Authorship and dates of every replayed commit are preserved; only the hashes
change — that is what rewriting history means.

## When the cascade conflicts

A later commit touched the same lines you are editing. The preview marks that
commit red with the conflicting files and the rewrite refuses to run — nothing
is half-applied, ever. Either edit differently, or take the conflict head-on
with an [interactive rebase](rebase.md).

## Limits

- **Linear history only.** A merge between the commit and `HEAD` disables
  editing — replaying merges is a different, harder problem.
- Binary files and files over 2 MB are shown but not editable.
- A commit that is already on a remote can be edited, but your next push will
  have to be a **force push** — the modal warns before you commit to that.
- Deleted files in the commit can't be edited (there is no content to edit).

**See also:** [Interactive rebase](rebase.md) · [Recovery & snapshots](recovery.md) · [Absorb](absorb.md)
