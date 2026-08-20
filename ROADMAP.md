# Roadmap

What Gitcito might do next, and why. Nothing here is a promise — it is the
shortlist, kept honest about cost and about what each item actually buys.

Two sources feed it: gaps against other clients (GitKraken, Fork, Tower,
SourceTree, Sublime Merge), and **[Pro Git](https://git-scm.com/book/en/v2)** —
the parts of git the book teaches that no client surfaces. Shipped items leave
this file; what is here is what is not built yet.

Ideas are welcome as [issues](https://github.com/MyAppDesk/gitcito/issues).

---

## Near term

### Windows code signing
The release workflow already builds and publishes Windows and Linux — unsigned.
An unsigned Windows build hits the SmartScreen wall on first run. The CI change
is about fifteen lines; the blocker is a certificate, and the only option that
buys immediate reputation for a project this size is Azure Trusted Signing.

### Clean/smudge filters, configured rather than hand-written
The [attributes UI](docs/help/attributes.md) writes `filter=<name>` rules but
will not configure the commands behind them. A filter runs on **every checkout
of every matching file**, and a wrong one corrupts a working tree quietly. Doing
it properly means a dry run against real files and a way back — a feature of its
own, not a text box.

### Diff converters Gitcito supplies itself
Diff drivers work, but only with a converter already on your PATH — `pandoc`,
`pdftotext`, `jq`. Gitcito already parses `.docx`, `.xlsx` and PDF for its
previews; exposing that as a `textconv` git can call would make those diffs work
with nothing installed. The work is a stable CLI entry point, not the parsing.

### Issue trackers beyond GitHub
Branch-from-issue and smart commits against Jira or Linear. Both are what teams
actually run, and both mean another token and another API surface.

---

## Bigger bets

### Commit editing across merges
Editing a commit in place shipped for linear history. The hard half remains:
a cascade that has to replay **merge commits** (re-merge with the rewritten
parent, carry conflict resolutions via rerere). Until then, a merge between the
commit and HEAD simply disables the feature.

### Local CI — run against a chosen commit or range
Verdicts now pin to commits (clean-tree runs mark their HEAD ✓/✗ on the graph
via git notes). What remains is running CI against a commit you *aren't* on:
a temporary worktree checkout per run, and a "test this range" sweep that walks
several commits. Real runtime cost per commit — worth building only with an
explicit budget in the UI, not as an invisible loop.

### Team features without a backend
Gitcito has no server and intends to keep it that way, so the GitKraken-style
shared workspace is out. What is not out: **exporting** a workspace, a review, or
a set of repo notes as a file someone else imports — the
[secure share](docs/help/secure-share.md) model applied to more than secrets.

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
