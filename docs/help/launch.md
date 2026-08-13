---
title: Run & debug (launch.json)
category: Workspace tools
order: 91
summary: Run your VS Code launch configs without leaving Gitcito.
keywords: launch.json run debug vscode configs tasks preLaunchTask input background
---

# Run & debug

Gitcito reads your `.vscode/launch.json` — the root one and any nested ones,
grouped with dividers — and runs the config you pick in the integrated terminal.

![The launch picker and floating toolbar](../screenshots/launch-configs.png)

- VS Code **variables are resolved** (`${workspaceFolder}` and friends).
- A config's **`preLaunchTask`** runs first.
- **`${input:…}`** values are asked interactively before launching
  (`promptString` and `pickString`).
- **`isBackground`** tasks (watchers, dev servers) run detached, so they never
  block the launch.

A floating toolbar gives you **pause / resume, restart, stop**, and switches
between running sessions.

Turn it on in **Settings → General → Enable launch.json**. The **LAUNCH** button
appears next to the Git / Files tabs.

**See also:** [Integrated terminal](terminal.md)
