# Roadmap

What Gitcito might do next, and why. Nothing here is a promise — it is the
shortlist, kept honest about cost and about what each item actually buys.

Two sources feed it: gaps against other clients (GitKraken, Fork, Tower,
SourceTree, Sublime Merge), and **[Pro Git](https://git-scm.com/book/en/v2)** —
the parts of git the book teaches that Gitcito still has no answer for. The
second list is the more interesting one: those are capabilities git already has
and nobody surfaces.

Ideas are welcome as [issues](https://github.com/MyAppDesk/gitcito/issues).

---

## Near term

### GitLab merge requests — review, comment, merge
Gitcito creates MRs on GitLab, Bitbucket and Azure DevOps, but only **reviews and
merges** on GitHub. The app currently looks like it supports four hosts and then
stops at the interesting part; the README carries a warning about it, which is
the wrong place to solve the problem. Mostly a mirror of the existing GitHub
code against a different API shape.

### Windows code signing
The release workflow already builds and publishes Windows and Linux — unsigned.
An unsigned Windows build hits the SmartScreen wall on first run. The CI change
is about fifteen lines; the blocker is a certificate, and the only option that
buys immediate reputation for a project this size is Azure Trusted Signing.

### More locales
English and Spanish today. `/add-locale` scaffolds a new dictionary and the test
suite enforces key parity and placeholder consistency, so the mechanics are
solved — the work is translation quality, which needs a speaker, not a script.

### Issue trackers beyond GitHub
Branch-from-issue and smart commits against Jira or Linear. Both are what teams
actually run, and both mean another token and another API surface.

---

## From Pro Git: capabilities git has and Gitcito does not

### `.gitattributes`, with a UI — *[Pro Git 8.2](https://git-scm.com/book/en/v2/Customizing-Git-Git-Attributes)*
The highest-value item on this list, and the least known. Attributes let a
repository teach git how to handle its own files:

| Attribute | What it fixes |
|---|---|
| `diff=<driver>` | A readable diff for `.docx`, `.pdf`, images, binary formats |
| `filter=<clean/smudge>` | Content rewritten on the way in and out — keyword expansion, secret scrubbing |
| `merge=union` | Changelogs and lock files that should concatenate rather than conflict |
| `-merge` / `binary` | Files where a three-way merge is meaningless |
| `export-ignore` | Paths kept out of `git archive` |
| `eol` / `text` | Line-ending policy that travels with the repo instead of per machine |

Gitcito already previews Word, Excel and PDF. Wiring those previews in as diff
drivers would make the *history* of those files readable, not just the current
version.

### Repository maintenance — *[10.7](https://git-scm.com/book/en/v2/Git-Internals-Maintenance-and-Data-Recovery)*
`gc`, `repack`, `prune`, `count-objects`, `fsck`, and `git maintenance` on a
schedule. A panel that says *this repository is 2.1 GB, 1.4 GB of it is
unreachable, here is what reclaiming does* — the natural companion to
[removing a file from history](docs/help/history-purge.md), which today explains
that dropping a backup reclaims space without ever showing how much.

### `git bundle` — *[7.13](https://git-scm.com/book/en/v2/Git-Tools-Bundling)*
A whole repository, or a range of commits, as one file. The way to move work
across an air gap, onto a machine with no network, or into an email. Gitcito
already exports patches and encrypted secret bundles, so the shape is familiar.

### Automated bisect — *[7.10](https://git-scm.com/book/en/v2/Git-Tools-Debugging-with-Git)*
Guided bisect exists. `git bisect run <script>` is the version that finds the
bad commit while you make coffee, and it fits the app's existing
[run configurations](docs/help/launch.md): point bisect at a test command and
watch it walk the history.

### Advanced merge options — *[7.8](https://git-scm.com/book/en/v2/Git-Tools-Advanced-Merging)*
`-X ours` / `-X theirs`, `--ignore-space-change`, `-s subtree`, and reading a
conflict with `git log --merge` or `diff --base`. Right now a merge is a merge;
these are the switches that turn a painful one into a routine one.

### Object explorer — *[10.1–10.4](https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain)*
Blobs, trees, commits and refs, walkable. Pure inspection, no mutation — the
kind of thing that makes the model click for someone who has only ever used
porcelain. Gitcito already renders the graph; this is the layer beneath it.

### `git archive` — *[7.11](https://git-scm.com/book/en/v2/Git-Tools-Bundling)*
Export any tree as a zip or tarball, honouring `export-ignore`. Small, and the
answer to "send me the source at v2.1" without a clone.

### `git clean`, safely — *[2.4](https://git-scm.com/book/en/v2/Git-Basics-Undoing-Things)*
Discarding tracked changes is covered. Removing **untracked** files — with a dry
run first, and ignored files clearly separated — is not, and it is the operation
people run in a terminal and regret.

### Credential helpers — *[7.14](https://git-scm.com/book/en/v2/Git-Tools-Credential-Storage)*
Gitcito manages its own tokens in the OS keychain and, since v3.4, your
[SSH keys](docs/help/ssh-keys.md). Git's own `credential.helper` is a third
store that neither of those touches, and misconfiguring it is a common cause of
"why is it asking me again".

### `git replace` — *[10.6](https://git-scm.com/book/en/v2/Git-Internals-Replace)*
Graft a truncated history onto its archive without rewriting anything. Rare, but
the honest alternative to a purge when the goal is a smaller clone rather than a
removed secret.

---

## Bigger bets

### Team features without a backend
Gitcito has no server and intends to keep it that way, so the GitKraken-style
shared workspace is out. What is not out: **exporting** a workspace, a review, or
a set of repo notes as a file someone else imports — the
[secure share](docs/help/secure-share.md) model applied to more than secrets.

### An honest diff for binary formats
Semantic diff already parses eighteen languages with tree-sitter. Word, Excel and
PDF previews exist. The missing piece is *diffing* those formats rather than
showing two versions side by side — which is the `.gitattributes` item above,
seen from the other end.

### Accessibility pass
Keyboard reachability is good; screen-reader semantics have never been audited.
Worth doing properly once rather than badly forever.

---

## Deliberately not doing

- **Cloud workspaces, telemetry, shared team boards.** Gitcito has no backend
  and phones nothing home. That is a feature, and these would end it.
- **Hosting our own git implementation.** Gitcito drives the real `git`. A bug
  in git is a bug you can reproduce in a terminal, and that is worth more than
  any speed-up.
- **A plugin system**, until the core is finished. An extension API freezes
  internals that still need to move.

---

## How something gets here

Any of: it closes a gap another client has and users hit; the book teaches it and
git already does it; or it removes a reason to drop into a terminal. Cost and
limits get written down at the same time as the idea — a roadmap that only lists
upside is a wish list.
