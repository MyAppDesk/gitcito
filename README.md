<div align="center">

<img src="docs/gitcito-mark.png" alt="Gitcito" width="120" />

# Gitcito

**A fully vibe-coded Git client. Free.**

_Which branch will conflict? What changed since they force-pushed? Which commit does this fix belong to?_

[![Release](https://img.shields.io/github/v/release/MyAppDesk/gitcito?style=flat-square&color=6366f1)](https://github.com/MyAppDesk/gitcito/releases)
[![License](https://img.shields.io/badge/license-MIT-6366f1?style=flat-square)](LICENSE)
![Platforms](https://img.shields.io/badge/macOS%20·%20Windows%20·%20Linux-6366f1?style=flat-square)
![Electron + React + TypeScript](https://img.shields.io/badge/Electron%20·%20React%20·%20TypeScript-1e2440?style=flat-square)

<img src="docs/screenshots/graph-dark.png" alt="Gitcito's commit graph" width="820" />

</div>

---

## Why another Git client

Most Git clients are a nicer way to run the commands you already know. Gitcito
tries to answer the questions **before** you run them.

| | |
|---|---|
| 🛰️ **[Conflict radar](docs/help/conflict-radar.md)** | See which branches will conflict **before** merging any of them. No checkout, no working-tree change — the merges happen inside the object database. |
| 🧠 **[Semantic diff](docs/help/semantic-diff.md)** | `startServer` → `bootServer` instead of a 400-line red/green wall. Real tree-sitter parsing, 18 languages. |
| ⏪ **[What changed since](docs/help/range-diff.md)** | They force-pushed the branch you reviewed. See which commits were rewritten, dropped or added — the old positions come free from the reflog. |
| 🧲 **[Absorb](docs/help/absorb.md)** | Stage your review fixes and let blame route each hunk into the commit that introduced it, as a `fixup!`. |
| 🕰️ **[Time machine](docs/help/time-machine.md)** | Drag a slider and watch the repo change: files appear, move, come back. HEAD never moves. |
| 🎬 **[Timelapse](docs/help/timelapse.md)** | Replay the repository's whole life as an animation — and export it as a video. |
| 🎛️ **[Mission control](docs/help/mission-control.md)** | Every repo of the workspace on one screen, ordered by what needs you. |

Everything ships with a **43-page handbook**, built into the app: the **Help**
button in the status bar, or `⌘K` → *Help*. It is the same Markdown you can read
[right here in the repository](docs/help/getting-started.md) — offline, and
versioned with the code.

> [!WARNING]
> **Honest disclaimer.** Gitcito is young. **GitHub** is the battle-tested path:
> PR review/merge, issues, milestones, notifications, inline CI and project
> fields are GitHub-only. GitLab, Bitbucket and Azure DevOps can **list and
> create** PRs/MRs, but their detail/review/merge screens are not built yet.
> AI providers other than OpenAI use an OpenAI-compatible call shape and are
> unverified. If it breaks: well, **it works on my machine**. PRs welcome. 💜

## Install

Grab the latest build for your platform from
**[gitcito's site](https://myappdesk.github.io/gitcito/)** or straight from
**[Releases](https://github.com/MyAppDesk/gitcito/releases)** — the macOS build
is signed and notarised.

Then, optionally, open repositories straight from your terminal:

```sh
gitcito .                        # open this folder
gitcito ~/code/api -n "API"      # …with a display name
gitcito . -g "Work"              # …inside a group tab
```

Install the shim from the command palette: `⌘K` → **Install 'gitcito' command in
PATH** (macOS). Gitcito is single-instance, so `gitcito` from a second terminal
hands the folder to the window you already have open.

## The tour

<div align="center">
<img src="docs/screenshots/command-palette.png" alt="Command palette" width="405" />
<img src="docs/screenshots/conflict-resolver.png" alt="Conflict resolver" width="405" />
</div>

### Repository & history

| | |
|---|---|
| **[Command palette](docs/help/search.md)** (`⌘K`) | Fuzzy-jump to any branch, commit, file or action. Remembers what you use. |
| **[Commit graph](docs/help/graph.md)** | Branches, merges and octopus merges drawn properly, windowed for huge histories, `↑`/`↓` (or `j`/`k`) to walk it, linear first-parent toggle, "new since last fetch" marks. |
| **Multi-select commits** | Cherry-pick, squash, export a combined patch or copy SHAs for a whole selection. |
| **[Code search](docs/help/search.md)** (`⌘⇧F`) | `git grep` across the working tree with syntax-highlighted hits, or a history pickaxe (`log -S`/`-G`). |
| **[Blame & history](docs/help/blame.md)** | Per-file, with follow-the-line into the diff and "reblame before this commit". |
| **[Time machine](docs/help/time-machine.md)** · **[Timelapse](docs/help/timelapse.md)** | Scrub the repo through its past; replay and export its whole life. |
| **[Insights](docs/help/insights.md)** | Commits/day, contributors, weekly churn, file hotspots. |
| **[Customisable graph](docs/help/themes.md)** | Show/hide/resize/reorder columns; lane palette, corner style, density and thickness, with a live preview. |

### Working with changes

| | |
|---|---|
| **[Commit composer](docs/help/committing.md)** | Message styles (Conventional, Gitmoji, Ticket, Plain… even Caveman), prefix helpers, co-author picker, `↑`/`↓` message recall, live linter. |
| **[Staging](docs/help/staging.md)** | Whole files, hunks, or **individual lines** picked in the diff. |
| **[Semantic diff](docs/help/semantic-diff.md)** | What changed, symbol by symbol, above every file diff. |
| **[Diff viewer](docs/help/diffs.md)** | Unified ↔ split, word-level highlighting, ignore-whitespace, in-diff find (`⌘F`), image diff with swipe. |
| **[Conflict resolver](docs/help/conflicts.md)** | Three panes, per-line / per-chunk / whole-side picking, a conflict-by-conflict navigator, editable output. |
| **[Absorb](docs/help/absorb.md)** | Staged fixes → `fixup!` commits aimed at the right parents. |
| **[Changelog generator](docs/help/changelog.md)** | Conventional commits between two refs → a grouped changelog, straight into `CHANGELOG.md`. |
| **[Secret masking & guards](docs/help/security.md)** | `.env`-ish values render as `••••••`; committing secrets, oversized blobs or straight to a protected branch asks first. |

### Branching, merging & surgery

| | |
|---|---|
| **[Conflict radar](docs/help/conflict-radar.md)** | Which branches will fight, before you merge them. |
| **[Stacked branches](docs/help/stacks.md)** | Graphite-style chains with cascade restack (`rebase --onto`) and a PR per level. |
| **[Interactive rebase](docs/help/rebase.md)** | Drag to reorder, squash, fixup, reword, edit or drop — plus one-click autosquash. |
| **[Compare any two refs](docs/help/merging.md)** | Ahead/behind counts, the combined diff, and a one-click "open a PR". |
| **[Drag a branch onto another](docs/help/merging.md)** | Merge it in, or rebase it on top. |

### Recovery & safety

| | |
|---|---|
| **[Reflog viewer](docs/help/recovery.md)** | Every move of HEAD, with checkout / new branch / reset from any past entry. |
| **[WIP snapshots](docs/help/recovery.md)** | Your uncommitted work captured under `refs/gitcito/wip` every 5/15/30 min. Never touches your stash list or working tree. |
| **[What changed since](docs/help/range-diff.md)** | Review a force-push properly. |
| **[Guided bisect](docs/help/recovery.md)** · **[Signed commits](docs/help/signing.md)** | Narrow down to the first bad commit; verified / unverified badges in their own column. |

### Sync, hosting & many repositories

| | |
|---|---|
| **[Mission control](docs/help/mission-control.md)** | Every repository of the workspace, worst first, with bulk fetch/pull. |
| **[Repo groups & workspaces](docs/help/workspaces.md)** | Group tabs with folders nested to any depth, colour-coded, fetch-all per subtree. |
| **[Pull requests](docs/help/hosting.md)** | Create on GitHub, GitLab, Bitbucket and Azure DevOps. Review, comment, approve and merge on GitHub, with a checks panel and inline threads. |
| **[Preview a pull request](docs/help/pr-preview.md)** | Run someone else's PR — forks included — without committing anything. Any host, no API token: the PR head is fetched from the ref the forge publishes. |
| **[Issues, milestones, releases, notifications](docs/help/hosting.md)** | GitHub, in-app, with an unread badge in the toolbar. |
| **[Stashes](docs/help/stashes.md), [tags](docs/help/tags.md), [worktrees](docs/help/worktrees.md), [LFS & sparse-checkout](docs/help/lfs-sparse.md), patches, [hooks](docs/help/hooks.md)** | The whole plumbing drawer, with a UI. |

### AI (optional, and grounded)

| | |
|---|---|
| **[Commit messages · PR descriptions · branch names](docs/help/ai.md)** | Generated from the actual diff, in your chosen style. |
| **[Hover to explain](docs/help/ai.md)** | Point at an identifier in a file, diff or blame view for a one-line explanation, drawn only from lines it can see. |
| **[AI PR review](docs/help/ai.md)** | Findings anchored to a real `path:line` — a model that invents a location is rejected and asked again. |
| **[Repo wiki](docs/help/repo-wiki.md)** | A generated codebase guide where every statement cites the file it came from. |
| **Providers** | OpenAI, Anthropic, OpenRouter, Groq, Mistral, Ollama (local), or any OpenAI-compatible endpoint. |

### Make it yours

[9 themes](docs/help/themes.md) × light/dark (plus custom and **AI-generated**
ones) · [rebindable shortcuts](docs/help/keyboard.md) with a `?` cheatsheet ·
[profiles](docs/help/profiles.md) for separate identities and tokens · English &
Spanish · [integrated terminal](docs/help/terminal.md) (a real PTY) ·
[**Run & debug**](docs/help/launch.md) straight from your `.vscode/launch.json` ·
[file preview](docs/help/diffs.md) for Markdown, Word, Excel, PDF, video, audio
and images · [per-repository settings](docs/help/repo-settings.md) with an
operation log.

## Your secrets stay yours

Gitcito has no backend. Tokens and [vault](docs/help/vault.md) entries are
encrypted with your **OS keychain** — and before it ever touches that keychain, it tells you what for and
lets you say no; the app keeps working either way. Nothing is synced, uploaded
or phoned home. The only network calls are to your Git host and, if you turn it
on, your chosen AI provider. The details are in
[Security & secrets](docs/help/security.md).

## Development

```bash
npm install          # deps, node-pty rebuild, tree-sitter grammars
npm run dev          # launch in dev mode
npm run typecheck    # both tsconfigs
npm run lint:i18n    # no hardcoded user-facing strings

npm test             # vitest suite (real git against generated fixtures)
npm run playground   # (re)generate the example repos under examples/
npm run site:serve   # build the docs site and preview it locally
npm run dist:mac     # package a macOS app
```

Contributions welcome — start with **[CONTRIBUTING.md](CONTRIBUTING.md)** for the
working agreement: commit format, the translation rule, how tests use the
playground fixtures, and when a change has to update the handbook.

## Sponsor this project

Gitcito is free, MIT-licensed and has no backend, no telemetry and nothing to
upsell — so there is nothing to buy. If it saves you an afternoon of `git
reflog`, you can pay for the next one instead:

**[Sponsor on GitHub](https://github.com/sponsors/cgutierr-zgz)**

Sponsorship funds the Apple Developer certificate the signed macOS builds need,
the time that goes into the handbook, and the translations. Not sponsoring costs
you nothing — bug reports, issues and pull requests are worth as much.

## License

MIT.

---

<div align="center">

Made by **MyAppDesk** with 💜

_[myappdesk.dev](https://myappdesk.dev)_

</div>
