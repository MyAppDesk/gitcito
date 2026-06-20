<div align="center">

<img src="docs/gitcito-mark.png" alt="Gitcito" width="140" />

# Gitcito

**A fully vibe-coded Git client. Free.**

### _“Works on my machine.”_


</div>

---

> [!WARNING]
> **Honest disclaimer.** Gitcito is young and some things genuinely haven't been
> tested yet. As of now, treat these as _aspirational_:
> - **Azure DevOps**, **Bitbucket** and **GitLab** integrations. Tokens are
>   stored and the plumbing exists, but only **GitHub** is properly battle-tested.
> - Any **AI provider that isn't OpenAI**. The call shape is OpenAI-compatible,
>   so others _should_ work, but they're unverified.
>
> **GitHub-only features.** Some things talk directly to the GitHub API and do
> nothing (or are hidden) on other hosts — even if a token is stored:
> - **Inline CI status** (GitHub Actions check-runs on the commit row).
> - **Pull request review, comment & merge** (PR _detail_, approve / request
>   changes, and merge / squash / rebase). PR _creation_ also works on Azure DevOps.
> - **Issues** browsing & the issue tab, **milestones**, and **Projects v2 fields**
>   (Priority / Start / Target / Effort).
> - **Releases** browsing in the sidebar / changelog page.
> - **Notifications inbox** (your GitHub notifications across all repos).
> - **GitHub profile links** from commit authors, and the in-app **"What's new"**
>   changelog (pulled from Gitcito's own GitHub releases).
>
> If it breaks: well, **it works on my machine**. PRs welcome. 💜

---

## ✨ Features

### Repository & history
- **Command palette** (`⌘K` / `Ctrl+K`). Fuzzy-jump to any branch (checkout), commit (scroll-to in the graph), working-tree file, or action (fetch, pull, push, stash, terminal, reflog, settings…) without leaving the keyboard.
- **Repo groups & tabs**. Bundle related repositories into a named, colour-coded group, switch between them in tabs (drag to reorder, eject or regroup), and jump back via recents.
- **Commit graph** with branches, merges and octopus merges drawn properly — in light or dark.
- **Customisable graph columns**: show/hide, resize and reorder branch, message, author, date, SHA and deployment columns.
- **Inline CI status** _(GitHub only)_. GitHub Actions check-runs (pass/fail/pending) shown right on the commit row.
- **Branches, remotes, tags, stashes, worktrees & submodules**, all in one reorderable, searchable sidebar.
- **Commit details**: changed-files tree/flat view, author, SHA, co-authors, copy & open externally.
- **Per-file blame & history**, with a follow-the-line jump from blame straight into the diff.
- **Search & filter** commits by message, author, SHA or deployment status.
- **Code search** (`⌘⇧F` / `Ctrl+Shift+F`). Search file **contents** across the working tree (`git grep`, tracked + untracked, with case / whole-word / regex) — results are **syntax-highlighted** with the match marked — or run a **history pickaxe** (`git log -S` / `-G`) to find the commits that introduced or removed a string. Click a hit to jump to the file or commit.
- **Progressive history** with configurable page size, auto-load-on-scroll and optional Gravatar avatars.
- **Insights** — a repo dashboard from your git history: summary cards (commits/day, contributors, files touched, lines changed), a **weekly churn** chart (additions vs deletions), **top contributors** (commits + lines), and **file hotspots** (most-changed files, click straight into a file's history). Filter by 30d / 90d / 1y / all.

### Working with changes
- **Commit composer** with message styles: Auto, Conventional, Gitmoji, Ticket, Plain — even Caveman or Haiku. A live **message linter** flags subject length (with a char counter), trailing periods, non-imperative/lowercase subjects and over-wide body lines — hints, never a hard gate.
- **Stage / unstage / discard**, down to **individual hunks — or individual lines** picked right in the diff.
- **Amend**, persistent drafts, and auto-prefilled messages during merge / cherry-pick / revert.
- **Commit templates** (`commit.template` / `.gitmessage`) prefill the composer; comment lines are stripped.
- **Changelog generator** — turn Conventional-Commit messages between two refs (defaults to the latest tag → HEAD) into a grouped changelog (Features / Fixes / Performance…, with breaking changes surfaced first). Copy it, or prepend it straight to `CHANGELOG.md`.
- **Diff viewer** with syntax highlighting and one-click hunk staging, plus a **word-level diff** toggle that highlights just the changed tokens within edited lines (red on the old, green on the new).
- **Image diff** with side-by-side / swipe comparison for changed images.
- **Conflict resolver** with ours / theirs / per-line picking and an editable output pane.
- **Smart .gitignore** — ignore a file, `*.ext`, or a folder, written to the closest folder's `.gitignore` or the repo root, with a live preview.

### Branching, merging & history surgery
- **Stacked branches** — build a chain of dependent branches (Graphite-style), see the stack visualised bottom→top with per-level commit counts, and **restack** to cascade-rebase the whole chain (`rebase --onto`, so parent rewrites don't duplicate commits) when a lower branch changes. Open a PR for each level against its parent. Parent links live in git config, so they travel with the repo.
- **Interactive rebase** — drag to reorder, squash, fixup, reword or drop, in a visual editor.
- **Cherry-pick, revert, and reset** (soft / mixed / hard) from the graph.
- **Branch comparison**: ahead/behind counts, full diff, and a one-click "open a PR" hand-off.
- **Merge** with fast-forward or forced merge-commit; **rebase onto** any ref.
- **Drag a branch onto another** in the sidebar to merge it in or rebase it on top — a quick gesture for the two most common branch ops.
- Create / checkout / rename / delete local & remote branches, with per-remote presence badges.
- **Repository ▸ branch switcher** in the toolbar (GitKraken-style), plus a branch switch right in the status bar.

### Recovery, safety & forensics
- **Reflog viewer** — every move of `HEAD` (and branches), with checkout / new-branch / hard-reset from any past entry. The "undo my mistake" net.
- **WIP snapshots** — a safety net for uncommitted work: capture your tracked changes + staged index as a `git stash create` commit pinned under `refs/gitcito/wip` (never touches your working tree or stash list). Take one manually or let it run automatically every 5 / 15 / 30 min, then restore or delete any snapshot.
- **Guided bisect** — mark commits good/bad, watch the range narrow, land on the first bad commit.
- **Commit signing** (GPG / SSH / X.509) with a per-repo toggle and a **verified / unverified / expired** badge in a dedicated, reorderable signature column.

### Sync, stashes, tags & worktrees
- **Pull** (default, fast-forward-only or rebase) and **push** with safe `--force-with-lease` + optional confirmation.
- **Fetch all & prune**, plus background **auto-fetch** on a configurable interval and a "fetched X ago" badge.
- **Multi-repo batch** — **Fetch all** / **Pull all** every repository in a group at once (from the group home or the group tab's right-click menu), with a single summary of what succeeded.
- **Stashes** with untracked files, messages, per-file apply, and a details/diff view.
- **Tags**: create/delete locally, push or delete on the remote, browse remote tags.
- **Worktrees**: create, remove and open a linked worktree in its own window.
- **Submodules**: add, update (init & checkout), sync URLs, and remove, with live in-sync / modified / uninitialized status.
- **Git LFS** — detect git-lfs, manage tracked patterns, see downloaded vs pointer files, pull & prune.
- **Sparse-checkout** (cone mode) to limit the working tree to the folders you pick, plus a **partial clone** (`--filter=blob:none`) option.
- **Patches** — export a commit as a `.patch`, and apply one to the working tree (`git apply`) or as a commit (`git am`).
- **Git hooks manager** — list, enable/disable, edit and create hooks; detects a custom `core.hooksPath` and pre-commit framework.

### Hosting & pull requests
- **Create pull requests** from the app — branch dropdowns, prefilled title/body from the branch's commits, draft toggle; from branch-compare, the graph, the PR panel `+`, or an issue (auto-`Closes #N`).
- **Review PRs** _(GitHub only)_ — open conversation + review state, comment, approve / request changes, and **merge** (merge / squash / rebase).
- **Issues** _(GitHub only)_ — browse open issues, then a full **issue tab**: body, comments, labels, assignees, milestone, Projects v2 fields (Priority/Start/Target/Effort), close/reopen, and **create a branch for an issue** (with AI naming).
- **Milestones** _(GitHub only)_ — a sidebar list with progress, and a **milestone tab** showing its issues.
- **Releases** _(GitHub only)_ — browse a repo's releases in the sidebar and a changelog page.
- **Notifications inbox** _(GitHub only)_ — your whole GitHub inbox (review requests, mentions, CI activity…) across every repo, with unread / all filters, mark-one / mark-all read, and one click to open. Reachable from the toolbar bell, the command palette, or `⌘K`.
- **Clone or create repositories** on your hosting accounts without leaving the app.
- **Per-profile tokens** for multiple accounts / orgs.
- _GitHub is the battle-tested path (PR create/review/merge, issues, milestones, project fields); GitLab, Bitbucket & Azure plumbing exists but is unverified — see the disclaimer above._

### AI assist
- **Commit messages** — summary (and optional body) generated from your staged diff, in your chosen style.
- **Explain this file** in plain language (Normal, Concise, ELI5, … even Pirate) in a side panel.
- **AI conflict resolution** proposes a merge into the editable output; never auto-applies.
- **AI PR review** summarises a diff and flags risks; **AI branch naming** from a description.
- **Project-config wizard** scaffolds `.gitignore`, CI workflows, agent rules and more.
- **Generate themes** from a prompt, and **smart-stage** suggestions for what to commit.
- Presets for **OpenAI, Anthropic, OpenRouter, Groq, Mistral and Ollama** (local), or any OpenAI-compatible endpoint; live model fetching and custom instructions.

### Preview anything
- **File preview pane**: Markdown, Word (`.docx`), Excel (`.xlsx`), PDF, video, audio, images and syntax-highlighted code.
- **Integrated terminal**, a real PTY powered by xterm + node-pty, with multiple tabs per repo.

### Make it yours
- **9 built-in themes** (Gitcito, Nord, Dracula, Solarized, GitHub, Monokai, Midnight, Contrast, Daltonic), each with light & dark — plus custom and **AI-generated** themes, and adjustable code font size.
- **Light, dark or follow-OS**, switchable live.
- **Profiles** with separate Git identities and integration tokens.
- **Undo / redo**, a first-run onboarding wizard, and **i18n** (English & Spanish) out of the box.

## 🖼️ Screenshots

### In motion
| Browse commits |  Light → Dark |
|---|---|
| ![Walking through commit details](docs/screenshots/clip-commit-details.gif) | ![Switching from Gitcito light to the Nord dark theme](docs/screenshots/clip-themes.gif) |

### Repo groups
Bundle related repositories into a group, then open, clone or create. Recents always one click away.

![Repo group with multiple repositories and recents](docs/screenshots/repo-groups.png)

### Commit graph (light & dark)
| | |
|---|---|
| ![Commit graph, light theme](docs/screenshots/graph-light.png) | ![Commit graph, dark theme](docs/screenshots/graph-dark.png) |

### Signed commits
Verified / unverified / unsigned badges in a dedicated, reorderable signature column.

| | |
|---|---|
| ![Signature column, light theme](docs/screenshots/signed-commits-light.png) | ![Signature column, dark theme](docs/screenshots/signed-commits-dark.png) |

### Recovery & forensics
| Reflog | Bisect |
|---|---|
| ![Reflog recovery](docs/screenshots/reflog.png) | ![Guided bisect](docs/screenshots/bisect.png) |

### Plumbing power tools
| Git hooks | Git LFS |
|---|---|
| ![Git hooks manager](docs/screenshots/hooks.png) | ![Git LFS manager](docs/screenshots/lfs.png) |

| Sparse-checkout | Smart .gitignore |
|---|---|
| ![Cone-mode sparse-checkout](docs/screenshots/sparse-checkout.png) | ![.gitignore chooser](docs/screenshots/gitignore-chooser.png) |

### Files browser & integrated terminal
Browse the working tree in the **Files** tab with a live preview, and drop into a real PTY (xterm + node-pty) docked under the repo — multiple tabs per repo.

| Files tab + preview | Integrated terminal |
|---|---|
| ![Working-tree file browser with code preview](docs/screenshots/file-tree.png) | ![Integrated terminal under the commit graph](docs/screenshots/terminal.png) |

### Interactive rebase
Drag to reorder, squash, fixup, reword or drop — in a visual editor.

![Interactive rebase editor](docs/screenshots/interactive-rebase.png)

### Pull requests & commit templates
| Create a pull request | Commit template |
|---|---|
| ![Create pull request form](docs/screenshots/create-pr.png) | ![Composer prefilled from .gitmessage](docs/screenshots/commit-template.png) |

### Conflict resolver
![Conflict resolver with ours / theirs / output panes](docs/screenshots/conflict-resolver.png)

### Diffs & previews
| Image diff | Markdown preview |
|---|---|
| ![Side-by-side image diff](docs/screenshots/image-diff.png) | ![Markdown preview pane](docs/screenshots/markdown-preview.png) |

### Settings
| AI | Themes |
|---|---|
| ![AI settings page](docs/screenshots/settings-ai.png) | ![Theme settings page](docs/screenshots/settings-themes.png) |

## 🚀 Development

```bash
npm install            # installs deps + rebuilds node-pty
npm run dev            # launch in dev mode
npm run build          # build
npm run dist:mac       # package a macOS app
npm run typecheck      # type-check both configs

npm run screenshots    # regenerate docs/screenshots from the playground repos
npm run screenshots:gif  # …including the animated GIF clips (needs ffmpeg)
npm run video          # render the 1080p promo (remotion/out/GitcitoVideo.mp4)
npm run video:studio   # live-preview the promo in Remotion Studio
```

**From VS Code:** the same tasks are wired into the *Run and Debug* panel
(`.vscode/launch.json`)

> Built with Electron + React + TypeScript.

## 📄 License

MIT.

---

<div align="center">

Made by **MyAppDesk** with 💜

_[myappdesk.dev](https://myappdesk.dev)_

</div>
