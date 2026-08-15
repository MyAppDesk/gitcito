---
title: External editor
category: Workspace tools
order: 95
summary: Send a repository, a file, or one line of code to the editor you actually write in.
keywords: editor vscode code cursor windsurf zed sublime jetbrains intellij webstorm xcode open in editor line column custom command argv
---

# External editor

A Git client is where you read code; it is rarely where you fix it. The gap
between noticing a problem in a diff and having the cursor on that line in your
editor is a file search and a scroll — every time.

Point Gitcito at your editor once and that gap closes: right-click a line in the
file or blame view and it opens there, at that line.

## Choosing one

**Settings → General → External editor.** The dropdown lists the editors Gitcito
can find on this machine — it looks for each editor's command first, then, on
macOS, for the application bundle in `/Applications` and `~/Applications`. The
scan runs each time you open Settings, so an editor installed five minutes ago
shows up without restarting.

Recognised out of the box:

| Editor | Command it looks for |
|--------|----------------------|
| Visual Studio Code | `code`, `code-insiders` |
| Cursor | `cursor` |
| Windsurf | `windsurf` |
| Zed | `zed` |
| Sublime Text | `subl` |
| JetBrains IDEs | `idea`, `webstorm`, `pycharm`, `rustrover`, `goland`, `clion`, `rider`, `phpstorm` |
| Xcode | `xed` |

## The limit worth knowing

**Jumping to a line needs the editor's command, not its icon.** A macOS `.app`
bundle is launched through `open`, which accepts a path and nothing else — so an
editor found only as a bundle opens the file at the top, and Gitcito says so
under the dropdown rather than pretending otherwise.

The fix is on the editor's side: VS Code's *Shell Command: Install 'code' command
in PATH*, Sublime's `subl` symlink, JetBrains' *Toolbox → Settings → Shell
scripts*. Once the command exists, pick the editor again and the line jump works.

## Where the actions appear

| Surface | What it opens |
|---------|---------------|
| Repo tab, sidebar repo, status bar | The repository folder |
| File tree, commit files, stash files, the commit composer | That file |
| The row-end icon in the file tree | That file, in one click |
| Right-click a line in the **file** view | The file, at that line |
| Right-click a line in the **blame** view | The file, at that line |

Line actions only appear where the line number still means something: a file
shown at an old commit, or a blame rewound to an earlier revision, has lines that
no longer match what is on disk, so Gitcito offers no jump there rather than
sending you to the wrong place.

## A command of your own

Pick **Custom command** for anything not in the table — a wrapper script, a
remote-development launcher, a terminal editor started through your own shim.

| Field | Meaning |
|-------|---------|
| Command | The executable to run. No shell, so no `&&`, pipes or globs. |
| Name | What the menu entries call it. |
| Arguments for a file | argv template, e.g. `-g {path}:{line}:{col}` |
| Arguments for a folder | argv template, usually just `{path}` |

Templates are split on spaces and each token is substituted once — a path with a
space stays one argument, and nothing is re-parsed afterwards, so a filename can
never turn into syntax. Four placeholders: `{path}`, `{line}`, `{col}`, `{repo}`.

A placeholder with no value takes its flag with it: `--line {line} {path}` run
without a line becomes just the path, never a dangling `--line` that would eat
the filename as its argument. A template with no `{line}` in it simply means
Gitcito will not offer line-precise actions for that editor.

## What this is not

This is not the ["Open with" app](repo-settings.md) setting, which shows the
system picker and remembers one app for opening *anything* — an image, a PDF, a
folder in Finder. The editor is the more specific of the two, so where both are
set the editor wins on the file tree's row-end icon; both stay listed in the
right-click menu.

Gitcito never launches your editor by itself, and closing Gitcito never closes
it: the editor is started detached, as a process of its own.
