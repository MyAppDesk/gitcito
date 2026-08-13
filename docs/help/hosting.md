---
title: Hosting & pull requests
category: Sync & many repos
order: 56
summary: Create PRs anywhere; review and merge them on GitHub.
keywords: pull request PR merge request GitHub GitLab Bitbucket Azure DevOps review approve merge issues
---

# Hosting & pull requests

## Creating

Create a pull (or merge) request without leaving the app: branch dropdowns,
title and body prefilled from the branch's commits, a draft toggle, and — on
GitHub — reviewers, labels and assignees applied on create.

![Creating a pull request](../screenshots/create-pr.png)

Works on **GitHub, GitLab, Bitbucket and Azure DevOps**. Open PRs/MRs for all
four are listed in the sidebar.

Start one from branch-compare, the graph, the `+` in the PR panel, or from an
issue (which fills in `Closes #N`).

## Reviewing — GitHub

| | |
|---|---|
| **Conversation** | Comments and review state |
| **Checks** | CI check-runs with pass/fail/pending and view-logs links |
| **Files viewed** | A per-file ✓ checklist with progress |
| **Inline threads** | Line comments grouped by `file:line` with their diff hunk, and replies |
| **Actions** | Comment, approve, request changes, and merge / squash / rebase |

If someone force-pushes mid-review, [what changed since](range-diff.md) shows
you exactly what moved.

## Issues, milestones, releases — GitHub

Browse issues and open a full issue tab: body, comments, labels, assignees,
milestone, Projects v2 fields, close/reopen, and **create a branch for this
issue** (with AI naming). Milestones show progress and their issues. Releases
are browsable with a changelog page.

## Notifications — GitHub

Your whole inbox — review requests, mentions, CI activity — across every
repository, with unread/all filters and mark-as-read. The toolbar bell carries
an unread badge, and optional desktop notifications fire when a review is
requested or CI finishes.

## Tokens

Per-profile tokens for multiple accounts or orgs, stored with your OS keychain.
Gitcito can also borrow whatever your **git credential helper** already holds,
so an org you have already authenticated for often needs no setup at all. See
[Security & secrets](security.md).

**See also:** [Stacked branches](stacks.md) · [AI features](ai.md)
