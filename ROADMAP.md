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

### Stacked-PR autopilot — the merged-bottom cleanup
Submitting a stack as chained PRs shipped; what remains is the tail end of the
loop: when the bottom PR merges, automatically retarget its child to the trunk,
untrack the merged level, restack and update the remaining PRs. Today those are
three clicks; they should be zero.

---

## Bigger bets

### Edit any commit like a document
Click a commit anywhere in history, edit its files in place, and let Gitcito
rebase every descendant — with the conflict radar predicting the cascade
*before* anything moves. Interactive rebase already covers reordering and
squashing; this is the "fix the typo three weeks back" gesture no client has.
Honest limits: linear history first, merges in the cascade are a hard problem,
and rewritten history still means force-push rules apply.

### Local CI as an opt-in extension
Run the repo's GitHub Actions locally via [`act`](https://github.com/nektos/act)
and pin per-commit ✓/✗ onto the graph before anything is pushed. Deliberately
**not** built in: it drags Docker plus a runner image along, which is the
opposite of an app that ships as one binary. The shape is an optional
integration in settings — detect `act`, guide the install, stay silent unless
the user turns it on. Same pattern as diff converters: Gitcito orchestrates,
the tool does the work.

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
