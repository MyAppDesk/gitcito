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
you do not have to scroll through it. With AI on, the ✨ button in the header
reviews the PR's diff as the host reports it, so it works even for a branch you
have never fetched (a fork, someone else's).

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
the surrounding diff hunk, which GitLab's API does not return. Review and merge
work on gitlab.com and on a [self-managed GitLab](#self-managed-gitlab). Bitbucket
still opens in the browser for review.

Azure DevOps differences: approving casts your vote (*Approved*); **request
changes** votes *Waiting for author*. Completing the PR takes merge, squash or
rebase. Azure lists a PR's changed files but sends no diff, so the app fetches
both versions of each file and diffs them itself — for the first 200 files; a
binary file, or a change too large to diff here, links to the host. People show
as initials, because Azure's profile pictures need a signed-in browser.

## Self-managed GitLab

A company GitLab lives at its own address. Give a profile that address in
**Settings → Integrations → GitLab → GitLab address**, for example
`git.example.org` or `https://example.net/gitlab` for one served under a path.
From then on, remotes on that host are GitLab: merge requests list, open,
review and merge, the clone browser and *create repository* talk to it, and
push and fetch sign in with that profile's token.

**A GitLab token belongs to one instance.** A profile's token is sent only to
the address that profile names. If the address is empty, that means gitlab.com.
A gitlab.com token never reaches the company server, and a company token never
reaches gitlab.com. If the work and the personal account are on different
instances, give each its own profile. A repository bound to a profile uses that
profile's instance.

**Create token** opens the token page on your instance with `api` and
`write_repository` pre-selected. A read-only token connects fine and then fails
on the first push.

Limits:

- **https only.** A plain `http://` address is refused, because the token would
  cross the network in clear text.
- **One GitLab instance per profile.** Add a second profile for a second
  instance.
- Over ssh the host is matched, not the path, so two instances on one host under
  different paths cannot be told apart for an ssh remote.
- Remote avatars are drawn only for gitlab.com and github.com. A self-managed
  remote gets the plain icon, so its group names are never sent to a public
  host.

## Forgejo

Set the instance address before entering its token. Changing the address clears the previous sign-in.

![Forgejo integration settings](../screenshots/forgejo-integration.webp)

Forgejo, and Gitea, which shares its API, always runs at an address its owner
chose: your own server, or a public one such as codeberg.org. Give a profile
that address in **Settings → Integrations → Forgejo**, together with an access
token. **Create token** opens the token page on that server. Give the token
read and write permission on *repository*, *issue* and *notification*, and
read permission on *user* and *organization*. A token's permissions cannot be
changed later: one made without *issue* or *notification* lists no issues or
notifications, and a new token is the fix.

From then on, remotes on that server are Forgejo:

| Works | How |
|-------|-----|
| Push and fetch | Signed in with the profile's token |
| Open pull requests | Listed in the sidebar, and open in the [pull request page](#reviewing--github-and-gitlab): conversation, each file's diff, checks (commit statuses, including Forgejo Actions), comment, approve, request changes, and merge / squash / rebase |
| Create a pull request | From the app; a draft is marked with the `WIP:` prefix Forgejo uses |
| Clone browser, create repository | Against that server, under your account or an organization |

Just like GitLab tokens, **a Forgejo token only goes to the server that issued
it**. A profile without a Forgejo address has no Forgejo credential at all.
There is no default server to fall back to.

Limits:

- Line-comment threads are shown but cannot be replied to from the app:
  Forgejo has no API for a reply inside an existing thread. Reply on the server.
- https only, one Forgejo server per profile.
- Lists stop after twenty requests: 1,000 pull requests or repositories at the
  server's default page size.

## Issues, milestones, releases — GitHub and Forgejo

Browse issues and open a full issue tab: body, comments, labels, assignees,
milestone, Projects v2 fields, close/reopen, and **create a branch for this
issue** (with AI naming). Milestones show progress and their issues. Releases
are browsable with a changelog page.

On a [Forgejo](#forgejo) server the same lists and pages work, with the
profile's Forgejo token. Two things are GitHub's alone and stay empty there:
Projects v2 fields, and the pull requests linked to an issue. Releases list the
most recent ones, not the whole history.

## Waiting for your review

In the sidebar's pull request list, a 👁 marks the PRs where **you** are a
reviewer who has not answered yet — on GitHub, GitLab and Forgejo alike. Who
"you" are is asked of the host with the profile's credential and remembered for
ten minutes. A token that cannot read its own user (no `read:user` on Forgejo,
for example) marks nothing.

With **Settings → Desktop notifications** on, a GitLab or Forgejo pull request
that *starts* waiting for you raises one; clicking it opens the PR page. The
first look at a repository only takes note of what is already waiting, so
opening the app does not replay a backlog. GitHub's review requests are left to
its notifications inbox, below, which already announces them.

## Notifications — GitHub and Forgejo

Your whole inbox — review requests, mentions, CI activity — across every
repository, with unread/all filters and mark-as-read. The toolbar bell carries
an unread badge, and optional desktop notifications fire when a review is
requested or CI finishes.

If the active profile has a Forgejo server, its notifications join the same
list, newest first, and are marked read on that server. Forgejo does not say
*why* you were notified, so those rows carry no reason, and they never raise a
desktop notification — that is decided by the reason.

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
