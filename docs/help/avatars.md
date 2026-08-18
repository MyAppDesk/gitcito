---
title: Author avatars
category: Make it yours
order: 103
summary: Gravatar photos where they exist, a generated blob avatar where they do not — and a title-bar face that reacts to the repository.
keywords: avatar avatars gravatar blobatar author photo picture identicon face offline privacy email hash mood expression animation motion sad mad happy
---

# Author avatars

A commit list is a wall of names, and names are slow to scan. A picture next to
each one turns "who wrote this" into something you answer by glance rather than
by reading. Gitcito puts one on every author it shows: in the graph's author
column, in commit details next to the author and each co-author, in the
co-author picker while you compose, in the profile switcher, and beside each
profile in Settings.

## Where the picture comes from

Two sources, tried in that order:

| Source | When it is used |
|---|---|
| **Gravatar** | The commit email has a Gravatar account. Fetched over HTTPS, keyed on a SHA-256 hash of the lowercased email. |
| **Generated avatar** | Everything else — no Gravatar, no network, or the lookup turned off. Drawn locally from the email, never fetched. |

The generated avatar is a small creature, not a coloured square: the same email
always produces the same shape and the same colours, so an author stays
recognisable across repositories and across restarts. Two different emails
effectively never collide. It is drawn by
[blobatar](https://github.com/Alain00/blobatar) (MIT), and it needs no network
at all — a repository full of authors nobody has a Gravatar for still gets a
full set of distinguishable faces, offline, on first paint.

Because the seed is the **commit email**, an author who commits under two
addresses gets two avatars. That is deliberate — it is the same signal the
graph's author column gives you, and it is usually how you notice a machine
account or a misconfigured `user.email`. Fix it with
[author attributes](attributes.md) if the two addresses really are one person.

## The face in the title bar

The avatar next to your profile name is the one avatar in Gitcito that stands for
**you, in this repository, right now** — so it is the only one that reacts to the
repository's state. It holds one of four faces:

| Face | When |
|---|---|
| 😠 Cross | Files are left conflicted. |
| 🙁 Glum | 10 or more commits waiting to push, 25 or more behind the remote, or 25 or more uncommitted changes. |
| 🙂 Content | Nothing local, nothing waiting, and an upstream to be in sync with. |
| 😐 Neutral | Ordinary work in progress — and before the first status has been read. |

![The title-bar avatar wearing its cross face](../screenshots/avatar-mood.webp)

Worst wins: a repository with conflicts *and* forty unpushed commits is cross,
not glum. Hover the avatar and the tooltip says which count caused the face —
a picture that changes for an unstated reason is a puzzle, not a signal.

The thresholds are deliberately high. A face that turns glum at one unpushed
commit is glum permanently, and a permanent signal is one you learn to stop
reading. A branch with no upstream stays neutral rather than content: "in sync"
is not a claim that can be made about a branch nobody has pushed.

**This is decoration, not instrumentation.** The status bar carries the real
counts, and it is the thing to trust. The face only ever says *something is up*
at a glance, and it says it in four steps.

### Motion

The title-bar avatar breathes and blinks on its own. Turn it off at
**Settings → Themes → Graph → Animate the profile avatar** — the expression
still follows the repository, it just stops moving. Motion is also skipped
automatically when your system asks for reduced motion.

Only this one avatar animates. An animated avatar has to be drawn as live SVG
rather than a cached image, which is fine for one and wasteful for the several
hundred a scrolling graph draws.

## Turning the lookup off

**Settings → Themes → Graph → Show avatars.**

Off means:

- no request to `gravatar.com`, ever — not deferred, not cached-and-retried;
- avatars still appear, all of them generated locally.

So this is a privacy switch, not a "hide the pictures" switch. There is no
setting that removes avatars entirely.

## The limits

- **A Gravatar lookup tells gravatar.com that this email was looked at.** The
  hash is not a secret: anyone holding a candidate email can hash it and compare.
  If a repository's author list is something you would rather not hand to a third
  party, turn the lookup off before you open it.
- **Only Gravatar.** Avatars you uploaded to GitHub, GitLab or Bitbucket are not
  read — those need an authenticated host API call per author, which is a lot of
  network for a decoration.
- **No overrides.** You cannot pin a chosen picture to an author, and you cannot
  swap the generated style. The avatar is a function of the email and nothing
  else.
- **A Gravatar photo has no expression.** If your profile email has one, the
  title bar shows the photo and no face — a photograph cannot pull a face at you.
  Turn the lookup off if you would rather have the expressive blob.
- **The face follows the active repository only.** On a tab that is not a
  repository there is nothing to react to, so it stays neutral.
- **Four faces, not a dashboard.** There is no face for "rebase in progress",
  "detached HEAD" or "stashes piling up": four poses is the whole vocabulary, and
  spending them on finer distinctions would make every reading unreliable.
- **Small is small.** In the graph's author column the avatar is 16px, which
  carries colour and silhouette but not detail. Commit details draws the author
  at 38px, which is where you actually see the face.

**See also:** [Themes & appearance](themes.md) · [The commit graph](graph.md) ·
[Author attributes](attributes.md) · [Profiles](profiles.md)
