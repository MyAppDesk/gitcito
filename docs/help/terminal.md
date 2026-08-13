---
title: Integrated terminal
category: Workspace tools
order: 90
summary: A real PTY docked under the repo, with tabs per repository.
keywords: terminal shell pty xterm console tabs docked
---

# Integrated terminal

A real PTY (xterm + node-pty), not a command runner. Your shell, your prompt,
your aliases.

![The integrated terminal](../screenshots/terminal.png)

- **Multiple tabs per repository**, each starting in that repository's folder.
- Dock it **under** the graph or as a **right-hand column**; the pane remembers
  its size.
- Terminal visibility is per repository: switching to a tab that never opened one
  keeps it closed.
- Tabs name themselves after what is running in them.

Anything you run here is invisible to Gitcito's own locking, so a long
`git rebase` typed by hand and a click in the UI can still collide — the app
refreshes from disk when the terminal changes something.

**See also:** [Run & debug](launch.md) · [Hooks](hooks.md)
