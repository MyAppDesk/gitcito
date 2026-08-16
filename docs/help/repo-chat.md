---
title: Repository chat
category: AI
order: 82
summary: Ask questions about this repository, with the files and commits you pin as context.
keywords: chat ask question assistant context attach pin drag drop commit file evidence grounded ai panel
---

# Repository chat

Some questions are faster to ask than to search for. *Where does the token
refresh actually happen? What did this commit change, in one sentence? Why does
this file exist?* Repository chat answers those against the repository that is
open, and shows the lines it based each answer on.

It shares the right-hand column with **Details**: the tab strip at the top
switches between them, so the graph never loses its selection when you ask
something.

![Repository chat with pinned context](../screenshots/repo-chat.webp)

## What it reads

Every answer is built in two passes. The first picks a small set of paths and
literal searches from the repository's own tracked-file list. The second answers
using only the excerpts that pass brings back, and may cite only those excerpts —
a made-up file or line is a validation error, not a plausible-looking answer.

What it can see:

| Included | Excluded |
|---|---|
| Tracked files, as they are in your working tree | Untracked files |
| Staged and unstaged diffs of tracked files | Anything matching an ignore rule, even if tracked |
| Branch, ahead/behind, and the list of changed paths | [Secret-looking files](security.md), binaries, generated paths |

Working-tree content means you can ask about edits you have not committed. It
also means those edits leave your machine when you ask — the provider you
configured in [AI features](ai.md) receives them.

## Pinning context

The model decides what to read. Pinning is how you overrule it: anything pinned
is read **first** and gets the larger share of the context budget.

Four ways to pin, all landing in the same chip row above the message box:

| Do this | Gets you |
|---|---|
| Click a suggestion chip | The file open in the viewer, or the commit selected in the graph |
| Drag a row from the **Files** tab | That file |
| Drag a row from the **commit graph** | That commit — its message, and its diff as hunks |
| **+** → *Choose a file…*, or drag from Finder/Explorer | Any file on disk, including outside the repository |

Chips stay pinned for follow-up questions, so a conversation keeps its footing;
`×` on a chip removes it, and clearing the conversation drops them all. Eight
items is the cap.

A pinned commit contributes its message and up to twelve diff hunks. Hunks that
touch an excluded path are dropped from that diff, not the whole commit.

## Settings

**Settings → AI → Repository chat**:

| Setting | Does |
|---|---|
| **Ask questions about the repository** | Off removes the tab, the toolbar button and the shortcut target. The rest of the AI features keep working |
| **Chat model** | A model for chat alone. Empty means the profile's model — questions are cheaper than reviews, so a smaller one is often enough |
| **Committed content only** | Answers from the last commit instead of the working tree: uncommitted edits and diffs never leave the machine |

With AI switched off entirely, chat disappears with it — there is no panel
offering to answer once nothing can.

The chat model is also switchable from the panel's own header, next to the
provider name — same setting, without opening Settings.

![Repository chat settings](../screenshots/settings-repo-chat.webp)

## What it refuses

- **Files that look like secrets are never read**, pinned or not — the chip is
  reported back as skipped, with the reason. Pinning is not a way around
  [secret masking](security.md).
- **Binaries and files over 512 KB** from outside the repository are skipped the
  same way. Inside the repository the usual readable-source rules apply.
- **It never writes.** No staging, no commits, no branch changes — it has no
  tools, only text. An answer that claims it did something is describing, not
  reporting.
- **Conversations live in memory only.** Switching repositories keeps each
  thread separate; quitting Gitcito discards them.

## Opening it

| Keys | Does |
|---|---|
| The speech-bubble button in the toolbar | Toggles the Chat tab |
| <kbd>⌘⌥B</kbd> / <kbd>Ctrl+Alt+B</kbd> | Toggles the whole right panel |
| <kbd>⌘⏎</kbd> / <kbd>Ctrl+Enter</kbd> | Sends the message |

See [Keyboard & shortcuts](keyboard.md) for the rest, including how to rebind
the panel toggles.

**See also:** [AI features](ai.md) · [Security & secrets](security.md) ·
[Repo wiki](repo-wiki.md)
