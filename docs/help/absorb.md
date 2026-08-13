---
title: Absorb
category: Working with changes
order: 33
summary: Send each staged fix back into the commit that introduced the line.
keywords: absorb fixup autosquash amend staged hunks blame review fixes
---

# Absorb

You fixed three review comments across three files. The honest thing is three
`fixup!` commits aimed at the right parents. The thing people actually do is one
commit called "review fixes".

Absorb does the honest thing for you.

## How it works

1. Stage the fixes.
2. Tools → **Absorb staged changes…** (or <kbd>⌘K</kbd>).
3. Gitcito blames the lines each staged hunk touches, finds which of **your
   unpushed commits** introduced them, and shows you the plan before doing
   anything.

The plan lists each target commit with the hunks headed for it, plus a
**Belongs to nothing yet** group — a brand-new file has no history to be
absorbed into, so it stays staged for you to commit normally.

| Button | What happens |
|---|---|
| **Create fixups** | One `fixup!` commit per target. Nothing is rebased. |
| **Create fixups & rebase** | The same, then an autosquash rebase folds them in. |

## The rules it plays by

- **Only unpushed commits are candidates.** Anything already published is not
  ours to rewrite. If everything is pushed, absorb says so and does nothing.
- **The working tree is never touched.** Only the index and the commits absorb
  itself creates.
- **A failure leaves no mess.** If any step fails, HEAD and the index are put
  back exactly as they were.
- It refuses to run during a merge or rebase — that index belongs to git.

**See also:** [Interactive rebase](rebase.md) · [Staging](staging.md)
