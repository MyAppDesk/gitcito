---
title: Keyboard & shortcuts
category: Start here
order: 2
summary: The keys worth learning, and how to rebind them.
keywords: shortcuts keyboard keys cheatsheet rebind hotkeys palette
---

# Keyboard & shortcuts

Press <kbd>?</kbd> anywhere for the cheatsheet. On macOS the same keys are
listed next to their commands in the [menu bar](menu-bar.md).

![The shortcut cheatsheet](../screenshots/cheatsheet.webp)

## The ones worth learning

| Keys | Does |
|---|---|
| <kbd>⌘K</kbd> | [Command palette](search.md) — branches, commits, files, actions |
| <kbd>⌘⇧F</kbd> | [Code search](search.md) across the working tree |
| <kbd>⌘⇧V</kbd> | [Vault](vault.md) |
| <kbd>⌘O</kbd> / <kbd>Ctrl+O</kbd> | Open a repository |
| <kbd>⌘,</kbd> / <kbd>Ctrl+,</kbd> | Open Settings |
| <kbd>⌘F</kbd> | Find inside the file or diff you are reading |
| <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> | Open the new-tab repository or group picker |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | Close the active tab — or the window, once no tab is left |
| <kbd>⌘1</kbd>–<kbd>⌘9</kbd> / <kbd>Ctrl+1</kbd>–<kbd>Ctrl+9</kbd> | Switch to a tab by its position |
| <kbd>⌘⇧T</kbd> | Reopen the last closed tab |
| <kbd>⌃`</kbd> | Show or hide the [integrated terminal](terminal.md) — the physical Control key on every platform |
| <kbd>⌘⇧E</kbd> / <kbd>Ctrl+Shift+E</kbd> | Show or hide the left sidebar |
| <kbd>⌘⌥B</kbd> / <kbd>Ctrl+Alt+B</kbd> | Show or hide the right panel — Details, or [Repository chat](repo-chat.md) |
| <kbd>?</kbd> | This cheatsheet |

While the terminal has focus, <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> opens another
terminal and <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> closes the current one, hiding
the panel when it was the last. Everywhere else those two keys still belong to
[workspace tabs](workspaces.md).

## Moving without the mouse

| Where | Keys |
|---|---|
| Commit graph | <kbd>↑</kbd> <kbd>↓</kbd> or <kbd>j</kbd> <kbd>k</kbd> |
| File lists (commit, WIP, stash) | the same |
| [Time machine](time-machine.md) | <kbd>←</kbd> <kbd>→</kbd>, <kbd>⇧</kbd> for ten, <kbd>Home</kbd>/<kbd>End</kbd> |
| [Mission control](mission-control.md) | <kbd>↑</kbd><kbd>↓</kbd>, <kbd>Enter</kbd> to open, <kbd>f</kbd>/<kbd>p</kbd> to fetch/pull, <kbd>/</kbd> to filter |
| Commit message box | <kbd>↑</kbd> <kbd>↓</kbd> recalls your recent messages |

## Rebinding

**Settings → Shortcuts**. The core navigation shortcuts (palette, code search,
vault, open repository, settings, and the two panel toggles) are rebindable,
with conflict detection and a per-shortcut reset.

The fixed shortcuts above are not rebindable, and they are also refused as a
_target_: the app answers <kbd>⌘T</kbd>, <kbd>⌘W</kbd>, <kbd>⌘1</kbd>–<kbd>⌘9</kbd>,
<kbd>⌘⇧T</kbd>, <kbd>⌘S</kbd>, <kbd>⌘Z</kbd>, <kbd>⌘⇧Z</kbd>, <kbd>⌘F</kbd> and
<kbd>⌃`</kbd> before it consults your bindings, so a shortcut assigned to one of
them would look set and never fire. Pick one of those and the editor says so
instead of accepting it.

On macOS, <kbd>⌥</kbd> chords are matched by physical key rather than by the
character they produce, because <kbd>⌥B</kbd> types `∫`. On Windows and Linux,
AltGr never triggers a shortcut, so international layouts keep typing.

![Rebindable shortcuts in settings](../screenshots/settings-shortcuts.webp)

**See also:** [Command palette & search](search.md)
