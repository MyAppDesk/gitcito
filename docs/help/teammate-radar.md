---
title: Teammate radar
category: Branching & surgery
order: 45
summary: Who moved what upstream — and whether it lands on your uncommitted work.
keywords: teammate radar remote activity upstream awareness overlap dirty files collision who touched conflict fetch
---

# Teammate radar

You are editing `api.ts`. So is someone else, on a branch you have not looked
at. The usual way to find out is a merge conflict next week; the radar's way is
a list, today.

Everything is computed from your **last fetch** — remote-tracking refs, an
in-memory `merge-tree`, nothing else. No server, no agent on your teammates'
machines, no network beyond the fetch you were doing anyway.

![Teammate radar](../screenshots/teammate-radar.webp)

## What a row tells you

For every remote branch that has commits your `HEAD` does not:

| Column | Meaning |
|--------|---------|
| Who & when | The last committer on that branch, and how long ago |
| Commits / files | How much is incoming, and how many files it touches |
| **Overlap** | Which of those files are **dirty in your working tree right now** — the red pill |
| Risk | Whether merging that branch into `HEAD` would conflict (same engine as the [conflict radar](conflict-radar.md)) |

Rows are sorted by how much they collide with you: overlap first, then
predicted conflicts, then recency. Expand a row for the exact file lists;
**Compare** opens the full branch comparison.

## When it speaks up

After every fetch — manual or automatic — the radar sweeps silently. It shows a
toast only when upstream commits touch files you have modified **and** that set
actually changed since the last sweep. No dirty files, no noise: a clean
working tree cannot collide with anything.

## Limits

- It sees what the last fetch saw. A teammate who has not pushed is invisible —
  this reads refs, not minds.
- Overlap is path-level, not line-level: touching the same file is a heads-up,
  not proof of a conflict. The **Risk** column is the line-level answer, but
  only between committed states.
- Branches idle for more than ~45 days are skipped, and only the 30 most
  recently moved are scanned.

**See also:** [Conflict radar](conflict-radar.md) · [Syncing](syncing.md) · [What changed since](range-diff.md)
