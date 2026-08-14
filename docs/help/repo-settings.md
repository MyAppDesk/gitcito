---
title: Per-repository settings
category: Workspace tools
order: 94
summary: Protected branches, info, analytics, history and the operation log.
keywords: repo settings protected branches analytics operation log history info gear
---

# Per-repository settings

The gear next to the toolbar tools opens settings that belong to **this**
repository, not the app.

![Per-repository settings](../screenshots/repo-settings.webp)

| Tab | What it holds |
|---|---|
| **General** | Protected branches (a branch multi-select, stored in git config), signing |
| **Info** | Free-form notes and fields about this repository, kept locally |
| **Vault** | This repository's [vault](vault.md) entries |
| **Insights** | The [history dashboard](insights.md) |
| **Analytics** | What you have done in this repository, counted locally |
| **History** · **Logs** | The operation log: every git command Gitcito ran, with its output |

The operation log is the honest one: when something behaves oddly, it shows the
exact command and the exact error, so a bug report can carry facts rather than
adjectives.

**See also:** [Security & secrets](security.md) · [Insights](insights.md)
