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

### Running tests
A test panel that runs the project's suite and turns it into a tree — file,
suite, test — with a click from a failure to the line that failed. Every runner
worth targeting can emit machine-readable output (`vitest --reporter=json`,
`jest --json`, `flutter test --machine`, `go test -json`, `cargo nextest`,
junit-xml for the rest), so the work is the adapter table and the UI, not
parsing scrollback.

What would make it Gitcito's rather than an IDE's: running only the tests that
cover what you changed, before the commit, and hanging the verdict off the
commit the way local CI already does. The cost is honest — an adapter per
runner, and a promise to keep them working across runner versions.

### A real debugger
Breakpoints, stepping, variables. Doing it properly means a Debug Adapter
Protocol client — launch the adapter, capabilities, breakpoints, stack frames,
scopes, evaluate — plus an adapter per language (`dart debug_adapter`,
vscode-js-debug, debugpy, `dlv dap`, codelldb). It is the largest single item
on this list, and today the handbook says plainly that Gitcito is not a
debugger.

If it happens: one adapter first (Dart, because it ships with the SDK), with
the protocol layer written generic, and no second language until the first one
is genuinely pleasant.

### A device preview
For web, this is small: the dev server's URL is already detected for
`serverReadyAction`, so a preview pane is a webview pointed at it.

For mobile it is not. No API embeds an iOS Simulator or an Android emulator
window inside an Electron app. The alternatives are worse than they sound: a
screenshot mirror (`adb exec-out screencap`, `simctl io screenshot`) is laggy
and cannot be touched, and `scrcpy` is genuinely good but is its own window —
at best Gitcito could launch it, not contain it. A laggy mirror that looks like
a device but does not behave like one is not worth shipping.

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
