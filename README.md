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
> - **Azure DevOps**, **Bitbucket** and **GitLab** integrations — tokens are
>   stored and the plumbing exists, but only **GitHub** is properly battle-tested.
> - Any **AI provider that isn't OpenAI** — the call shape is OpenAI-compatible,
>   so others _should_ work, but they're unverified.
>
> If it breaks: well, **it works on my machine**. PRs welcome. 💜

---

## ✨ Features

### Repository & history
- **Commit graph** — branches, merges and octopus merges drawn properly, in light or dark.
- **Branches, remotes, tags, stashes & worktrees** — all in one collapsible sidebar.
- **Commit details** — changed-files tree/flat view, author, SHA, copy & open externally.
- **Pull requests** — list and inspect open PRs straight from the sidebar.
- **Search** commits, authors and SHAs.
- **Auto-fetch** in the background on a configurable interval.

### Working with changes
- **Commit composer** with multiple message styles — Auto, Ticket, Conventional, Gitmoji or Plain.
- **AI commit messages** — generate summary (and optional body) from your staged diff.
- **Diff viewer** with syntax highlighting.
- **Image diff** — side-by-side / swipe comparison for changed images.
- **Conflict resolver** — ours / theirs / per-line picking, with an editable output pane.
- **Force-push confirmation** and optional always-merge-commit behaviour.

### Preview anything
- **File preview pane** — Markdown rendering, Word docs (`.docx`), syntax-highlighted code and more.
- **Integrated terminal** — real PTY powered by xterm + node-pty, multiple tabs.

### AI assist _(OpenAI-compatible)_
- Generate commit messages.
- **Explain this file** — plain-language explanation in a side panel.
- **AI conflict resolution** — proposes a merge into the editable output; never auto-applies.
- Custom instructions, model fetching and an OpenAI-compatible endpoint override.

### Make it yours
- **Themes** — light, dark, follow-OS, plus custom themes you can build.
- **Profiles** — separate Git identities and integration tokens per profile.
- **i18n** — English and Spanish out of the box.

## 🖼️ Screenshots

### Commit graph — light & dark
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
npm install          # installs deps + rebuilds node-pty
npm run dev          # launch in dev mode
npm run build        # build
npm run dist:mac     # package a macOS app
npm run typecheck    # type-check both configs
```

> Built with Electron + React + TypeScript. Stack: framer-motion, lucide-react,
> xterm, highlight.js, marked, mammoth, dompurify.

## 📄 License

MIT.

---

<div align="center">

Made by **MyAppDesk** with 💜

_[myappdesk.dev](https://myappdesk.dev)_

</div>
