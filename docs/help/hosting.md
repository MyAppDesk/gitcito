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
chain in reading order — leaf first, down to the base — with a small arrow under
each one naming what it merges into, so the direction is on screen rather than
inferred from four base branches.

Two things put a group there: GitHub's own stack number, when the pull requests
belong to a [native stack](stacks.md), and otherwise the refs themselves — a
pull request whose base is another's head sits on it. The second rule is why
this also works on GitLab, Bitbucket and Azure DevOps, and for chains opened
before any of that existed.

![A stack in the pull request list](../screenshots/pr-stack-list.webp)

Each row carries the state of its head's **checks** — hover for the counts —
and, on GitHub, the levels that are already closed or merged, which a list of
open pull requests would otherwise hide. A level above a **closed** one is
marked blocked: its own checks may be green, but the branch it targets is never
going to land. The row's actions appear on hover, so the title keeps the width.

Reading the checks costs one request per pull request, and only when the list is
refreshed.

## Your pull requests on the parent of a fork

In a fork, the pull requests that matter are usually the ones you opened on the
repository you forked from, and those live there, not on your fork. So when a
repository has an `upstream` remote that points at a different GitHub repository
than `origin`, the list also asks `upstream` for its open pull requests and keeps
**only the ones whose branch comes from your fork**. They appear under a caption
naming the parent, **On owner/repo**, below your fork's own. A click opens the
same detail view, with its checks and review, on the parent.

![A fork's own pull request, then its pull requests on the parent under On example/pr-ready-branch](../screenshots/fork-upstream-prs.webp)

*Limits:* GitHub only, and only a remote named `upstream`. The parent's other
pull requests are left out on purpose: that is the parent's queue, not your
work. Stacks and branch lookups still act on `origin`'s list alone. Listing the
parent costs one more request per refresh.

## Reviewing — GitHub and GitLab

![Pull request page with conversation and reviewer sidebar](../screenshots/pull-request-page.webp)

Clicking a pull request opens it as a **page of its own**. It rides on its
repository like the wiki does: an icon with the PR number on the repository's
tab, or on its chip inside a group. Click the icon again, or the repository's
name, to go back. **Open in a new tab** in the PR's right-click menu gives it a
top-level tab instead. If the repository is not open anywhere, the PR opens in a
tab of its own.

The work happens in the main column, and the sidebar says what the PR *is*, so
you do not have to scroll through it.

The main column has three sections:

| Section | What it holds |
|---|---|
| **Conversation** | The description, comments and inline review threads (`file:line`, with replies). Then the comment box with comment / approve / request changes, and the merge box (merge, squash or rebase) |
| **Files** | Every changed file, and the selected one's diff beside the list, with syntax highlighting and word-level changes (secret-looking files masked when that setting is on). A ✓ "viewed" checklist remembers your progress. A file the host sends no diff for (a binary, or one too large) links to it on the host |
| **Checks** | CI check-runs (GitHub) or pipeline jobs (GitLab), with pass/fail/pending and links to the logs |

The sidebar shows:

| Row | Shows |
|---|---|
| **Author** | Who opened it, and when |
| **Status** | Open, draft, merged (by whom, when) or closed; conflicts with the target |
| **Reviewers** | Each reviewer's latest decision (approved, changes requested, commented) and who is still awaiting review, teams included |
| **Assignees, labels, milestone** | As set on the host, labels in their own colours |
| **Branches** | Source → target, and the fork it comes from |
| **Changes** | Files changed, commits, lines added and removed, with a bar |
| **Checks** | Passed / failing / running, a click away from the Checks section |
| **Participants** | Everyone who took part |
| **Activity** | When it was opened and last updated |

GitLab does not report line totals for a merge request; they are summed from
the file list once it loads. A row the host does not report is left out.

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

Each profile **links its own account**. In Settings → Integrations, **Sign in
with git** looks for a login already on the machine — git's credential helper,
then the **GitHub CLI**'s active account, then the helper's own sign-in window
— and ties that account to the profile. Nothing is shared implicitly: a new
profile starts disconnected, and an account another profile already linked is
refused. To link a second GitHub account, add it to gh (`gh auth login`), make
it active (`gh auth switch`) and sign in from the other profile — or paste that
account's token. Git never asks for a username and password on a terminal.

The page says whether the connection is the profile's token, its link to git's
helper or its link to the GitHub CLI, and **Disconnect** undoes it for this
profile only: a token is cleared (it stays valid on the host until you revoke
it there), a link is dropped (the login stays in gh or the helper).

The host's API — pull requests, issues, CI — and git's own fetch, pull and
push over https both use the profile's token or linked account. The credential
reaches git for that one command, scoped to the remote's host, and is never
written to `.git/config`. A profile with neither leaves git to its own
credential helper. Azure DevOps, GitLab and Bitbucket link through git's
credential helper — Git Credential Manager keeps several accounts per host — or
take a token per profile. A link names one account per provider, so
organizations that need different accounts take one profile each.

**See also:** [Stacked branches](stacks.md) · [AI features](ai.md)
