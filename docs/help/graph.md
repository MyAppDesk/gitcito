---
title: The commit graph
category: Repository & history
order: 10
summary: Reading history: lanes, refs, columns, filters and multi-select.
keywords: graph history commits lanes branches merges columns filter linear first-parent
---

# The commit graph

Branches, merges and octopus merges drawn properly, in light or dark. Rendering
is windowed, so a repository with a hundred thousand commits scrolls like one
with a hundred.

| | |
|---|---|
| ![Commit graph, light](../screenshots/graph-light.png) | ![Commit graph, dark](../screenshots/graph-dark.png) |

## Moving around

- <kbd>↑</kbd> <kbd>↓</kbd> (or <kbd>j</kbd> <kbd>k</kbd>) walk the selection.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd>-click toggles a commit into a **multi-selection**;
  <kbd>⇧</kbd>-click takes a range. With several selected, right-click to
  cherry-pick them onto the current branch, squash a contiguous run, export one
  combined patch, or copy their SHAs.
- Commits that arrived in your **last fetch or pull** are flagged as new.

## Making it show what you want

- **Linear view** (first-parent) hides everything merged in, leaving the trunk.
- **Filter by path**: right-click a file or folder → *Filter graph by this
  path*, and only the commits that touched it stay lit.

![Graph filtered down to one path](../screenshots/graph-path-filter.png)

- **Columns**: show, hide, resize and reorder branch, message, author, date,
  SHA, signature and deployment columns.
- **Style**: Settings → Themes → **Graph** — lane palette (8 built-ins, custom,
  or AI-generated), corner style, row density and line thickness, with a live
  mini-graph preview.

![Graph style settings with live preview](../screenshots/settings-graph.png)

## Commit details

Selecting a commit shows its changed files (tree or flat), author, SHA,
co-authors, and its signature. `#123` references and `@mentions` are autolinked
to your host.

![Walking through commit details](../screenshots/clip-commit-details.gif)

**See also:** [Blame & file history](blame.md) · [Search](search.md) · [Time machine](time-machine.md)
