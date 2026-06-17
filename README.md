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
> If it breaks: well, **it works on my machine**. PRs welcome. 💜

---

## ✨ Features

### Repository & history
- **Repo groups & tabs**. Bundle related repositories into a named, colour-coded group, switch between them in tabs (drag to reorder, eject or regroup), and jump back via recents.
- **Commit graph** with branches, merges and octopus merges drawn properly — in light or dark.
- **Customisable graph columns**: show/hide, resize and reorder branch, message, author, date, SHA and deployment columns.
- **Inline CI status**. GitHub Actions check-runs (pass/fail/pending) shown right on the commit row.
- **Branches, remotes, tags, stashes, worktrees & submodules**, all in one reorderable, searchable sidebar.
- **Commit details**: changed-files tree/flat view, author, SHA, co-authors, copy & open externally.
- **Per-file blame & history**, with a follow-the-line jump from blame straight into the diff.
- **Search & filter** commits by message, author, SHA or deployment status.
- **Progressive history** with configurable page size, auto-load-on-scroll and optional Gravatar avatars.

### Working with changes
- **Commit composer** with message styles: Auto, Conventional, Gitmoji, Ticket, Plain — even Caveman or Haiku.
- **Stage / unstage / discard**, down to **individual hunks**, with a tree or flat file list and a drag-to-resize split.
- **Amend**, persistent drafts, and auto-prefilled messages during merge / cherry-pick / revert.
- **Diff viewer** with syntax highlighting and one-click hunk staging.
- **Image diff** with side-by-side / swipe comparison for changed images.
- **Conflict resolver** with ours / theirs / per-line picking and an editable output pane.

### Branching, merging & history surgery
- **Interactive rebase** — drag to reorder, squash, fixup, reword or drop, in a visual editor.
- **Cherry-pick, revert, and reset** (soft / mixed / hard) from the graph.
- **Branch comparison**: ahead/behind counts, full diff, and a one-click "open a PR" hand-off.
- **Merge** with fast-forward or forced merge-commit; **rebase onto** any ref.
- Create / checkout / rename / delete local & remote branches, with per-remote presence badges.

### Sync, stashes, tags & worktrees
- **Pull** (default, fast-forward-only or rebase) and **push** with safe `--force-with-lease` + optional confirmation.
- **Fetch all & prune**, plus background **auto-fetch** on a configurable interval and a "fetched X ago" badge.
- **Stashes** with untracked files, messages, per-file apply, and a details/diff view.
- **Tags**: create/delete locally, push or delete on the remote, browse remote tags.
- **Worktrees**: create, remove and open a linked worktree in its own window.
- **Submodules**: add, update (init & checkout), sync URLs, and remove, with live in-sync / modified / uninitialized status.

### Hosting & pull requests
- **Pull requests** — list and inspect open PRs straight from the sidebar.
- **Clone or create repositories** on your hosting accounts without leaving the app.
- **Per-profile tokens** for multiple accounts / orgs.
- _GitHub is the battle-tested path; GitLab, Bitbucket & Azure plumbing exists but is unverified — see the disclaimer above._

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
