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
> - **Azure DevOps**, **Bitbucket** and **GitLab** integrations. **Listing and
>   creating** PRs/MRs now works on all four hosts; PR _detail / review / merge_
>   are still GitHub-only. Tokens are stored and the plumbing exists, but only
>   **GitHub** is properly battle-tested.
> - Any **AI provider that isn't OpenAI**. The call shape is OpenAI-compatible,
>   so others _should_ work, but they're unverified.
>
> **GitHub-only features.** Some things talk directly to the GitHub API and do
> nothing (or are hidden) on other hosts — even if a token is stored:
> - **Inline CI status** (GitHub Actions check-runs on the commit row).
> - **Pull request review, comment & merge** (PR _detail_, approve / request
>   changes, and merge / squash / rebase). PR/MR _creation & listing_ also work on GitLab, Bitbucket and Azure DevOps.
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
- **Command palette** (`⌘K` / `Ctrl+K`). Fuzzy-jump to any branch (checkout), commit (scroll-to in the graph), working-tree file, or action (fetch, pull, push, stash, terminal, reflog, settings…) without leaving the keyboard — and it **remembers what you use**, surfacing recents first and ranking frequent commands higher.
- **Repo groups & tabs**. Bundle related repositories into a named, colour-coded group, switch between them in tabs (drag to reorder, eject or regroup), and jump back via recents. Inside a group, sort repos into **folders nested to any depth** (right-click the group → "New folder…", then drag repos onto a folder chip or use "Move to folder") — each folder gets its own colour, collapses to a counted chip, aggregates the status dots of everything under it and can **Fetch all / Pull all** its whole subtree. Folders only organise: deleting one lifts its repos and subfolders to the parent, and never closes a repository.
- **Commit graph** with branches, merges and octopus merges drawn properly — in light or dark. Windowed rendering keeps it smooth on huge histories, **↑/↓ or `j`/`k`** walk the selection between commits, a **linear (first-parent) view** toggle hides merged-in side branches, and commits that arrived in your **last fetch/pull are flagged "new"**.
- **Multi-select commits** — `⌘`/`Ctrl`-click to toggle, `⇧`-click for a range, then right-click to **cherry-pick** the lot onto the current branch, **squash** a contiguous run into one, **export a combined patch**, or copy their SHAs.
- **Customisable graph columns**: show/hide, resize and reorder branch, message, author, date, SHA and deployment columns.
- **Customisable graph style** (Settings → Themes → **Graph**): pick a **lane palette** (8 built-ins + custom + **AI-generated**), **line corners** (rounded / sharp / curved / straight), **row density** and **line thickness** — all with a live mini-graph preview.
- **Inline CI status** _(GitHub only)_. GitHub Actions check-runs (pass/fail/pending) shown right on the commit row.
- **Branches, remotes, tags, stashes, worktrees & submodules**, all in one reorderable, searchable sidebar.
- **Pinned branches** — star the branches you jump to most (hover ★ on a branch row, or right-click → "Pin branch") and they surface in a **Pinned** group at the top of the Local section, remembered per repo.
- **Commit details**: changed-files tree/flat view, author, SHA, co-authors, copy & open externally. `#123` issue/PR refs and `@mentions` (in commit subjects, PR & issue bodies/comments) are **autolinked** to the host.
- **Per-file blame & history**, with a follow-the-line jump from blame straight into the diff — and a right-click **"reblame before this commit"** to walk a line's history backwards.
- **Search & filter** commits by message, author, SHA or deployment status — or **filter by path** (right-click a file/folder → "Filter graph by this path", or ⌘K) to spotlight only the commits that touched it.
- **Code search** (`⌘⇧F` / `Ctrl+Shift+F`). Search file **contents** across the working tree (`git grep`, tracked + untracked, with case / whole-word / regex) — results are **syntax-highlighted** with the match marked — or run a **history pickaxe** (`git log -S` / `-G`) to find the commits that introduced or removed a string. Click a hit to jump to the file or commit.
- **Time machine** — drag a slider across the history and watch the repository itself change: the file tree re-renders per commit (folders appear, files move, deletions come back), and the file you are reading shows its content at that commit, with the files that commit touched highlighted. `←`/`→` step one commit, `⇧` jumps ten, `Home`/`End` snap to the ends. Everything is read from the object database — **no checkout, HEAD never moves, your uncommitted work is untouched** — so you can scrub through a year of history mid-change. "Open this version" hands the file to the normal file view at that commit. From the tools menu or `⌘K`.
- **Progressive history** with configurable page size, auto-load-on-scroll and optional Gravatar avatars.
- **Insights** _(in the repo-settings dialog)_ — a repo dashboard from your git history: summary cards (commits/day, contributors, files touched, lines changed), a **weekly churn** chart (additions vs deletions), **top contributors** (commits + lines), and **file hotspots** (most-changed files, click straight into a file's history). Filter by 30d / 90d / 1y / all.

### Working with changes
- **Commit composer** with message styles: Auto, Conventional, Gitmoji, Ticket, Plain — even Caveman or Haiku. The composer adapts a **prefix helper** to your chosen style — a Conventional-Commit **type dropdown** (`feat:`, `fix(scope)!:`…), a **gitmoji picker**, or a **ticket-key field** (`ABC-123:`, seeded from the branch). **↑/↓ recalls recent commit messages**, a **co-author picker** adds `Co-authored-by:` trailers from the repo's contributors, and a live **message linter** flags subject length (with a char counter), trailing periods, non-imperative/lowercase subjects and over-wide body lines — hints, never a hard gate.
- **Stage / unstage / discard**, down to **individual hunks — or individual lines** picked right in the diff.
- **Amend**, persistent drafts, and auto-prefilled messages during merge / cherry-pick / revert.
- **Commit templates** (`commit.template` / `.gitmessage`) prefill the composer; comment lines are stripped.
- **Changelog generator** — turn Conventional-Commit messages between two refs (defaults to the latest tag → HEAD) into a grouped changelog (Features / Fixes / Performance…, with breaking changes surfaced first). Copy it, or prepend it straight to `CHANGELOG.md`.
- **Diff viewer** with syntax highlighting and one-click hunk staging, a **unified ↔ split (side-by-side)** toggle, an **ignore-whitespace** toggle, a **word-level diff** toggle that highlights just the changed tokens within edited lines (red on the old, green on the new), and an in-diff **find** (`⌘F`) that highlights and steps through matches.
- **Semantic diff** — a **"What changed"** strip above every file diff that says what actually happened instead of which lines moved: **`startServer` → `bootServer`** (rename), **`open(path)` → `(path, mode)`** (signature), moved, added, removed, or body-changed, per symbol. Both sides of the file are parsed with **tree-sitter** (real ASTs, not regex) in **18 languages** — TypeScript/TSX, JavaScript, Python, Go, Rust, Java, C, C++, C#, Ruby, PHP, Swift, Kotlin, Scala, Lua, Bash, Zig — so a pure rename reads as one line instead of a red/green wall, and a rename that *also* rewrote the body says so. Click a row to jump to that symbol in the diff. Works on commits, stashes and your uncommitted work; a file whose language has no grammar just keeps its normal line diff.
- **Image diff** with side-by-side / swipe comparison for changed images.
- **Conflict resolver** with a "merging X into Y" banner, per-side commit labels, per-line / per-chunk / whole-side picking (both sides at once if you want), a conflict-by-conflict navigator, three resizable panes and an editable output with line numbers.
- **Smart .gitignore** — ignore a file, `*.ext`, or a folder, written to the closest folder's `.gitignore` or the repo root, with a live preview.
- **Secret masking** — values in `.env*`, `*.pem`, `*.key`, `id_rsa`, `credentials.*` and friends render as `KEY=••••••` in the diff, file and blame views, so a screenshot or screen-share never leaks them. On by default; an eye-toggle reveals them per view, and it's display-only (never touches the file or what you stage).
- **Secret, large-file & protected-branch guard** — committing a secret-looking file, an oversized blob, **or directly to a protected branch** (default `main`/`master`) pops one confirm (with sizes) and a one-click **Ignore & untrack**; pushing a repo that *tracks* secrets warns first (once per session), and **force-pushing a protected branch** asks for confirmation. `.env.example` / `.sample` / `.template` are safe templates; the size threshold lives in Settings → Security, and the **per-repo protected-branch list** in the repo-settings gear (next to the toolbar tools) — a branch multi-select stored in git config.
- **Keychain consent, in plain words** — Gitcito never touches your OS keychain silently. Before the system's own "an app wants to use your confidential information" dialog can appear, Gitcito shows its own: what is encrypted (only the tokens and Vault entries *you* typed), what it cannot do (an app can only read back the entry it created — your other passwords are unreachable), and that nothing leaves the machine. Say **"Not now"** and the app keeps working: tokens live in memory for the session and are never written to disk in the clear, the Vault stays closed, and you can switch it on later in **Settings → Security → OS keychain**. A fresh install makes zero keychain calls until the first token or Vault entry actually needs storing.
- **Encrypted credentials** — your GitHub/GitLab/Bitbucket/Azure tokens and AI API key are stored with the **OS keychain** (Electron `safeStorage`), not in the settings JSON. Upgrading migrates any existing plaintext keys automatically on first launch — nothing to re-enter, and the old values are removed from the file. On a machine with no keyring available, settings keep working as before rather than dropping your credentials. Exports still include them only when you tick "include secrets".
- **Vault** — a **secure, fully local** secret store: encrypted at rest with your **OS keychain** (Electron `safeStorage`), with **global** and **per-repo** scopes. It’s **not a file** and has nothing to do with your `.env` — entries are *associated* with a repo but **never written into it, committed or pushed**. Switch between any known repo, reveal / copy a value, or “Copy as .env” a whole set. Reachable from the tools menu, Settings, the command palette or `⌘⇧V`. **Nothing ever leaves your machine — no sync, no cloud.**

### Branching, merging & history surgery
- **Stacked branches** — build a chain of dependent branches (Graphite-style), see the stack visualised bottom→top with per-level commit counts, and **restack** to cascade-rebase the whole chain (`rebase --onto`, so parent rewrites don't duplicate commits) when a lower branch changes. Open a PR for each level against its parent. Parent links live in git config, so they travel with the repo.
- **Absorb** — you fixed three review comments across three files; instead of one lumpy "review fixes" commit, stage them and hit **Absorb**. Blame tells Gitcito which of *your unpushed* commits introduced each line you touched, and every staged hunk becomes a `fixup!` for the right one — with a plan you see first: target commit, its hunks, and whatever belongs to nothing yet (a brand-new file) left staged for you. One more click folds them in with an autosquash rebase. Anything already pushed is never a candidate, the working tree is never touched, and a failure puts HEAD and the index back exactly as they were.
- **Interactive rebase** — drag to reorder, squash, fixup, reword, edit (stop to amend) or drop, in a visual editor. Plus one-click **autosquash**: "fixup staged changes into this commit" creates a `fixup!`, and "autosquash from here" folds all `fixup!`/`squash!` commits into their targets.
- **Cherry-pick, revert, and reset** (soft / mixed / hard) from the graph.
- **Compare any two refs**: pick a base and a compare ref (branch, tag or raw SHA — with a swap button), see ahead/behind counts, the full combined diff, and a one-click "open a PR" hand-off. From the sidebar (compare a branch with the current one), the Tools menu or `⌘K`.
- **What changed since (range-diff)** — someone force-pushed the branch you reviewed, and a normal diff is useless because every commit after a rebase looks new. Gitcito runs `git range-diff` between the two versions and pairs them up commit by commit: **rewritten** (with the interdiff — the commit message tweak and the extra check, not the whole file), **new**, **dropped**, **unchanged**. The old positions come free from the **reflog**, so nothing has to be recorded in advance: pick one of the "previous positions" chips (forced-update, rebase, reset) and compare. And you don't have to notice on your own — a fetch that finds rewritten history says so in a toast and marks the branch row with a ⟳ you can click to open the comparison at exactly the commit it used to point at. Right-click any branch → "What changed since…", or `⌘K`.
- **Conflict radar** — before you merge anything, see which branches *will* fight. Gitcito merges every local (or remote) branch into a base of your choice entirely inside the object database (`git merge-tree --write-tree`): no checkout, no index, no working-tree change, nothing to clean up. Branches sort worst-first with the exact conflicting paths, a **Contested files** ranking shows which files several branches are all rewriting, and branches already contained in the base are marked as such instead of pretending to be clean. After a scan, sidebar branch rows wear a red / green / amber risk dot. From the tools menu, `⌘K` → "Conflict radar…", or right-click a branch to scan everything against *it*.
- **Merge** with fast-forward or forced merge-commit; **rebase onto** any ref.
- **Drag a branch onto another** in the sidebar to merge it in or rebase it on top — a quick gesture for the two most common branch ops.
- Create / checkout / rename / delete local & remote branches, with per-remote presence badges.
- **Repository ▸ branch switcher** in the toolbar, plus a branch switch right in the status bar.

### Recovery, safety & forensics
- **Reflog viewer** — every move of `HEAD` (and branches), with checkout / new-branch / hard-reset from any past entry. The "undo my mistake" net.
- **WIP snapshots** — a safety net for uncommitted work: capture your tracked changes + staged index as a `git stash create` commit pinned under `refs/gitcito/wip` (never touches your working tree or stash list). Take one manually or let it run automatically every 5 / 15 / 30 min, then restore or delete any snapshot.
- **Guided bisect** — mark commits good/bad, watch the range narrow, land on the first bad commit.
- **Commit signing** (GPG / SSH / X.509) with a per-repo toggle and a **verified / unverified / expired** badge in a dedicated, reorderable signature column.

### Sync, stashes, tags & worktrees
- **Pull** (default, fast-forward-only or rebase) and **push** with safe `--force-with-lease` + optional confirmation.
- **Fetch all & prune**, plus background **auto-fetch** on a configurable interval and a "fetched X ago" badge.
- **Multi-repo batch** — **Fetch all** / **Pull all** every repository in a group at once (from the group home or the group tab's right-click menu), with a single summary of what succeeded.
- **Stashes** with untracked files, messages, per-file apply, and a details/diff view — plus **partial stash** (tick just the files you want, optionally `--keep-index`) and **stash → branch** (`git stash branch`) when a stash won't apply cleanly.
- **Tags**: create lightweight, **annotated (with a message) or GPG/SSH-signed** tags, delete locally, push or delete on the remote, browse remote tags.
- **Worktrees**: create, remove and open a linked worktree in its own window — or right-click any local branch → **Open in a worktree** to spin one up in a sibling folder and open it as a tab.
- **Submodules**: add, update (init & checkout), sync URLs, and remove, with live in-sync / modified / uninitialized status.
- **Git LFS** — detect git-lfs, manage tracked patterns, see downloaded vs pointer files, pull & prune.
- **Sparse-checkout** (cone mode) to limit the working tree to the folders you pick, plus a **partial clone** (`--filter=blob:none`) option.
- **Patches** — export a commit as a `.patch`, and apply one to the working tree (`git apply`) or as a commit (`git am`).
- **Git hooks manager** — list, enable/disable, edit and create hooks; detects a custom `core.hooksPath` and pre-commit framework.

### Hosting & pull requests
- **Create pull / merge requests** from the app — branch dropdowns, prefilled title/body from the branch's commits, draft toggle, and (GitHub) **reviewers / labels / assignees** applied on create; from branch-compare, the graph, the PR panel `+`, or an issue (auto-`Closes #N`). Works on **GitHub, GitLab, Bitbucket and Azure DevOps**, and open PRs/MRs are listed in the sidebar for all four.
- **Create issues** _(GitHub)_ from the app (title + Markdown body) via the command palette.
- **Review PRs** _(GitHub only)_ — open conversation + review state, a **checks** panel (CI check-runs with pass/fail/pending + view-logs links), a **file-by-file viewed checklist** (per-file ✓ with progress), **inline review threads** (line comments grouped by file:line with diff-hunk context, with reply), comment, approve / request changes, and **merge** (merge / squash / rebase).
- **Issues** _(GitHub only)_ — browse open issues, then a full **issue tab**: body, comments, labels, assignees, milestone, Projects v2 fields (Priority/Start/Target/Effort), close/reopen, and **create a branch for an issue** (with AI naming).
- **Milestones** _(GitHub only)_ — a sidebar list with progress, and a **milestone tab** showing its issues.
- **Releases** _(GitHub only)_ — browse a repo's releases in the sidebar and a changelog page.
- **Notifications inbox** _(GitHub only)_ — your whole GitHub inbox (review requests, mentions, CI activity…) across every repo, with unread / all filters, mark-one / mark-all read, and one click to open. The toolbar **bell shows an unread badge** (polled in the background); also reachable from the command palette or `⌘K`. Optional **desktop notifications** raise an OS alert when a review is requested or CI runs (Settings → General).
- **Clone or create repositories** on your hosting accounts without leaving the app.
- **Per-profile tokens** for multiple accounts / orgs.
- _GitHub is the battle-tested path (PR create/review/merge, issues, milestones, project fields). GitLab, Bitbucket & Azure support PR/MR listing + creation; their detail/review/merge are not implemented yet — see the disclaimer above._

### AI assist
- **Commit messages** — summary (and optional body) generated from your staged diff, in your chosen style.
- **Explain this file** in plain language (Normal, Concise, ELI5, … even Pirate) in a side panel.
- **Hover to explain** — hold **Shift** (or Alt/Ctrl/Cmd, or no key at all — your pick in Settings → AI) and point at any identifier in the **file, diff or blame** view to get a one-line explanation of it, plus the lines it drew on (click one to jump there) and a **See more** that expands the card with the long version — in the diff too, not just the file view. **Pin** the card to read or copy from it without it closing when the pointer moves away. It works on plain unhighlighted words too, and reads only a numbered window around the token — in a diff, only the hunks you can see — so when something is defined elsewhere it says so instead of inventing it. Answers are cached per file version, keywords and literals are skipped, and masked secret files are never sent.
- **AI conflict resolution** proposes a merge into the editable output; never auto-applies.
- **AI PR review** summarises a diff and flags risks, each one anchored to a real `path:line`; **AI branch naming** from a description; **AI PR description** drafts a title + Markdown body from the branch's commits and diff, right in the Create-PR form.
- **Grounded answers** — the review sees the diff as labelled hunks and may only cite those labels; Gitcito resolves each one to the actual file and line. A model that invents a location is rejected and asked again, so findings point at code that really exists.
- **Repo wiki** — generates a short wiki that explains the codebase, with a counted **repo card** on its overview: a **language breakdown** (bars, by bytes), the **stack** — the frameworks it's built on shown as badges (Next, Angular, Electron, Tailwind, Django…), plus dependencies read straight from your manifests (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `pubspec.yaml`, `Gemfile`…) and grouped by the AI into architectural roles — scaffolding like type stubs, loaders and lint plugins is filtered out first, and it can only place packages the project really declares — a **page map** wiring the pages together, and a **module dependency graph** — which folder imports which, parsed straight from the source (JS/TS, Python, Go, Rust, Dart, Ruby, C/C++, PHP), resolved against the repo's own files so a package import never becomes a fake edge, with the folder depth picked from the layout. The written pages: Gitcito plans a handful of pages from the files the repo tracks (docs and manifests first, then whatever churns most), then writes each page from the files it covers. **Every statement cites the file it came from**, and a claim no file supports is rejected rather than published — pages are written in parallel and stored in one go, so a failed run never replaces a good wiki. It tells you when it was written at an older commit, and **Export to docs/** writes the whole thing into `docs/wiki/` as linked Markdown — so it can be committed, reviewed in a PR and read on the host. From the tools menu or `⌘K` → "Open repository wiki". Secret-looking files are never sent.
- **AI assistant** — a **Run** button in the toolbar (shown only when AI is enabled) opens the assistant: **ask** the AI to act on the repo (resolve globs/intents into staged changes), or run the **project-config wizard** that scaffolds `.gitignore`, CI workflows, agent rules and more. Also reachable from the command palette.
- **Generate themes** from a prompt, and **smart-stage** suggestions for what to commit.
- Presets for **OpenAI, Anthropic, OpenRouter, Groq, Mistral and Ollama** (local), or any OpenAI-compatible endpoint; live model fetching and custom instructions.

### Preview anything
- **File preview pane**: Markdown, Word (`.docx`), Excel (`.xlsx`), PDF, video, audio, images and syntax-highlighted code.
- **Integrated terminal**, a real PTY powered by xterm + node-pty, with multiple tabs per repo.
- **Run & debug** (`launch.json`). A **LAUNCH** button reads your `.vscode/launch.json` (root + nested, grouped with dividers, VS Code variables resolved), runs the picked config — with its `preLaunchTask` — in the integrated terminal, and gives you a floating toolbar to **pause / resume, restart, stop** and switch between running sessions. **`${input:…}` prompts** are asked interactively before launch (promptString / pickString), and `isBackground` tasks (watch / dev server) run detached so they never block the launch. Toggle it in **Settings → General**.

### Make it yours
- **9 built-in themes** (Gitcito, Nord, Dracula, Solarized, GitHub, Monokai, Midnight, Contrast, Daltonic), each with light & dark — plus custom and **AI-generated** themes, and adjustable code font size.
- **Light, dark or follow-OS**, switchable live.
- **Profiles** with separate Git identities and integration tokens.
- **Keyboard shortcuts** with a `?` cheatsheet — core navigation shortcuts (palette, code search, vault) are **rebindable** with conflict handling and per-shortcut reset, and **⌘⇧T reopens the last closed tab**.
- **Undo / redo**, a first-run onboarding wizard, and **i18n** (English & Spanish) out of the box.

### Command line (`gitcito .`)
Open any folder straight from your terminal — like `code .` for VS Code.

- **Install**: open the Command Palette (`⌘K`) and run **"Install 'gitcito' command in PATH"** (macOS only). This symlinks a small shim into `/usr/local/bin` or `/opt/homebrew/bin` (prompting for admin rights only if neither is user-writable). Run the palette command again anytime to **uninstall**.
- **Basic usage**: `cd` into a repo (or any folder) and run:
  ```sh
  gitcito .
  ```
  Opens that folder as a repo tab. If the path is already open in a tab (or inside a group), Gitcito just **focuses it** instead of opening a duplicate — if not, it's added as a **new tab at the front**. Folders that aren't a Git repo yet still open, dropping you into the existing **"initialize repo here"** flow. You can also pass an explicit path: `gitcito ~/code/my-project`.
- **Naming & grouping**: add `-n`/`--name` to set the tab's display name, and `-g`/`--group` to place it inside a group tab:
  ```sh
  gitcito . -n "My API" -g "Work"
  ```
  If a group named "Work" already exists, the repo is added to it; otherwise a new group tab is created at the front. Matching (for both the standalone-tab and group lookups) is by path/name, so re-running the same command just re-focuses what's already there instead of creating duplicates.
- Gitcito uses a **single-instance** model — running `gitcito` while the app is already open hands the request off to that existing window rather than launching a second copy.

## 🖼️ Screenshots

### Command palette & code search
| Command palette (`⌘K`) | Code search (`⌘⇧F`) |
|---|---|
| ![Fuzzy command palette grouped by actions and branches](docs/screenshots/command-palette.png) | ![Working-tree code search with grouped, syntax-highlighted hits](docs/screenshots/code-search.png) |

### Insights & stacks
| Repository insights | Branch stack |
|---|---|
| ![Insights dashboard: churn, contributors and hotspots](docs/screenshots/insights.png) | ![Branch stack with restack and per-level PRs](docs/screenshots/branch-stack.png) |

### Safety net & changelog
| WIP snapshots | Changelog generator |
|---|---|
| ![WIP snapshot list with restore and auto interval](docs/screenshots/snapshots.png) | ![Conventional-commit changelog grouped by type](docs/screenshots/changelog-gen.png) |

### Secrets vault
Secure & fully local — secrets encrypted with your OS keychain, global and per-repo, never synced and never committed.

![Vault with global and per-repo encrypted secret entries](docs/screenshots/vault.png)

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

### Graph style
Pick a lane palette (built-in, custom or AI-generated), line corners, row density and thickness — with a live preview.

![Graph style settings: lane palette, line corners, density and thickness with live preview](docs/screenshots/settings-graph.png)

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

### Run & debug (`launch.json`)
A **LAUNCH** button next to the Git / Files tabs reads your `.vscode/launch.json` (and any nested ones, grouped with dividers) and runs a config straight in the integrated terminal. `${input:…}` values are prompted before launch and `isBackground` tasks run detached. A floating VS Code-style toolbar lets you pause / resume, restart and stop, and switch between running sessions. Toggle it in **Settings → General → Enable launch.json**.

![LAUNCH picker running a launch.json config with the floating debug toolbar](docs/screenshots/launch-configs.png)

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
| Split (side-by-side) diff | Image diff | Markdown preview |
|---|---|---|
| ![Side-by-side split diff with word-level highlighting](docs/screenshots/split-diff.png) | ![Side-by-side image diff](docs/screenshots/image-diff.png) | ![Markdown preview pane](docs/screenshots/markdown-preview.png) |

### Settings
| AI | Themes |
|---|---|
| ![AI settings page](docs/screenshots/settings-ai.png) | ![Theme settings page](docs/screenshots/settings-themes.png) |

| Security | Shortcuts |
|---|---|
| ![Security settings: mask secrets, large-file guard, vault](docs/screenshots/settings-security.png) | ![Shortcuts settings: rebindable keyboard shortcuts](docs/screenshots/settings-shortcuts.png) |

### Per-repo settings
Protected branches, analytics, history and the operation log — per repository, from the gear next to the toolbar tools.

![Repository settings with general / analytics / history / logs tabs](docs/screenshots/repo-settings.png)

## 🚀 Development

```bash
npm install            # installs deps + rebuilds node-pty
npm run dev            # launch in dev mode
npm run build          # build
npm run dist:mac       # package a macOS app
npm run typecheck      # type-check both configs
npm test               # run the vitest suite
npm run playground     # (re)generate the example repos under examples/playground

# Screenshots: render from the playground repos
npm run screenshots:gif                        # all PNG shots including animated GIF clips (needs ffmpeg)
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
