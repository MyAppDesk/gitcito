# Team / Hack Mode — research

A research note, not a plan of record. Eleven candidate capabilities were put
against the code; this says which of them Gitcito already ships, which are a
day's work, which are a product Gitcito is not, and what — if anything — is
worth building.

Written in the roadmap's register: cost stated next to the idea, limits stated
next to the upside, and the case for *not* building it argued as seriously as
the case for building it.

Every claim about the code cites `file:line`. Anything not anchored to a line
is marked as an assumption.

**Headline: most of this is already built, and the part that is not is mostly
not Gitcito's job.** The recommendation is three small changes to existing
features, no new mode, and an explicit "deliberately not doing" entry for the
rest.

---

## 1. The hypothesis, checked

The premise was that a 3–6 person team working the same code for 24–48 hours
fails at coordination, not at git. That part holds. What does not hold is the
implied gap: Gitcito already ships the coordination primitive the hypothesis
asks for.

| Claimed failure | Verdict |
|---|---|
| 1. Two people edit the same file, nobody notices for six hours | **Already solved, in-repo.** Teammate radar crosses new upstream commits against the dirty working tree and toasts after every fetch — `src/main/git.ts:1689`, `src/renderer/src/stores/repo.ts:1305`. |
| 2. Good work unpushed when the laptop dies | **Half solved.** WIP snapshots capture the whole tree, untracked included, under `refs/gitcito/wip/` — `src/main/git.ts:6602`. They survive a bad `git clean`; they do not survive a dead disk. |
| 3. Nobody fetches often enough | **Real gap, and it is a number.** Auto-fetch is minute-granular and covers **only the active repo** — `src/renderer/src/App.tsx:613`. |
| 4. Agents touch shared files unnoticed | Same signal as (1). Radar reports *which* files overlap — `src/shared/types.ts:288`. Nothing about it is agent-specific. |
| 5. Cross-repo contracts break in silence | **Real gap.** No signal crosses a repo boundary today. |
| 6. Minute 5 is worse than minute 500 — nobody agrees on config | **Real, but it is a distribution problem, and the distributor exists** — secure workspace bundles, `src/renderer/src/components/SecureWorkspaceModal.tsx:491`. |

So: two of six are genuinely open (3 and 5), one is a packaging question (6),
and three are shipped.

**Where the hypothesis overreaches.** Failure 4 is framed as an agent problem
and is not one — a fast agent and a fast human produce the same overlap signal,
and the radar cannot tell them apart. Failure 2 is framed as a git problem and
is only partly one: "the laptop died" is answered by a backup, and answering it
with `git push` to a shared remote imports a credential-leak surface Gitcito
currently spends code to *prevent* (`src/renderer/src/stores/repo.ts:710`).
That trade is examined in §4, C5.

---

## 2. Phase 1 — inventory

### The schedulers

Every recurring timer in the app lives in one file, `App.tsx`, as five
`useEffect` blocks:

| What | Cadence | Scope | Line |
|---|---|---|---|
| Light refresh (status + branches) | 20 s, hardcoded | active repo | `src/renderer/src/App.tsx:572` |
| Hosting poll (PRs, releases) | `autoFetchMinutes` | active repo | `src/renderer/src/App.tsx:584` |
| **Remote fetch** | `autoFetchMinutes` | **active repo only** | `src/renderer/src/App.tsx:613` |
| GitHub inbox poll | `max(autoFetchMinutes, 5)` | global | `src/renderer/src/App.tsx:658` |
| WIP snapshot | `wipSnapshotMinutes` | active repo | `src/renderer/src/App.tsx:663` |

Facts that matter for anything built on top:

- The unit is **minutes**, in the setting and in the type —
  `src/shared/types.ts:2622`, default `5` at `src/shared/types.ts:2952`. A 30–90 s
  cadence is not a smaller number; it is a different field.
- There is **no backoff, no jitter and no stagger.** A tick is
  `setInterval(fn, minutes * 60_000)`; a failing remote is retried at the same
  rate forever.
- Auth is per-call: `withRemoteAuth` rewrites the remote URL with a PAT, runs,
  and restores it (`src/main/git.ts:1215`). With no PAT it falls through to
  git's credential helper — i.e. to whatever prompts that helper raises.
- Failures are silent by design — `fetchAll` runs through `run()` with the
  `fetch` op tag (`src/renderer/src/stores/repo.ts:1271`) and the tick has no
  error branch of its own.

### Working-tree watcher

`src/main/watcher.ts`. One recursive `fs.watch` per **renderer**, not per repo —
`active` is keyed by `webContents.id` (`src/main/watcher.ts:19`), re-pointed on
tab switch (`src/main/watcher.ts:62`). 350 ms debounce
(`src/main/watcher.ts:23`); `.git` changes force a full refresh, working-tree
changes a light one (`src/main/watcher.ts:40`). Linux has no recursive
`fs.watch`, so it falls back to watching `.git` only —
`src/main/watcher.ts:101`.

**Consequence: watching N repos at once is not a config change.** The one-watch
-per-renderer shape is a deliberate simplification and would have to become a
map.

The renderer mutes its own writes for 2 s around any mutation —
`WATCH_MUTE_MS`, `src/renderer/src/stores/repo.ts:239`, applied in `run()` at
`src/renderer/src/stores/repo.ts:546`. A fetch slower than 2 s therefore
un-mutes mid-flight, and `withRemoteAuth`'s `remote set-url` restore lands as a
`.git/config` write → full refresh. Harmless at 5 minutes; measurable at 60
seconds across six repos.

### Remote awareness — already shipped

**Teammate radar** (`src/main/git.ts:1689`) is C3, complete:

- one `for-each-ref` over `refs/remotes`, newest first, capped at 30 branches /
  45 days (`src/main/git.ts:1693`);
- for each branch ahead of HEAD, the three-dot file list
  (`src/main/git.ts:1733`) intersected with the dirty set from `git status`
  (`src/main/git.ts:1724`) → `overlap: string[]`;
- one batched in-memory `merge-tree` for the conflict forecast
  (`src/main/git.ts:1749`);
- sorted overlap-first (`src/main/git.ts:1760`); no network, all from the last
  fetch.

**The sweep** runs after every successful fetch —
`src/renderer/src/stores/repo.ts:1302` → `radarSweep`,
`src/renderer/src/stores/repo.ts:1308`. It is already tuned against alert
fatigue in two ways: it returns immediately when nothing is dirty
(`src/renderer/src/stores/repo.ts:1310`), and it compares a
`ref@sha` signature against the previous scan so the same collision toasts once
(`src/renderer/src/stores/repo.ts:1318`).

Documented at `docs/help/teammate-radar.md`, mapped in
`scripts/docs-map.json:61`. A separate `conflict-radar` modal
(`src/renderer/src/components/ConflictRadar.tsx`) covers merge-preview across
branches.

`newCommits` / `lastFetchAt` are patched by the same fetch path
(`src/renderer/src/stores/repo.ts:1285`) and consumed by the graph as the
"new since last fetch" marks — `src/renderer/src/components/GraphView.tsx:614`.

### Multi-repo — more than expected

- **Group tabs with nested folders**: `GroupTab` carries a flat `repos: RepoRef[]`
  plus a `RepoFolder` tree (`src/shared/types.ts:2439`, `:2451`). Folders are
  presentation only — membership and batch actions read the flat list
  (`src/shared/types.ts:2436`).
- **Workspaces** are named saved tab layouts — `src/shared/types.ts:2566`.
- **Mission Control** is a live cross-repo dashboard: every repo of every tab in
  the active workspace, de-duplicated
  (`src/renderer/src/components/MissionControlPage.tsx:107`), refreshed every
  30 s (`:39`), sorted by urgency (`src/renderer/src/lib/missionControl.ts:21`),
  with bulk fetch/pull over the selection
  (`src/renderer/src/lib/missionControl.ts:106`, `:333` in the page). It is
  explicitly **local-only** — one `git status` per repo, no network
  (`src/renderer/src/components/MissionControlPage.tsx:83`).
- **Batch fetch/pull** across paths with a single summary toast —
  `src/renderer/src/stores/repo.ts:1332`.
- **Submodules** (`src/main/git.ts:5718`) and **subtrees**
  (`src/main/git.ts:387`) are both supported; subtree provenance is remembered
  in local git config as `gitcito.subtree.<key>.url`.

So the "one view of N repos" half of C4 exists. What does not exist is any
*fetch* on a repo that is not the active tab.

### Settings and per-repo metadata

`AppSettings` is global, with a well-established escape hatch: three
`Record<repoPath, …>` maps — `repoProfiles` (`src/shared/types.ts:2579`),
`repoAliases` (`:2586`), `repoLayouts` (`:2621`). Each carries a comment saying
why it is path-keyed rather than stored on `RepoRef`: so the same repo opened in
two tabs cannot diverge. **That is where a per-repo role would hang, and the
pattern is already three-deep.**

Repo-scoped state that belongs to the repository rather than the app goes into
**local git config** under a `gitcito.` namespace — protected branches
(`src/main/git.ts:3864`, default `['main','master']` when unset) and subtree
provenance (`src/main/git.ts:387`). Local git config is per-clone: it is a
per-repo store, **not** a shared or versioned one.

**There is no `.gitcito/` directory precedent anywhere.** The string `.gitcito`
appears only as the bundle file extension
(`src/renderer/src/components/SecureShareModal.tsx:25`). Introducing a
versioned in-repo config directory would be a new concept, with a new parser, a
new trust boundary, and a new thing to document.

### Secure share — the invite mechanism, already built

`.gitcito` bundles are AES-256-GCM, password-protected, v2/multi-section
(`src/shared/types.ts:1752`). Sections are `repo` | `vault` | `workspace` |
`notes` (`src/shared/types.ts:1785`).

The **workspace** section is the interesting one:

- repos are described portably — `{ name, remote?, folder }` — and matched on
  the receiving machine **by remote URL first, folder name second, never by
  absolute path** (`src/shared/types.ts:1764`);
- group tabs survive the round trip, colour included
  (`src/shared/types.ts:1773`);
- import is **strictly additive**: `applyWorkspaceSection` builds a brand-new
  `Workspace` and appends it, touching no existing setting —
  `src/renderer/src/components/SecureWorkspaceModal.tsx:518`;
- repos the receiver does not have are silently skipped, with their remotes
  listed so they can be cloned first
  (`src/renderer/src/components/SecureWorkspaceModal.tsx:488`).

Path safety on import is enforced in main: `resolveInside`
(`src/main/secureShare.ts:87`) rejects any entry escaping the repo root, the
preview flags it as `safe: false` (`src/main/secureShare.ts:206`) and the
writer drops it (`src/main/secureShare.ts:231`).

**"Merge, overwrite or ask?" — the answer is "add, never touch".** That is the
right semantics for an invite, and it already exists.

There is **no custom URL scheme**: no `setAsDefaultProtocolClient`, no
`open-url` handler, no `protocols` key in the build config. The `gitcito` CLI is
a symlink to a shim in `/usr/local/bin` or `/opt/homebrew/bin`
(`src/main/cli.ts:13`) — macOS-only, and unrelated to deep links.

### Notifications

Two channels exist.

- **Toasts** — `src/renderer/src/stores/ui.ts:393`, auto-dismissed after 3.5 s
  (7 s for errors) at `src/renderer/src/stores/ui.ts:396`. This is what the
  radar sweep uses.
- **Native OS notifications** — already shipped, via the renderer's `Notification`
  constructor: `src/renderer/src/App.tsx:647`, gated on
  `settings.desktopNotifications` (`src/shared/types.ts:2624`, default `false`
  at `:2953`, toggle at `src/renderer/src/components/SettingsPanel.tsx:2433`).
  It fires only for GitHub inbox items of reason `review_requested` /
  `ci_activity`, is suppressed on the first poll so an existing backlog is not
  dumped as notifications (`src/renderer/src/App.tsx:640`), and swallows the
  throw when the OS denies permission (`src/renderer/src/App.tsx:650`).

**C10 is therefore ~15 lines, not a project.** The pattern — feature flag,
prime-then-notify, try/catch — is written and shipped; a second call site
reuses it. No `electron.Notification` in main is needed.

### AI layer

- Review is grounded, not free-form: the model is handed opaque hunk IDs
  (`E1`, `E2`…) and may cite only those; the app resolves each back to a real
  `path:line`, so a hallucinated reference is a **validation error rather than a
  plausible lie** — `src/main/grounding.ts:1`.
- Budgets are explicit and already conservative: 24 000 bytes of hunk text,
  40 hunks, 4 000 bytes per hunk (`src/main/grounding.ts:44`).
- `reviewPR` (`src/main/ai.ts:820`) is the worked example: system prompt forbids
  writing paths or line numbers (`src/main/ai.ts:836`), caps at 8 findings
  (`:838`), JSON-schema-validated with an allow-list of evidence IDs (`:851`),
  then `groundFindings` re-attaches real locations (`:855`).

**This is directly reusable for a semantic-collision aviso, and it is the single
strongest asset in the AI layer for this proposal.** Whatever a model claims
about a collision would resolve to a hunk that exists or be rejected.

### Manifests and ownership evidence

- `src/shared/repoFacts.ts` already parses eight manifest formats —
  `MANIFEST_FILES` at `:96`, dispatcher `parseManifest` at `:253`
  (`package.json`, `pyproject.toml`, `requirements.txt`, `Cargo.toml`,
  `go.mod`, `pubspec.yaml`, `composer.json`, `Gemfile`). It lives in
  `src/shared/`, so **both processes can call it today**. It also carries a
  curated noise-list (`:266`) and an "implied package" map (`:293`) — evidence
  that the maintainer has already accepted the upkeep of stack heuristics once.
- History-derived ownership evidence exists: `contributors`
  (`src/main/git.ts:6300`) and an analytics pass producing per-author totals
  plus the top-30 **hotspot files by commit count** (`src/main/git.ts:6387`).
- **`CODEOWNERS` is parsed nowhere.** Zero hits across `src/`, `scripts/`,
  `test/`, `docs/`.

### Theme and motion

- `AppTheme` is **fifteen colours × light/dark and nothing else** —
  `src/shared/types.ts:2811`, `:2829`. No density, no typography, no motion axis.
- Density exists, but only for the graph: `GraphStyle.density`,
  `src/shared/types.ts:2765`.
- Motion is **not a layer**. `framer-motion` (`package.json:119`) is imported
  directly by 24 renderer files; `styles.css` holds 10 `@keyframes`.
- `prefers-reduced-motion` is honoured in **exactly one rule** —
  `src/renderer/src/styles.css:5969`, which disables the tab shimmer — plus
  whatever `blobatar/motion.css` does for the title-bar avatar
  (`src/renderer/src/main.tsx:10`). There is no `MotionConfig`, no
  `useReducedMotion`, anywhere.
- The avatar has its own opt-out setting, `avatarMotion`
  (`src/shared/types.ts:2608`).
- **`docs/help/accessibility.md` promises more than the code delivers:**
  "Reduced motion is honoured from the OS setting — animations collapse to
  instant transitions." One media query does not do that. That gap is a defect
  independent of this proposal, and it is what makes C11 expensive.

### i18n and documentation cost

18 locale dictionaries (`src/renderer/src/i18n/`), the reference at 3 220 lines.
84 entries under `docs/help/` — 69 English pages plus 15 translated directories.
Every new user-facing string is 18 edits; every new surface is a handbook page,
a `scripts/docs-map.json` entry, and — per `CLAUDE.md` §8 — a generated
screenshot.

**This is the real currency of the whole question.** Feature cost here is not
measured in code.

### Inventory summary

| | Exists already | Would have to be built |
|---|---|---|
| **C1** Session scope | `GroupTab` + `RepoFolder` (`src/shared/types.ts:2439`), `Workspace` (`:2566`), Mission Control aggregating both (`MissionControlPage.tsx:107`) | Nothing, if "the group tab is the session" |
| **C2** Aggressive fetch | `autoFetchMinutes` tick (`App.tsx:613`) | Sub-minute unit; multi-repo scope; backoff; stagger; failure surfacing |
| **C3** Collision warning | Teammate radar end-to-end (`git.ts:1689`, `repo.ts:1308`), deduped, documented | Nothing |
| **C4** Cross-repo | Mission Control view; batch fetch/pull (`repo.ts:1332`); submodules/subtrees | Any cross-repo *signal*; contract-file declaration; a store for it |
| **C5** Auto-push WIP | Snapshots to `refs/gitcito/wip/` (`git.ts:6602`); secret push guard (`repo.ts:710`) | Push scheduler; branch naming; TTL/cleanup; a stronger pre-push gate |
| **C6** Ownership / freeze | Protected branches in git config (`git.ts:3864`); hotspots (`git.ts:6387`) | CODEOWNERS parser; owner map UI; staging annotation; freeze allow-list |
| **C7** Session creation | Manifest parsing (`repoFacts.ts:253`); per-repo-path maps (`types.ts:2579`) | Template model; role assignment; creation UI |
| **C8** Invitation | Secure workspace bundles — portable, remote-matched, additive import (`SecureWorkspaceModal.tsx:491`) | A session payload *inside* the bundle, if sessions exist at all |
| **C9** Optional AI | Grounded findings with `path:line` anchoring (`grounding.ts:1`, `ai.ts:820`); contributors/hotspots | A second-pass prompt; a proposal-review UI |
| **C10** Native notifications | `Notification` + `desktopNotifications` flag, primed and guarded (`App.tsx:637`–`650`) | One extra call site |
| **C11** Motion theme | 15-colour themes (`types.ts:2811`); framer-motion in 24 files | A motion axis that does not exist; real `prefers-reduced-motion` plumbing |

---

## 3. Costing

`ROADMAP.md` has no numeric scale — it states cost in prose ("the CI change is
about fifteen lines; the blocker is a certificate"). Same convention here, with
a coarse marker so the table sorts:

- **S** — a day or less, inside existing files, few or no new strings.
- **M** — a week-ish: new module, new UI surface, handbook page, screenshot,
  18 locale edits.
- **L** — a new concept the app does not have: new persisted model, new trust
  boundary, multi-page documentation.

---

## 4. Phase 2 — capability by capability

### C1 — Session scope · **S, and the answer is "do not add a unit"**

Your instinct that a single repo is the wrong unit is right; the conclusion that
a new unit is needed is not. `GroupTab` already **is** the event repo set:
N repos, one chip, nested folders for organisation, a flat membership list for
actions (`src/shared/types.ts:2439`). Mission Control already treats the
workspace as the aggregation boundary
(`src/renderer/src/components/MissionControlPage.tsx:88`).

**On asking "monorepo or separate repos?" at creation: do not ask, and do not
infer either.** The distinction is already encoded by what the user did — one
repo in the group means monorepo, several means several. Folder-level roles
inside a monorepo are a *different* feature (path-scoped ownership) that happens
to also apply to multi-repo setups, and it should be modelled as paths, not as a
monorepo flag. A boolean asked in a wizard that could have been derived from
`repos.length` is a question the user should never see.

Where it lands: `src/shared/types.ts` (no change), any new per-repo metadata as
a fourth `Record<repoPath, …>` in `AppSettings` beside `repoProfiles` /
`repoAliases` / `repoLayouts` (`src/shared/types.ts:2579`).

### C2 — Aggressive fetch · **M, and the multi-repo part is most of it**

Not "a number that already exists". Three separate things:

1. **Unit.** `autoFetchMinutes: number` (`src/shared/types.ts:2622`) is minutes
   in the type, the setting label (`settings.autoFetch`, 18 locales) and the
   hint. A 30–90 s cadence means a seconds field, a migration, and a UI that
   does not present "0.5" as a legal number of minutes.
2. **Scope.** `src/renderer/src/App.tsx:613` fetches `activeRepoPath` and
   nothing else. Fetching a group means iterating the group's `repos`, which is
   what `repoActions.batch` already does (`src/renderer/src/stores/repo.ts:1332`)
   — but `batch` drives the global busy indicator
   (`src/renderer/src/stores/repo.ts:1341`) and toasts a summary
   (`:1355`), which is correct for a user-initiated action and wrong for a
   silent timer. A silent variant is needed.
3. **Manners.** Backoff on failure, jitter/stagger across repos, and a way for a
   repo with no remote or dead credentials to stop being retried. None of that
   exists in any of the five timers.

**Can it be done without a mode? Yes, and it should be.** "Fetch every repo in
the group, not just the visible one" is a straight defect fix — the current
behaviour surprises anyone who opens a group tab and expects the other repos'
badges to be live. Shipping it as default behaviour with a lower floor on the
interval serves every team, not just hackathon teams.

### C3 — Collision warning · **Already shipped. Build nothing.**

`teammateRadar` (`src/main/git.ts:1689`) computes exactly the described signal —
"Ana pushed 3 commits touching `api/schema.ts`, which you have dirty" — and
`radarSweep` (`src/renderer/src/stores/repo.ts:1308`) fires it after every
fetch with the fatigue guards already in place.

**Answering the open question — file, hunk or folder?** The current answer is
**file**, and it is right:

- *Hunk* is available (`mergePreview` / merge-tree already produces conflict
  files, `src/main/git.ts:1749`) but is the wrong granularity for a warning
  whose entire value is being early: at warning time your edit is unfinished, so
  hunk-level precision measures a diff that is about to change.
- *Folder* raises recall at the cost of the one property that makes the current
  design work — the signature dedupe
  (`src/renderer/src/stores/repo.ts:1318`) only stays quiet because file-level
  overlap is rare. Folder-level overlap in a hackathon monorepo is close to
  permanent, and a warning that is always on is off.

The one thing worth adding is reach, not precision — see C10.

### C4 — Cross-repo dependencies · **The view is S. The signal is L. Do the S.**

Split it, because the two halves have wildly different costs.

**The view** — "what is unpushed, what diverges, who touched what, across the
N repos" — is `MissionControlPage`, shipped
(`src/renderer/src/components/MissionControlPage.tsx:107`). It shows ahead /
behind / dirty / conflicted / stashes per repo, ranked by urgency
(`src/renderer/src/lib/missionControl.ts:21`). Its one real limitation is that
`behind` comes from local refs, so it is only as fresh as the last fetch — which
is exactly the C2 fix. **Fix C2 and Mission Control becomes the cross-repo
dashboard for free.**

**The signal.** Ranking the four options against the code:

| Signal | Verdict |
|---|---|
| **Run the existing radar per repo** | *Best value, and not on your list.* Zero new inference: each repo's own exact path comparison, surfaced together. It answers "backend has upstream commits touching files you have dirty **in backend**" — not the cross-boundary claim, but it is exact, free, and covers the common case where the person owning the contract is also editing the contract repo. |
| **Manual contract-file declaration** | Your intuition is right that it beats inference — but it needs somewhere to live, and **that is the expensive part, not the matching.** Local git config (`gitcito.*`, `src/main/git.ts:3864`) is per-clone and does not travel; a `.gitcito/` directory is a new versioned-config concept the app has never had, with a new file format, a new parser and a new trust boundary. **L, and the cost is entirely in the store, not the feature.** |
| **Submodules / subtrees** | Genuinely explicit and already read (`src/main/git.ts:5718`, `:387`). But a hackathon team with a backend and an app repo is not using submodules — that is a monorepo-adjacent choice made months earlier. High precision, near-zero recall for the stated scenario. |
| **Package names in manifests** | `parseManifest` (`src/shared/repoFacts.ts:253`) gives the dependency list cheaply, but the join fails on the target case: a 36-hour project's repos are not published to a registry under names that match each other. It works for a mature monorepo of published packages — the population that needs this least. |
| **Code scanning** | Out of scope for a git client, and it would need a language-aware parser per stack. No. |

**Recommendation: do the first row, drop the rest.** Contract declaration is a
reasonable v2 *if* a `.gitcito/` store ever earns its way in for another reason.
Building it to serve this one feature is paying L for a signal whose recall
depends on someone remembering to declare files during the one hour they are
least likely to.

### C5 — Auto-push WIP branches · **Do not build.**

The stated failure — "the laptop dies with good work on it" — is real, and
`git push` is a bad answer to it in this app for four reasons that are all
visible in the code:

1. **It fights an existing guard.** The push path warns before publishing
   credential-looking files (`src/renderer/src/stores/repo.ts:710`,
   `isSecretFile` at `src/shared/secretFiles.ts:22`) — a **confirmation dialog**,
   which by construction cannot exist on a silent timer. An auto-push either
   skips the guard (publishing `.env` to a shared remote) or blocks on a modal
   nobody is looking at.
2. **The heuristic is path-based only.** `isSecretFile` matches names; a key
   pasted into `config.ts` passes. That is fine for a warning a human reads and
   unacceptable as the sole gate on an automated publish.
3. **Remote litter.** Six people × 36 hours × a branch per local branch is a
   branch list nobody can read, on a repo the team keeps after the event. TTL,
   prune and cleanup-on-exit are all new work whose only purpose is undoing this
   feature's own mess.
4. **Snapshots already cover the likely failure.** Working tree, untracked
   included, pinned beyond `gc` (`src/main/git.ts:6602`), taken on a timer
   (`src/renderer/src/App.tsx:663`) and before every destructive op
   (`src/main/git.ts:834`). "I destroyed my work" — solved. "My disk died" — not,
   and that is a backup problem, not a git-client problem.

**If something ships here, ship the manual version:** a "push this snapshot as
`wip/<user>/<branch>`" action on an existing snapshot row, with the existing
confirm. One action, one string, no scheduler, no cleanup story. **S.**

### C6 — Ownership and freeze · **Reuse CODEOWNERS, but do not build this now.**

On the format question, **reuse the standard** — your bias is correct, and the
code agrees for a reason you may not have expected: nothing parses CODEOWNERS
today, so both options are greenfield, which removes the usual "we already have
a parser" argument for the bespoke format and leaves only the arguments for the
standard (already in many repos, already understood, already rendered by the
host, already versioned by git, no new trust boundary).

What a useful subset needs: last-match-wins ordering, gitignore-style globs,
`*` and directory patterns, and `@user` / `@org/team` owner tokens treated as
opaque labels. The precedence rule (last match wins, unlike gitignore's
first-match intuition) is the part people get wrong. When the file is absent:
show nothing — an ownership map with no owners is noise, not an empty state.
Generating one from `contributors` + hotspots (`src/main/git.ts:6300`, `:6387`)
is a defensible later addition, offered, never written unasked.

**Freeze mode is the weaker half.** Protected branches already cover the
destructive case (`src/main/git.ts:3864`, enforced at
`src/renderer/src/stores/repo.ts:697` and
`src/renderer/src/components/CommitComposer.tsx:756`). A path allow-list warning
during the last hours is a genuinely new behaviour, but it is a warning about a
policy the team agreed verbally, at the exact moment they are least willing to
read a dialog. **Assumption, not code-anchored: it gets dismissed.**

**M–L, low confidence, and it needs a session model to hang off. Defer.**

### C7 — Creation, templates, stack · **The three sub-questions, answered**

**a) Data or behaviour — data, and the code supports that.** Everything a
template would carry is already scalar or list-shaped: intervals
(`src/shared/types.ts:2622`, `:2640`), protected branches
(`src/main/git.ts:3864`), path lists, per-repo maps
(`src/shared/types.ts:2579`). Nothing in the existing settings model has
behaviour attached, and the one thing that looks like a preset — themes — is
pure data (`src/shared/types.ts:2829`). Keeping templates declarative is
realistic **and** it is the status quo; behaviour would be the new thing. If a
template ever needs a hook to be useful, that is the signal the feature is a
project generator, not a preset.

**b) Role level — per repo, and there is somewhere to put it.** Your intuition
holds. `AppSettings` has three precedents for exactly this shape:
`repoProfiles`, `repoAliases`, `repoLayouts` — all `Record<repoPath, …>`, all
carrying the same comment about why they are path-keyed rather than stored on
`RepoRef` (`src/shared/types.ts:2579`, `:2586`, `:2621`). A `repoRoles` map is a
fourth instance of an established pattern, **not** a model change.

The monorepo case falls out if the role key is a path rather than a repo: a role
attached to `<repo>/backend` and another to `<repo>/app` is the same mechanism.
Which argues for keying roles by *path prefix*, not by repo path — a small
generalisation that costs nothing now and avoids a migration later.

**c) Catalogue or detection — detection, and you are right about why.** The code
settles it:

- `parseManifest` (`src/shared/repoFacts.ts:253`) already reads eight formats
  and lives in `src/shared/`, callable from both processes today. Detection is
  not a new capability, it is a new caller.
- The maintenance argument is visible in the file: `repoFacts.ts` already
  carries a hand-curated `NOISE` list (`:266`) and an `IMPLIED` map (`:293`).
  That is the shape a curated catalogue takes after two years, and it is
  maintained by one person. Adding a second curated list — "Flutter defaults",
  "FastAPI defaults" — doubles that surface for strictly less value.
- Degradation matches your reading: an unknown stack proposes nothing and the
  user marks paths by hand; the feature is intact. A catalogue miss is a hole
  with an issue attached.
- Monorepos with several manifests are the one place detection is genuinely
  messy — the honest behaviour is *propose one candidate per manifest directory*
  and let the user delete rows.

**Where I would push back on your framing:** you ask what knowing the stack buys
and answer "which files are contracts and what the folders are called". Agreed —
and that is the argument for not detecting the stack **at all**, only the
manifest locations. "There is a `pubspec.yaml` here and a `pyproject.toml`
there" is enough to propose two roles and two path prefixes. Naming the stack
adds a label and a maintenance promise.

**Cost of C7 as a whole: M, and every bit of it is UI and documentation.** The
data model is free.

### C8 — Invitation · **Secure workspace bundles already are it. S to extend.**

Answering your three questions directly:

1. **Is secure share the mechanism?** Yes, precisely. It is portable
   (`src/shared/types.ts:1764`), group-aware (`:1773`), remote-matched not
   path-matched, and its import is **additive** — a new `Workspace` appended,
   nothing existing touched
   (`src/renderer/src/components/SecureWorkspaceModal.tsx:518`). Versioning is
   in the envelope (`src/shared/types.ts:1758`) with an explicit
   `unsupported-version` error (`src/shared/types.ts:1849`). A session payload
   would be one more section kind alongside `repo` / `vault` / `workspace` /
   `notes` (`src/shared/types.ts:1785`) — the union is designed for that.
2. **A URL scheme?** None exists — no protocol registration anywhere, and the
   `gitcito` CLI is a `/usr/local/bin` symlink (`src/main/cli.ts:13`), macOS-only
   and unrelated. **Do not add one for this.** A deep link that reconfigures the
   app is a click-to-configure surface reachable from any web page; the bundle
   is a file the user chose to open plus a password they typed out of band. The
   weaker mechanism is the safer one here.
3. **Late joiners and teardown.** Both are unsolved and both are cheap *given
   additive import*: re-import replaces nothing, so a late joiner takes the
   latest bundle and gets a second workspace — mildly confusing, not
   destructive. Teardown, if there is no auto-push and no freeze, is "delete the
   workspace", which already exists. **Both problems are only expensive if C5
   and C6 ship.** That is a good reason to not ship them.

### C9 — Optional AI · **Creation-side: M. Warning-side: M, and I would not.**

**In creation** — proposing owners and contract files from history. Evidence is
there (`contributors` at `src/main/git.ts:6300`; hotspots at `:6387`), the
propose-review-edit pattern is the house style, and being wrong costs one
deletion in a form. If C7 ships, this is a reasonable opt-in extra.

**In the warnings** — semantic collision. The mechanism is sound and reusable:
grounded evidence IDs (`src/main/grounding.ts:1`) mean a claim resolves to a
real hunk or is rejected, and `reviewPR` (`src/main/ai.ts:820`) is the template
including schema validation against an allow-list (`src/main/ai.ts:851`). Your
"second pass only after path overlap" constraint is right and matches how
`radarSweep` is already gated (`src/renderer/src/stores/repo.ts:1310`).

**And I still would not build it,** for a reason the code makes concrete. The
warning's whole value is arriving an hour early — and grounding, which is what
makes the output trustworthy, is *anchoring*, not *verification*. It guarantees
the finding points at a hunk that exists. It does not guarantee the hunk shows
the problem; the prompt has to *ask* the model not to guess
(`src/main/ai.ts:833`), which is exactly the guarantee you cannot get. A false
positive here does not waste a review slot as it does in `reviewPR` — it sends a
teammate to audit healthy code during the hour before a demo.

**How to measure the rate before shipping it, if it is ever attempted:** the
playground already generates deterministic repos with real conflicts
(`examples/scenarios/`, per `CLAUDE.md` §4). Build a fixture set of N cases
where a remote change does and does not semantically break the local diff, run
the pass over all of them, and require a false-positive rate low enough that the
maintainer would personally act on every alert. If that number cannot be
produced, the feature cannot be shipped — and producing it is itself a week.

### C10 — Native notifications · **S. The cheapest real win in the list.**

Already built at `src/renderer/src/App.tsx:647`: renderer `Notification`, gated
on `desktopNotifications`, primed so a backlog is not dumped, try/caught for
denied permission. A second call site in `radarSweep`
(`src/renderer/src/stores/repo.ts:1325`, where the toast fires today) reuses all
of it.

Grouping is already half-solved by design: the sweep emits **one** toast
summarising files and branches (`src/renderer/src/stores/repo.ts:1326`), not one
per collision, and the signature dedupe suppresses repeats (`:1318`). Six
notifications in a row is not a failure mode this code has.

Per-OS caveats: macOS asks once and remembers; Linux depends on the desktop
environment's notification daemon; Windows Action Center dedupes by app.
**Assumption, not code-anchored** — none of this is currently tested beyond
macOS.

### C11 — Motion theme · **L, and the clean separation you hoped for is not there.**

Checking your condition against the architecture, three problems:

1. **Motion is not a theme axis.** `AppTheme` is fifteen colours × two modes
   (`src/shared/types.ts:2811`, `:2829`). A motion setting is not a theme; it is
   a new orthogonal axis with its own persistence, its own UI, and its own
   interaction with the AI-generated themes.
2. **Motion is not a layer.** 24 renderer files import `framer-motion` directly
   and `styles.css` holds 10 `@keyframes`. "Celebration surfaces animate, work
   surfaces do not" is not a switch — it is an audit of every animated component
   plus a convention nothing enforces. In an app with an i18n *lint* and a docs
   *lint*, an unenforced convention is out of character and will drift.
3. **It collides with a documented promise.** `docs/help/accessibility.md`
   states reduced motion is honoured and animations collapse to instant
   transitions. The code has one `prefers-reduced-motion` rule
   (`src/renderer/src/styles.css:5969`) and no `MotionConfig` /
   `useReducedMotion` anywhere. Adding **continuous** motion on top of that
   makes an existing gap materially worse, on a page that explicitly invites
   bug reports.

**So the separation would be a hack, and the honest prerequisite is a real
reduced-motion pass** — a global `MotionConfig`, a token for animated CSS, and
the media query applied once at the root. That is worth doing on its own merits
and is not a hackathon feature. Do that first; then a motion theme is a
sensible, cheap follow-up. Doing it in the other order ships a photosensitivity
risk against a written accessibility commitment.

---

## 5. Phase 3 — risks

**Network and rate limits.** 60 s × 6 people × 36 h × R repos. For R=3 that is
~6 500 fetches per person, ~39 000 across the team. Against GitHub over HTTPS
that is well inside published limits for authenticated git operations
(**assumption — not verifiable from this repo**), but it is not free anywhere
else: every fetch on a PAT-authed HTTPS remote does two `git remote set-url`
writes (`src/main/git.ts:1221`, `:1226`), and a self-hosted Gitea or GitLab on a
conference network is a different question entirely. Stagger is not optional at
this cadence — six repos ticking on the same interval from six laptops is a
synchronised burst, and nothing in the current timers jitters
(`src/renderer/src/App.tsx:615`).

**Battery and CPU.** Each tick is `git fetch --all --prune`
(`src/main/git.ts:2690`) — process spawn, TLS handshake, ref negotiation, per
repo. Plus the radar sweep it triggers: one `for-each-ref`, then up to 30
`rev-list` + `diff --name-only` pairs (`src/main/git.ts:1730`, `:1733`), then a
batched merge-tree (`:1749`). Plus a 20 s light refresh that never stops
(`src/renderer/src/App.tsx:572`), plus the 30 s Mission Control refresh when
that page is open (`MissionControlPage.tsx:39`). Nothing pauses when the window
is hidden — there is a `visibilitychange` listener but it only triggers *extra*
refreshes (`src/renderer/src/App.tsx:558`). **Pausing timers on hidden is a
prerequisite for any cadence increase, and it is a win at the current cadence
too.**

**Auth prompts — the catastrophic one.** Without a stored PAT, `withRemoteAuth`
falls through to git's credential helper (`src/main/git.ts:1220`). A locked
keychain, an expired token or an SSH key with a passphrase and no agent turns a
60 s timer into a prompt every 60 seconds, on every machine, for the duration of
the event. Today's 5-minute default makes this annoying; 60 s makes it
unusable. **Any cadence change must ship with per-remote failure backoff and a
circuit breaker.** That is not a nice-to-have.

**Auto-push and secrets.** Covered in C5 — the guard is a confirm dialog
(`src/renderer/src/stores/repo.ts:713`) and the detector is name-based
(`src/shared/secretFiles.ts:22`). Neither survives automation. Also: snapshots
capture untracked files by design (`src/main/git.ts:6614`), so "push the
snapshot" would publish exactly the files `.gitignore` was protecting.

**Remote litter.** Not mitigable without building cleanup that only exists to
undo the feature. See C5.

**Alert fatigue.** Currently well handled — dirty-gate, signature dedupe,
one summary toast (`src/renderer/src/stores/repo.ts:1310`, `:1318`, `:1326`).
Raising fetch frequency 5× raises sweep frequency 5×, but the dedupe is keyed on
`ref@sha`, so a quiet repo stays quiet. **Folder-level thresholds (C3) would
break this;** cadence alone does not.

**AI cost and latency.** A semantic second pass firing on every path overlap
during a 36-hour event is an unbounded bill on the user's own key, with a
latency budget that cannot be met — the warning is worth having early, and a
provider round-trip lands after the fetch has already toasted. And the
false-positive cost is asymmetric, as argued in C9.

**Degradation without AI.** Clean. C1, C2, C3, C4-view, C8, C10 are all
AI-free; C9 is the only AI-dependent item and it is recommended against. No
proposed capability regresses without a key.

**Imported session files as attack surface.** Today's bundle is decrypted in
main and sanitised before the renderer sees it — file *lists*, never contents
(`src/shared/types.ts:1786`) — with `resolveInside` rejecting escapes
(`src/main/secureShare.ts:87`) and unsafe entries dropped on write (`:231`).
Vault secrets are opt-in per key at import
(`src/renderer/src/components/SecureWorkspaceModal.tsx:529`).

**What would need adding if a session section ever shipped:** intervals clamped
to a sane range on import rather than trusted; path patterns treated as match
patterns only, never as anything executed or resolved to disk; no field that can
name a remote, a command, a hook or a credential; and a refusal to import a
section kind the running version does not understand — which the envelope's
`unsupported-version` path already models (`src/shared/types.ts:1849`).
The rule to write down: **a shared preset may change what Gitcito shows, never
what Gitcito runs.**

**Scaffolding — where the product line is.** Distributing *Gitcito's own*
configuration is Gitcito's domain: it is app state, it round-trips through an
existing mechanism, and the blast radius is the app. Writing `CLAUDE.md`,
formatter configs or `.editorconfig` into the user's repository is a project
generator — a different product, with a different upgrade story and a different
set of opinions to defend. **The line: Gitcito writes files into a repo only
when the user asked for that specific file, in that specific place, and
confirmed it.** The one existing path that writes repo files from a
non-user-authored source is the repo-chat file action layer, and it is built
around exactly that — safe-path resolution
(`src/main/repoFileActions.ts:12`), secret-file awareness (`:11`), size caps
(`:14`), and a prepare-then-apply split. It could carry a scaffolding write, but
that it *could* is not an argument that it *should*.

**Maintenance for one person.** Every capability here is 18 dictionary edits, a
handbook page, a `scripts/docs-map.json` entry, a generated screenshot, and
tests. A "mode" is worse than the sum of its parts: it doubles the state space of
every surface it touches, and every future bug report arrives with an unstated
"…in hack mode" variant.

---

## 6. Phase 4 — alternatives

**1. Build the full mode with its own UI.** Rejected. Its two best capabilities
(C3, the multi-repo view) already exist outside any mode, and its distinctive
ones (C5, C6, C11) are the three with the worst risk-to-value ratio in the whole
list. A mode would mostly be a wrapper that makes shipped features conditional.

**2. Build no mode: fix the fetch defaults, keep the collision warning always
on.** **This wins.** The collision warning is already always on; the fetch
default is the actual bug. Every team benefits, including the team of one who
opens a group tab and expects the badges to be true. Nothing becomes
conditional, no new state space, and it is the only option that makes the
existing features *more* correct rather than adding to them.

**3. A preset of existing settings shipped via secure share, documentation
only.** A good complement to (2), not a substitute — with today's settings the
only knobs worth sharing are `autoFetchMinutes` and `wipSnapshotMinutes`, and
`AppSettings` has no "share these fields" path (the workspace section carries
tabs, `src/shared/types.ts:1801`, not preferences). Worth revisiting *after* (2),
when there is something worth putting in a preset.

**4. Nothing, recorded as out of scope.** The right outcome for C5, C6, C9's
warning half, C11, and cross-repo contract inference. Not the right outcome for
the fetch defect.

---

## 7. Phase 5 — verdict

**Do not build Team / Hack Mode. Build three small things that are not a mode,
and write the rest down as out of scope.**

The research changed my starting position twice. I expected the collision
warning to be the centrepiece and found it shipped, deduped and documented. I
expected the multi-repo dashboard to be the hard part and found it shipped too.
What is left, once those are removed, is a scheduling defect, a notification
call site, and a set of features whose costs are carried by one person forever.

### The MVP — one shippable piece

**"Auto-fetch follows the group, not the tab."**

1. Auto-fetch iterates the active tab's repos when that tab is a group, instead
   of only `activeRepoPath` — `src/renderer/src/App.tsx:613`, using a silent
   variant of `repoActions.batch` (`src/renderer/src/stores/repo.ts:1332`) that
   does not drive the global busy indicator or toast a summary.
2. Requests are staggered across repos, timers pause while the window is hidden,
   and a repo whose fetch fails backs off exponentially until it succeeds or the
   user acts. This is the part that makes any cadence safe, and it improves the
   current 5-minute default too.
3. The interval floor drops below a minute — a seconds-based field, migrated
   from `autoFetchMinutes` (`src/shared/types.ts:2622`), with the settings copy
   updated across 18 locales.

Because the radar sweep already runs after every successful fetch
(`src/renderer/src/stores/repo.ts:1302`), **this makes collision warnings
multi-repo and near-real-time without touching the radar at all** — and it makes
Mission Control's ahead/behind columns true instead of last-fetch-stale.

**Then, if that lands well, two follow-ups in order:**

- **Native notification for the radar overlap** — the second call site described
  in C10. Roughly a day, reusing `src/renderer/src/App.tsx:647` wholesale.
- **"Push this snapshot as a WIP branch"** as a manual action on a snapshot row,
  with the existing push confirm. Answers C5's real failure without a scheduler
  or a cleanup story.

### Explicitly out of scope

- **A session concept, roles, templates and a creation wizard** (C1, C7). The
  group tab is the session; a per-repo role map is a fourth
  `Record<repoPath, …>` whenever something actually needs it. Building the
  wizard before there is a consumer is building the form before the data.
- **Cross-repo contract inference** (C4's signal half). Per-repo radar covers
  the common case exactly; declared contract files need a versioned in-repo
  config store that does not exist and should not be introduced for one feature.
- **Automatic WIP pushing** (C5). It fights the secret guard, litters shared
  remotes, and answers a backup problem with a git command.
- **Ownership maps and freeze mode** (C6). If it ever ships, parse `CODEOWNERS`
  — but it needs a session to hang off and a reason that outlives the event.
- **AI semantic collision warnings** (C9's second half). The anchoring is
  reusable and the gating is right; the false-positive cost is asymmetric and
  unmeasured, and a late warning is not a warning.
- **A motion theme** (C11). Blocked behind a real `prefers-reduced-motion` pass
  that the handbook already promises and the code does not deliver — which is
  worth doing on its own, and is a bug, not a feature.

### If the answer is "build nothing at all"

Two paragraphs for `ROADMAP.md`:

> **Team / hackathon mode.** The coordination failures a 3–6 person sprint hits
> are real, but Gitcito already answers most of them without a mode: the
> teammate radar crosses incoming commits against your dirty files and warns
> before the conflict exists, Mission Control ranks every repo of a workspace by
> what needs you, and WIP snapshots keep uncommitted work recoverable. What was
> missing was not a feature but a default — background fetch covered only the
> visible tab, so the rest of a group went stale.
>
> The parts that would have made it a *mode* are the parts we do not want:
> auto-pushing WIP branches fights the secret guard and litters a shared remote,
> ownership freezes are a policy dialog nobody reads at 4am, AI-guessed
> "semantic collisions" send teammates to audit healthy code, and continuous
> motion contradicts an accessibility commitment the handbook already makes.
> Each one is perpetual upkeep — a handbook page, eighteen dictionaries, a
> screenshot and a test — carried by one maintainer for a use case that lasts a
> weekend.

---

## 8. Open questions

Answers needed before any implementation starts.

1. **Is "auto-fetch covers only the active tab" a bug or a decision?**
   Everything above rests on it being a bug. If it was a deliberate battery or
   rate-limit choice, the MVP becomes an opt-in setting instead of a fix, and
   the whole recommendation gets weaker.
2. **Seconds or a floor?** Migrating `autoFetchMinutes` to seconds touches the
   type, the settings UI and 18 locales. Would you rather keep minutes and allow
   a fractional value, keep minutes and add a separate "burst" toggle, or do the
   migration properly?
3. **Should hidden-window pausing ship as part of this, or separately?** It is
   a behaviour change for existing users (badges go stale while the window is in
   the background) and it is a prerequisite for any cadence increase.
4. **What is the tolerable false-positive rate for a radar notification?** A
   toast that is occasionally noise is fine; an OS notification that is
   occasionally noise gets the app's notifications switched off permanently.
   That number decides whether C10 ships as-is or needs a stricter gate.
5. **Does a `.gitcito/` versioned config directory have any other reason to
   exist?** If something else already wants it, declared contract files become
   cheap and C4's signal half is worth revisiting. If not, it stays rejected.
6. **Is the reduced-motion gap** (`docs/help/accessibility.md` versus one media
   query at `src/renderer/src/styles.css:5969`) **something you want fixed on
   its own?** It is a documented promise the code does not keep, independent of
   anything here.
7. **How much of this is for you, and how much is for users you have?** A mode
   that serves one team's next hackathon is a legitimate thing to build for
   yourself and a bad thing to ship to everyone. The recommendation above
   assumes the second. If it is the first, the answer changes — and it changes
   toward keeping it out of the app entirely.
