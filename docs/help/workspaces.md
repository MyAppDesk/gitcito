---
title: Workspaces, tabs & groups
category: Start here
order: 3
summary: Many repositories without drowning: tabs, groups, folders and workspaces.
keywords: workspace tabs groups folders multiple repos organise switch layout
---

# Workspaces, tabs & groups

Three levels, from loosest to tightest.

## Tabs

One repository, one tab. Use <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> to open the
new-tab picker and <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> to close the active tab.
You can also drag to reorder, middle-click to close, or press <kbd>⌘⇧T</kbd>
to reopen the last one you closed. Right-click a repository tab (or a chip
inside a [group](#groups)) for the [repository context menu](repo-menu.md) —
alias, worktrees, GitHub, terminal, reveal, editor, and remove. Close the last
tab and <kbd>⌘W</kbd> closes the window instead. A dot on the tab means
uncommitted work; a different one means conflicts.

If a close warning appears, <kbd>Escape</kbd> always cancels. <kbd>Enter</kbd>
confirms only when the tab is clean — when there are uncommitted changes or
conflicts the warning deliberately makes you reach for the button, so a stray
keypress after <kbd>⌘W</kbd> cannot close work you were still holding.

## Groups

Bundle related repositories into a named, colour-coded **group tab**. Inside a
group you get a second row with one chip per repository, and the group itself
can **Fetch all** or **Pull all** in one go.

![A group tab with several repositories](../screenshots/repo-groups.webp)

Groups can hold **folders, nested to any depth**: right-click the group → *New
folder…*, then drag repositories onto a folder chip. Each folder takes a colour,
collapses to a counted chip, aggregates the status dots of everything inside it,
and can fetch or pull its whole subtree.

![Folders in the group's tab strip, each a counted chip — Internal nested inside Services](../screenshots/nested-folders.webp)

> Folders only organise. Deleting one lifts its repositories to the parent — it
> never closes a repository.

## Workspaces

A workspace is a **whole saved tab strip**. Switching swaps every tab at once:
`Work` and `Personal` stop stepping on each other.

The workspace name sits top-left, next to the Gitcito mark. Click it to switch,
create, rename, reorder or delete. Next to it is the gauge that opens
[Mission control](mission-control.md) for the workspace you are in.

**See also:** [Mission control](mission-control.md) · [The command line](cli.md)
