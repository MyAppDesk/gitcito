# Rust port

## Parity status: 38.0%

**Target: 100% of documented Gitcito behavior, implemented natively, with
matching safety and undo guarantees.** Current figure is a self-assessed feature
coverage estimate, not a claim of release parity. It uses ten product areas
below, weighted equally to avoid counting source lines as progress. Coverage
means documented workflows implemented in Rust; missing secondary flows,
failure handling, or safety behavior lower an area's score. An area reaches
100% only after its documented behaviors and safety boundaries pass parity
verification. Values should rise only when implementation and evidence support
the change.

| Product area | Coverage | Evidence still missing or work remaining |
|---|---:|---|
| Git operations | 71% | Other operation previews and less common merge and push recovery paths |
| Repository management | 95% | Broader bulk actions, full onboarding, and remaining registry interactions |
| History and recovery | 54% | Guards for every destructive Git operation, snapshot diff, full graph behavior, purge runtime verification, and recovery edge cases |
| Files, diffs, and previews | 44% | External diff/merge tool runtime parity checks, embedded Markdown images, richer document formats, and semantic diffs |
| Integrated terminal | 47% | Match xterm behavior, links, terminal settings, and platform-specific interaction |
| Settings, credentials, and security | 31% | GitHub HTTPS token storage now uses explicit keychain consent; credential profiles, vault, secure sharing, and broader settings remain |
| Hosting and collaboration | 17% | GitHub PR listing, detail, comments, reviews, inline threads and guarded merge; GitHub Issues list/detail/create/comment/close/reopen; read-only milestones with issue progress and release notes; notification inbox and opt-in review/CI desktop alerts with account-aware backlog suppression. Stack route editing, rebase, push, and submission remain |
| AI and repository intelligence | 1% | Native staged-diff commit message generation through Codex CLI only; provider settings, repo chat, summaries, wiki, insights, and local CI workflows remain |
| UI, accessibility, and localization | 10% | Product design, keyboard/accessibility parity, and translated native UI beyond currently keyed screens |
| Packaging and platform parity | 10% | Installers, signing, updates, and verified macOS, Windows, and Linux behavior |
| **Overall (equal-weight mean)** | **38.0%** | **100% requires every area at 100%** |

The inventory baseline is the 77 top-level handbook topics in `docs/help/`.
This estimate groups those topics into the ten areas above; it is directional
because topics vary in size. We will replace estimates with verified coverage
counts as each topic gets a native behavior checklist. Current ratings total
380; `380 / 10 = 38.0%`. The small AI score reflects one narrow workflow, not
AI parity. Electron stays available through
its launch profile until native reaches verified parity.

`native/` starts a native desktop successor using Rust, egui and libgit2. It
uses egui-components for shared cards, buttons, checkboxes, badges, inputs, and
tabs across its native screens, with
Gitcito's shared light/dark visual system and IBM Plex Sans and Mono, Phosphor
icons, refined surfaces, focus colors, rounded controls and roomier hit targets,
gives native Settings a section rail
for appearance, editor, recovery, repository scans and Git identity, wraps its
global toolbar into app and
repository action rows, frames branch and registry entries with clear active
states and secondary menus, and gives primary views a persistent, labeled
egui-components Sidebar with translated navigation, Git graph repo marks and
active-repository context, plus a branch panel that yields space to
the repository registry. The native window opens at 1440 × 900 with a
1120 × 720 minimum so navigation, branch tree and work area retain usable
space together. History uses compact commit IDs and a translucent selected row;
working-tree files and branches use lightweight selected rows. Worktrees and
remote management fold into labeled sections to keep branch checkout in focus.
The Changes view groups staged and unstaged files beside a persistent
selected-file diff with a two-column line-number gutter and theme-aware
change tints. Working tree, History and Stashes now have segmented panes, with
the commit composer staying in Working tree so long history and stash lists do
not crowd the diff. The working-tree pane reserves room for its commit composer;
the file and diff columns resize by dragging and keep their widths for the
session. WIP snapshots, commit-notes sync, and range-diff sit inside one
collapsed Tools disclosure above the workbench. File rows show filename and
parent path with component-based stage controls and overflow actions. Its
composer groups staged count, message generation,
amend, repository scope and message input in its commit composer. Commit stays
disabled until staged changes and a message are ready.
Files separates preview, blame and file history into segmented tabs; history
entries open the selected commit in Changes.
Time Machine's file browser uses the same selection treatment, full-path
tooltips and change markers for files touched by the selected commit. Its
preview can restore a file from the displayed commit through the existing
confirmation, secret-path warning, snapshot guard and undo flow.
Repository paths stay shortened in the toolbar, with full paths available on
hover.
It opens or initializes a repository through a native folder picker, remembers recent
repository paths and open repository tabs in the OS config directory, stores
favourite repositories and aliases and surfaces them in the quick picker, saves scan roots
with bounded depth, presents searchable registry rows as framed cards with
quick open/favourite and secondary overflow actions, persists discovered paths
in sections grouped
by open, favourite, recent, workspace, scanned repositories, and user-assigned nested folder sections with remote owner, current branch, and opt-in working-tree and upstream counts, supports Locate
and Forget without touching repository files, closes the current workspace's
repository tabs with a localized count confirmation for multiple tabs, stores
per-section registry color overrides with reset controls, copies canonical
repository names and paths from registry rows, reveals repository folders in
the platform file manager, opens a repository's GitHub page using origin first
and another GitHub remote as fallback, starts repository-scoped integrated
terminal sessions, saves an external editor executable with separate quoted
folder and file argument templates, detects supported editor commands from
`PATH` when Settings opens, expands `{path}`, `{repo}`, `{line}` and
`{col}` without a shell, opens repository folders and selected files with it,
and supports configured blame-line jumps, fetches or pulls in persisted
default, fast-forward-only, or rebase mode
each registry section sequentially with progress, per-repository errors and
guarded undo for successful pulls, and opens found repositories, saves,
switches, renames, reorders, and deletes named workspaces containing repository tab strips and named repository groups with filtered tabs, nested folder assignment/navigation, per-tab group membership, persistent colors, create, rename and delete actions, drag-to-assign tabs and nested folders, reorder tabs and groups, sequential group fetch and clean-tree pull in persisted default, fast-forward-only, or rebase mode with progress, per-repository errors, and guarded pull undo,
restores the
active repository on launch, clones repositories with
background progress, with partial/shallow, branch, and recursive-submodule
options plus remote branch listing, browses indexed and untracked files in
expandable folders with descendant change-status counts, searches paths
recursively, previews text and bounded PNG/JPEG/GIF/WebP images, compares
changed tracked images with `HEAD` side by side or with a draggable swipe
handle, renders
Markdown with a source toggle, syntax-highlights recognized source file types,
filters whitespace
changes in staged and unstaged diffs, searches diff lines with match navigation,
highlights differing spans within paired added/removed lines, shows split old/new
patch panes with linked or independent scrolling and optional wrapping, and
performs bounded content search with case, whole-word, and regex options plus
history pickaxe search across refs with selectable commits,
shows line blame and file history,
manages cone-mode sparse checkout with clean-tree checks and guarded undo,
reports LFS availability, patterns, and pointer hydration, with track/untrack undo,
clean-tree LFS pull, and confirmed local object pruning,
sets per-repository author name and email for native commit creation, with guarded undo,
loads configured Git commit templates and edits multiline commit messages,
prefills branch ticket keys, offers declared Conventional Commit scopes, appends configured `.gitcito.json` commit trailers, shows session-scoped pre-push reminders, links configured tickets in selected commit messages, checks required Node version, checks required files with safe copy-from and undo, checks required hooks path with local-config repair and undo, reports uninitialized required submodules with recursive checkout, and checks LFS availability and pointer hydration with clean-tree pull repair,
can generate a staged-diff commit message with the user's signed-in Codex CLI
in a background thread, and refuses to send credential-looking staged files,
manually saves full working-tree WIP snapshots under hidden Git refs, lists,
restores with a pre-restore snapshot, and deletes them with a ref-checked
confirmation; individual paths deleted in a snapshot restore from its base
commit through confirmation, a guard snapshot, and undo; configurable background snapshots run every 5, 15, or 30 minutes,
and guard snapshots protect file discard and history restore; snapshot files
can be inspected and restored individually with a confirmation and backup
snapshot; deleted-path restore and guards for every destructive Git operation remain,
selected commits support notes with history markers and guarded undo; selected-remote fetch/push transfers only the commit-notes ref, with fetch preserving its old ref for undo,
compares branch versions with Git range-diff, includes reflog previous positions and optional bases, and shows rewrite interdiffs,
offers a read-only historical commit slider, nested folder navigation, changed-path markers, and bounded object-database file previews with secret masking,
lists common Git hooks, detects custom hook paths and pre-commit config, and supports
hook creation/editing, enable/disable, confirmed deletion, and snapshot undo,
adds exact-path root ignore rules, can remove files from the index or delete them after
confirmation, with index and file undo,
lists local branches and recent
history with parent edges and branch/tag decorations, previews staged,
unstaged, and selected-commit diffs, and supports
branch creation, checkout, rename, merge, current-branch rebase, and merged local or remote branch
deletion (including remote tracking branch checkout), worktree list/add/open/remove,
add/edit/remove remotes, including separate fetch and push URLs with credential
rejection and guarded undo, and open their HTTPS/SSH/scp web URLs in the browser;
lists up to 25 GitHub pull requests through `gh`, opens a selected PR, and opens
the PR creation form after requiring a fetched upstream and no local-only commits;
lists GitHub issues with live search and label/assignee badges, opens issue
details, creates issues, posts comments, and
closes or reopens issues through `gh`; lists GitHub milestones with due dates,
completion progress and their issues; lists releases and opens their Markdown
notes, publication metadata and GitHub page; lists all or unread GitHub
notifications, opens threads in the browser, marks one or all read, and refreshes
every five minutes through `gh`;
PR detail shows conversation comments and submitted review summaries with author,
date, state and Markdown body, plus inline review threads with replies, file and
line location, resolution and outdated state (first 100 threads and comments
per thread), permission-gated resolve/reopen and inline-reply actions, plus
per-file viewed state with paginated GitHub GraphQL loading,
lightweight, annotated, and Git-configured signed tag create/list/delete/push and signature verification, confirmed bulk local tag deletion with per-tag undo, Git CLI commit/amend execution
(so configured commit hooks and signing run), fixup,
autosquash, interactive rebase (reorder, squash, fixup, drop, reword, edit),
squash-from-here, reset to selected commit (soft/mixed/hard),
cherry-pick and revert with a translated component-based conflict card and
scrollable file list. Its editor has three draggable panes for ours, theirs and
editable output; line, chunk and whole-side picks work independently, with manual
edits retained when picks change. Configured external merge tools run through
Git. Conflict-history details and AI resolution remain Electron only. It
supports per-file and bulk staging,
plus selective unstaged-hunk and line staging with index-snapshot undo,
commits, stash save with untracked files and optional `--keep-index`, selected-path stash with guarded undo, selected-file diff preview with secret masking and a byte bound, selected-file restore from stash with guarded undo and modifier-based range selection, whole-stash apply/pop/drop and branch-from-stash, fetching, pull, and
pushing. Force push confirms the remote branch that will be replaced and warns
that remote commits can be lost; credential-looking files trigger a second
confirmation. Stash drop, tag deletion, and worktree discard ask for explicit
confirmation; discard checks paths stay
inside the worktree. Undo restores prior index snapshots, local commits, local
tags, remote configuration, and deleted remote branches (with another push confirmation);
it refuses commit undo after commit reaches a remote. Amend also refuses commits
already on remote refs and can be undone to the original commit. Autosquash uses
Git's noninteractive sequence editor and the same rebase conflict workflow.
Squash-from-here replaces selected commit through HEAD with one commit, requires a clean
worktree, and records guarded ref-move undo.
Reset-to-commit requires a clean worktree, confirms history rewrite, and records undo;
hard reset undo restores the prior clean branch tip only if branch, index, and worktree
remain unchanged.
Rebase requires a clean working tree, preserves author and message, and supports
conflict continue or abort.
Rust launch resolves Cargo from `PATH` or installed Rustup
toolchains. Credential-looking file contents stay hidden in diffs;
Pull and push follow the current branch upstream when the selected remote
matches, including differently named remote branches. Selecting another remote
targets the local branch name there. A successful push updates tracking
configuration. Pull opens the merge confirmation flow; dirty worktrees are
rejected before fetching. Stash-to-branch checks out stash
base and keeps stash until apply succeeds. Commit, branch push, and tag push
show a confirmation before including such files. Restoring a file from selected
history commit changes only working copy, checks repository path containment,
restores symlinks, and records guarded content, link target, and permission
snapshots for undo. GitHub HTTPS operations through libgit2 use an optional
personal access token stored directly in the OS keychain after explicit native
consent; otherwise they use the system Git credential helper. SSH uses the
agent. Clone runs Git CLI with its own credential helper and does not receive
the native token. Other hosts still use the system Git credential helper. This
is an early migration slice,
not a feature-complete replacement. Git bisect supports manual good/bad/skip
marks, displays first-bad results, and runs user-provided test commands with
streamed output and a stop control. History uses a resizable master/detail
layout with independently scrolling commit graph and selected-commit panes. It
supports search across commit hash, subject, author and refs, author filtering,
loading older commits, and reflog recovery browsing that opens prior commit
snapshots and creates a guarded, undoable branch at a selected prior position.
Stashes uses a resizable split for stash selection, changed files and preview.
Submodule status now
shows initialized, uninitialized, moved, and conflicted entries; users can sync
URLs or initialize and update all or individual submodules recursively. New
submodules can be added with an undo entry that refuses cleanup if nested
working copy, gitlink, or `.gitmodules` changed. Removal confirms before
deinitializing and removing the gitlink; dialog warns that local submodule
changes will be lost. Integrated terminal now runs a login shell in a native
cross-platform PTY, resolves Unix child-process `PATH` from the login shell,
parses VT100 screen updates, resizes with the panel, and renders ANSI colors,
handles bracketed paste and scrollback, and forwards text,
all Ctrl+A through Ctrl+Z control bytes, and common navigation keys. Multiple shell sessions can stay open in
separate tabs and continue draining output while another tab is selected. The
terminal uses segmented session tabs, displays PTY state in the toolbar and
retains output after exit while offering restart.
Native Settings now persist system, light, or dark appearance; edit global Git
author identity and default branch, which native init applies to new repositories.
Appearance can choose any of Gitcito's nine built-in palettes; background layers,
semantic colors, component tokens, and focus states follow selected palette in
both light and dark modes. Theme selection uses preview cards with actual surface
and status colors.
Native Integrations settings load Git's external diff and merge tool catalog,
save global `diff.tool`, `merge.tool` and `mergetool.keepBackup`, open per-file
diffs, and hand conflicts to `git mergetool` in a background worker. Successful
external merges refresh native conflict state.
Repository options now configure automatic commit signing, GPG format, and signing
key, with guarded undo; native commits use Git CLI so configured signing runs.
Per-repository protected branch patterns default to `main,master`, warn before
direct commits and force pushes, and save to local Git config with guarded undo;
version-1 `.gitcito.json` protection patterns add to the local list.
Broader Electron settings and full UI localization remain. Native Settings
now offer a persisted choice among all 16 locales; shared translated labels,
WIP snapshot controls, file stage/discard controls, and time machine navigation
follow it, as do the native Code TODOs page, its four grouping modes, tag and
owner filters, changed-files filter, filter-aware summary cards, and cancellable
`git grep` scanner. TODO
rows open their source file and scroll the preview to the marker line. A
generator now exports all 16 existing locale dictionaries (3,646 keys each)
to a native catalog. Rust UI uses the catalog for shared labels and some views;
most native copy and right-to-left layout still need localization.
`npm run native:check` exports the locale catalog and type-checks the Rust app;
`npm run native:build` exports the same catalog and creates a release binary.

## Port sequence

1. Establish native shell and Rust Git repository/status reads. **Started.**
2. Port commit graph, diffs, branches, remotes, and safe Git operation/undo
   model. Branch list/create/checkout, recent history, file diffs, stage/commit,
   fetch/pull/push, stash, and guarded undo for index and commit changes exist;
history filtering/paging, reflog recovery, bisect, and interactive rebase now
also exist. History graph now tracks parent lanes and colors branch paths.
Merge, rebase, and reset confirmations now preview commit counts and tree diff
totals. Confirmation checks branch tips again and asks for review if they moved.
Cherry-pick and revert confirmations preview changed files and line totals, then
recheck branch and commit IDs before applying. Native history purge now measures
path impact, backs up local branch and tag refs, rechecks the reviewed preview,
and offers restore or permanent backup deletion. Runtime verification remains
pending. History rows show typed local branch, remote branch, and tag labels;
the selected commit retains all refs and identifies `HEAD`. Remaining core gaps
include graph edge cases, previews for less common operations, and remote branch
workflow edge cases. Current branch upstream can be set, changed, or removed
against fetched remote branches, with guarded undo.
3. Port repository management, settings, credentials, hosting integrations,
   terminal, previews, and AI features into native Rust modules.
4. Replace the preview UI with Gitcito visual design, translated copy,
   accessibility, and platform parity flows.
5. Verify feature parity and release packaging on macOS, Windows, and Linux;
   retire Electron only after parity.

Keep the existing Electron app available through the VS Code launch profile
`Launch Gitcito (Electron)` during migration. Use `Launch Gitcito (Rust)` for
the native preview. Rust builds require a local Rust toolchain.

## Native build

From the repository root, run `npm run native:check` for a compile check or
`npm run native:build` for an optimized binary under `native/target/release/`.
Cargo and the platform's native GUI build dependencies must be installed.
The `native-preview.yml` workflow builds release executables for macOS, Windows,
and Linux on pushes to `refactor` or manual dispatch. It uploads 14-day CI
artifacts, not installers. Local optimized macOS build succeeds; the hosted
Windows and Linux builds have not run yet. Signing, installers, and updates
remain unimplemented.
