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

![The integrated terminal](../screenshots/terminal.webp)

- **Multiple tabs per repository**, each starting in that repository's folder.
- Dock it **under** the graph or as a **right-hand column**; the pane remembers
  its size.
- Terminal visibility is per repository: switching to a tab that never opened one
  keeps it closed.
- Tabs name themselves after what is running in them.
- Collapsing the terminal list shrinks it to a **rail**: one icon per terminal
  (split terminals show a mini panel map), click to switch, right-click for the
  usual rename/split/kill menu.

![Two panels split side by side in one terminal group](../screenshots/terminal-split.webp)

## Keys

| Keys | Does |
|---|---|
| <kbd>⌃`</kbd> | Show or hide the terminal — the physical Control key, on every platform |
| <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> | New terminal, while the terminal has focus |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | Close the focused terminal; closing the last one hides the panel |

The last two are scoped to the terminal on purpose: away from it, they still
open and close [workspace tabs](workspaces.md).

Anything you run here is invisible to Gitcito's own locking, so a long
`git rebase` typed by hand and a click in the UI can still collide — the app
refreshes from disk when the terminal changes something.

**See also:** [Run & debug](launch.md) · [Hooks](hooks.md)
