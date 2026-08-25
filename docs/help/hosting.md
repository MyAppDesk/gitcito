---
title: Hosting & pull requests
category: Sync & many repos
order: 56
summary: Create PRs anywhere; review and merge them on GitHub and GitLab.
keywords: pull request PR merge request GitHub GitLab Bitbucket Azure DevOps review approve merge issues
---

# Hosting & pull requests

## Creating

Create a pull (or merge) request without leaving the app: branch dropdowns,
title and body prefilled from the branch's commits, a draft toggle, and — on
GitHub — reviewers, labels and assignees applied on create.

![Creating a pull request](../screenshots/create-pr.webp)

Works on **GitHub, GitLab, Bitbucket and Azure DevOps**. Open PRs/MRs for all
four are listed in the sidebar.

Start one from branch-compare, the graph, the `+` in the PR panel, or from an
issue (which fills in `Closes #N`).

## Stacks in the list

Pull requests that sit on each other collapse into one row with a stack icon,
the branch the chain lands on, and how many are in it. Expand it to see the
chain in reading order — leaf first, down to the base — instead of four peers
you have to reassemble from their base branches.

Two things put a group there: GitHub's own stack number, when the pull requests
belong to a [native stack](stacks.md), and otherwise the refs themselves — a
pull request whose base is another's head sits on it. The second rule is why
this also works on GitLab, Bitbucket and Azure DevOps, and for chains opened
before any of that existed.

## Reviewing — GitHub and GitLab

| | |
|---|---|
| **Conversation** | Comments and review state |
| **Checks** | CI check-runs (GitHub) or pipeline jobs (GitLab) with pass/fail/pending and view-logs links |
| **Files viewed** | A per-file ✓ checklist with progress |
| **Inline threads** | Line comments grouped by `file:line`, and replies |
| **Actions** | Comment, approve, request changes, and merge / squash |

If someone force-pushes mid-review, [what changed since](range-diff.md) shows
you exactly what moved.

GitLab differences, stated plainly: GitLab has no single "submit review" call,
so **approve** uses its approval endpoint and **request changes** removes your
approval and posts your comment. **Rebase-merge** is not offered — GitLab
decides merge-commit vs fast-forward from the project's settings, so the merge
menu shows merge and squash only. Inline threads show the file and line but not
the surrounding diff hunk, which GitLab's API does not return. Review/merge
works for projects on **gitlab.com**; self-hosted instances are not supported
yet. Bitbucket and Azure DevOps still open in the browser for review.

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
