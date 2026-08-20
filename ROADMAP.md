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

### Issue trackers beyond GitHub
Branch-from-issue and smart commits against Jira or Linear. Both are what teams
actually run, and both mean another token and another API surface.

---

## Bigger bets

### Shareable reviews
Workspace structure and commit notes now travel as
[secure share](docs/help/secure-share.md) bundles. The remaining piece of the
"team features without a backend" idea is a portable *review*: findings and
per-file progress anchored to a diff, exported as a file. Nothing review-shaped
persists in the app today — the file-viewed checklist lives in browser storage
and AI findings evaporate on close — so this is inventing a domain object, not
exporting an existing one. Worth doing only with a real design for anchoring
comments to commits that may move.

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
