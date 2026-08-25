---
title: The menu bar
category: Start here
order: 5
summary: What lives in Gitcito's macOS menus, and why Windows and Linux do not have one.
keywords: menu bar menubar application menu file edit view window help repository macos native menus about quit
---

# The menu bar

A menu bar answers a question no other surface answers well: *what can this app
even do?* The [command palette](search.md) is faster once you know what you are
looking for, and the [cheatsheet](keyboard.md) lists the keys — but neither is
somewhere you browse. The menus are.

Everything in them is also reachable from inside the window. Nothing is
menu-only, on purpose: a feature that exists only in a menu is a feature Windows
and Linux users do not have.

## What is where

| Menu | Holds |
|---|---|
| **Gitcito** | About, update check, [Settings](repo-settings.md), the standard hide and quit items |
| **File** | New tab, open or [clone](cloning.md) a repository, open recent, close and reopen tabs |
| **Edit** | Cut, copy, paste, undo — the text editing your keyboard already does — plus [code search](search.md) |
| **View** | Command palette, the sidebar and panel toggles, the [terminal](terminal.md), [mission control](mission-control.md), the [vault](vault.md), zoom |
| **Repository** | Fetch, pull, push, commit, stash, new branch, [pull request](hosting.md), undo, reveal in Finder, repository settings |
| **Window** | Minimise, zoom, bring all to front |
| **Help** | This handbook, the cheatsheet, what's new, licences, report an issue |

The Repository menu greys out entirely when the active tab is not a git
repository, and **Undo** greys out when there is nothing to undo — the menu is a
readable summary of what the app will let you do right now.

## Shortcuts shown, not seized

The keys next to each item are the ones you have actually bound. Rebind
<kbd>⌘K</kbd> in Settings and the View menu says so.

That works because the menu *displays* those combos without claiming them:
Gitcito's own keyboard handling stays in charge, which is what lets a shortcut
behave differently depending on where the caret is. The one thing this cannot
show is a shortcut Gitcito does not own — <kbd>⌘F</kbd> belongs to whichever
file or diff you are reading, so no menu item claims it.

## The limits

- **macOS only.** On Windows and Linux the window is frameless — the title bar
  is drawn by Gitcito, and there is nowhere for a menu bar to live. Those
  platforms get the same commands through the [command palette](search.md) and
  the [keyboard shortcuts](keyboard.md).
- **Reload and Developer Tools appear in development builds only.** Reloading
  throws away every open tab's state, which is not something a release build
  should offer next to Zoom.
- **Open Recent lists ten repositories at most**, most recent first, and it
  tracks the same list the [welcome screen](getting-started.md) shows.
- **Reopen Closed Tab is never greyed out.** The closed-tab stack lives for the
  session only and the menu cannot see it; choosing it with nothing to reopen
  does nothing.
