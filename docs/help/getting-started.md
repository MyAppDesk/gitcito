---
title: Getting started
category: Start here
order: 1
summary: Open a repository, read the graph, make your first commit.
keywords: intro first steps open clone tabs graph commit
---

# Getting started

Gitcito opens a folder and shows you its history. Nothing is written to your
repository until you ask for it.

## Open a repository

- **Drag a folder** onto the window, or use **Open repository** on the welcome
  screen.
- From a terminal, `gitcito .` opens the current folder in the running app —
  see [the command line](cli.md).
- A folder that is not a Git repository yet still opens, offering to
  initialise it.

## The three panes

| Pane | What it holds |
|---|---|
| Left | Branches, remotes, tags, stashes, worktrees — and the **Files** tab for the working tree |
| Middle | The commit graph, and whatever you select from it |
| Right | The commit composer, or the details of the selected commit |

## Your first commit

1. Edit a file. It appears under **Unstaged**.
2. Stage it — the whole file, a hunk, or [single lines](staging.md).
3. Write a message and press **Commit**.

Everything else in Gitcito is optional. The features that make it different are
listed under [What makes Gitcito different](#gitcito-different).
