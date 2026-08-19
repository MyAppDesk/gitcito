---
title: Resolving conflicts
category: Working with changes
order: 32
summary: A three-pane resolver that tells you which side is which.
keywords: conflict resolver merge conflicts ours theirs resolve markers three-way rerere reuse recorded resolution remember replay
---

# Resolving conflicts

When a merge, rebase, cherry-pick or revert stops, a banner tells you **what**
stopped and **between what** — "merging `feature/x` into `main`", not just
"conflict".

![The conflict resolver](../screenshots/conflict-resolver.webp)

## Why this conflicts

**Why this conflicts** in the header lists, per side, the commits that touched
this file since the branches parted — `git log --merge`, which git has shipped
forever and nobody finds.

![The commits from each side that touched the conflicted file](../screenshots/conflict-why.webp)

Markers say what clashes. This says who changed it and why, which is usually
what actually decides the resolution. Nothing there means neither side committed
a change to this exact path — the clash came from a rename or a move.

## The three panes

| Pane | Is |
|---|---|
| Left | **Ours** — the side you were on, labelled with its commit |
| Right | **Theirs** — the side coming in, labelled with its commit |
| Middle | The **output**: editable, with line numbers, and what actually gets staged |

All three panes resize, and the output header carries two view toggles:

| Toggle | What it does |
|---|---|
| **Wrap** | Folds long lines inside the A and B panes instead of scrolling them. The output pane keeps one row per line — its side markers depend on that — so it always scrolls |
| **Linked** | Scrolls A, B and the output together, vertically and sideways. Their line counts differ, so the vertical position is matched by proportion |

Wrap starts off, Linked starts on, and both remember their state.

## Getting around

Opening a file lands you on its **first conflict**, not at the top of the file.
The ⌃ / ⌄ arrows in the output header — or <kbd>Alt+↑</kbd> /
<kbd>Alt+↓</kbd> — step through the rest, scrolling all three panes to each
one.

## Picking

Per **line**, per **chunk**, or the **whole side** at once — and you can take
both sides of a chunk when the answer is "keep both". A conflict-by-conflict
navigator walks you through what is left, so you cannot accidentally leave a
marker behind.

## AI assist

With AI enabled, **Resolve with AI** proposes a merge into the output pane. It
never applies anything on its own: you read it, edit it, and stage it. See
[AI features](ai.md).

## Avoiding them in the first place

[Conflict radar](conflict-radar.md) tells you which branches will conflict
before you merge any of them.

## Letting git remember (rerere)

Rebase a long-lived branch and you meet the same conflict every time. `rerere`
— *reuse recorded resolution* — is git's answer: it memorises how you settled a
conflict and replays that answer the next time the identical one appears.

**Settings → General → Remember conflict resolutions.** It writes
`rerere.enabled` to your global git config, so the command line behaves the same
way.

When git has answered for you, the resolver says so instead of showing an empty
"no conflict markers" screen, and offers **Forget this resolution** — which drops
the memory *and* brings the conflict back, so you can settle it differently.

Two things worth knowing:

- **A replayed resolution is not staged** unless you turn on *Stage a replayed
  resolution automatically*. Leave that off: the point of the pause is that a
  memorised answer can be wrong for this particular merge, and staging without
  looking is how it reaches a commit.

  This is why a replayed file **stays in Conflicted files**: git wrote the
  content but the index still holds it as unmerged, and only staging settles
  that. **Stage as-is** in the resolver, or **Mark all resolved** in the list,
  is what moves it.
- **rerere does not understand every conflict.** Add/add and delete/modify
  conflicts get no preimage, so they always come back raw. The count in Settings
  is how many it actually holds, and **Forget all** empties it.

**See also:** [Conflict radar](conflict-radar.md) · [Merging & rebasing](merging.md)
