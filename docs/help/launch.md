---
title: Run & debug (launch.json)
category: Workspace tools
order: 91
summary: Run your VS Code launch configs without leaving Gitcito.
keywords: launch.json run debug vscode configs tasks preLaunchTask input background compound compounds stopAll serverReadyAction parallel sessions
---

# Run & debug

Gitcito reads your `.vscode/launch.json` — the root one and any nested ones,
grouped with dividers — and runs the config you pick in the integrated terminal.

![The launch picker and floating toolbar](../screenshots/launch-configs.webp)

- VS Code **variables are resolved** (`${workspaceFolder}` and friends).
- A config's **`preLaunchTask`** runs first.
- **`${input:…}`** values are asked interactively before launching
  (`promptString` and `pickString`).
  A `pickString` shows its options as a real picker with the default
  preselected; a `promptString` marked `password` is masked.
- **`isBackground`** tasks (watchers, dev servers) run detached, so they never
  block the launch.
- **Compounds** run each member as its **own parallel session**, in one split
  terminal named after the compound — one pane per member, exactly like VS
  Code's debug sessions. With `stopAll: true`, stopping one member stops them
  all.
  Tasks that several members share run **once**, in their own pane, before
  the members start — a version-bump prompt asks once, not once per member.
  The pane closes itself on success and stays open on failure.
- **`serverReadyAction`** is honoured: when the session's output matches the
  configured pattern, the announced URL opens in your browser
  (`openExternally`; `debugWithChrome` / `debugWithEdge` also open the browser
  — Gitcito cannot attach a debugger to it).

![A compound running two parallel sessions](../screenshots/launch-compound.webp)

![The ${input} picker with a preselected default](../screenshots/launch-input.webp)

A floating toolbar gives you **pause / resume, restart, stop**, and switches
between running sessions. A compound member shows as *compound › member*, and
restarting one restarts just that member. If the toolbar sits on top of
something you need, drag it aside by its grip — the position is remembered,
and a double-click on the grip re-centres it.

What Gitcito deliberately does **not** do: it runs your programs in real
terminals, but it is not a debugger — no breakpoints, no variable inspection,
no Debug Adapter Protocol. Attach-only configs still work when they carry a
`preLaunchTask` (the task is the work); a pure attach has nothing to run.

Turn it on in **Settings → General → Enable launch.json**. The **LAUNCH** button
appears next to the Git / Files tabs.

**See also:** [Integrated terminal](terminal.md)
