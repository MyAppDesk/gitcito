---
title: Environment check
category: Start here
order: 6
summary: What Gitcito relies on outside its own install — git, LFS, the native terminal, git's credential helper, the GitHub CLI and file watches — checked in one place.
keywords: environment doctor diagnostics health check git version lfs node-pty terminal basic shell credential helper store gh github cli scopes workflow inotify max_user_watches
---

# Environment check

Some failures are not about the repository at all. They come from the machine:
a git too old for profile sign-in, a terminal that silently fell back to basic
mode, a GitHub CLI login that cannot push workflow files. Each one shows up
later as a vague error, in the middle of something else. **Settings →
Environment** (also *Settings: Environment* in the command palette) checks them
up front.

The [repository doctor](repo-settings.md) answers a different question: whether
*this repository* can build here, from what its `.gitcito.json` asks for. The
environment check covers the app itself and is the same for every repository.

![Environment checks in Settings](../screenshots/settings-environment.webp)

## What it checks

| Row | Green means | Yellow or red means |
|-----|-------------|---------------------|
| **Git** | git 2.31 or newer is on `PATH` | Older than 2.31: a [profile](profiles.md)'s account cannot sign in for fetch and push. Missing: nothing works until git is installed |
| **Git LFS** | `git lfs` is installed | Not installed. Only repositories that keep files in LFS need it |
| **Terminal** | The native terminal loaded | The [terminal](terminal.md) runs in basic mode: no colors, no resizing, no full-screen programs |
| **Credential helper** | git has a helper for HTTPS passwords — globally, or for specific hosts (what `gh auth setup-git` sets up) | No helper, so git outside Gitcito asks every time. Or `store`, which keeps them in plain text. See [Credential helper](credentials.md) |
| **GitHub CLI** | `gh` is signed in with the `workflow` scope | Signed in without it: GitHub refuses any push that changes `.github/workflows` |
| **File watches** (Linux) | The inotify limit is at least 65,536 | A lower limit runs out with a few large repositories open, and new folders stop refreshing the status |

A row that does not apply is left out: the GitHub CLI when it is not installed
or not signed in, file watches on macOS and Windows.

## Fixing what it finds

Where there is a fix, the row shows it as a command with a copy button. For
example, `gh auth refresh -h github.com -s workflow` adds the missing scope, and
a `sysctl` line raises the inotify limit. **The page never runs anything
itself.** Some fixes need `sudo` or change global configuration, and those are
yours to read before you run them. After running one, press **Check again**.

## Limits

- It checks what the app can see from its own process. A shell profile that
  changes `PATH` only inside your terminal can make the two disagree.
- The GitHub CLI row reflects `gh`'s own login, not the accounts connected in
  **Settings → Integrations**. Those are separate credentials. A missing
  `workflow` scope there shows up as a refused push instead.
- It reports what is installed. It does not install or upgrade anything.
