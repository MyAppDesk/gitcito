---
title: The command line
category: Workspace tools
order: 93
summary: `gitcito .` — like `code .`, for Git.
keywords: cli command line terminal shim path install open folder single instance
---

# The command line

```sh
gitcito .                        # open this folder
gitcito ~/code/api               # …or that one
gitcito . -n "My API"            # with a display name
gitcito . -g "Work"              # inside a group tab
gitcito . -n "My API" -g "Work"  # both
```

## Installing the shim

Command palette (<kbd>⌘K</kbd>) → **Install 'gitcito' command in PATH**
(macOS). It symlinks a small shim into `/usr/local/bin` or
`/opt/homebrew/bin`, asking for admin rights only if neither is writable by you.
Run the same command again to uninstall.

## How it behaves

- If the path is **already open** — as a tab or inside a group — Gitcito
  **focuses it** instead of opening a duplicate.
- If it is not a Git repository yet, it still opens, offering the "initialise
  repository here" flow.
- `-g` adds the repository to a group of that name, creating the group if it
  does not exist.
- Gitcito is **single-instance**: running `gitcito` while the app is open hands
  the request to that window rather than launching a second copy.

**See also:** [Workspaces, tabs & groups](workspaces.md)
