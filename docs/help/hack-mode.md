---
title: Hack mode
category: Branching & surgery
order: 46
summary: A session for a hackathon, a war room or a sprint — faster fetching, cross-repo warnings, ownership hints and a countdown.
keywords: hack mode session hackathon war room sprint team event countdown freeze template anime motion contract codeowners wip branch invite share collision
---

# Hack mode

Three to six people, one codebase, thirty-six hours. What kills that team is
almost never git — it is coordination. Two people edit the same file and find
out six hours later. The backend changes a schema and the app finds out at the
demo. Nobody fetches often enough to see divergence while it is still cheap.

A session is Gitcito turned up for exactly that: it fetches faster, watches more
repositories, warns across repository boundaries, and puts a clock on the
screen. It ends and everything goes back to normal.

Open it with **Hack mode: session** in the command palette.

## Starting one

Pick a template, and change anything it filled in:

| Template | Runs for | Fetches every | Freeze | Look |
|----------|----------|---------------|--------|------|
| Hackathon, 36h | 36 hours | 45s | last 4 hours | anime |
| War room | 12 hours | 30s | off | calm |
| Two-week sprint | 14 days | 120s | off | off |

A template is a starting point and nothing more. Every value stays editable
while the session runs — being stuck with a preset chosen in the second minute
of an event is the failure the templates exist to avoid.

The session covers **the repositories you already have open**. There is no
separate "add repo" step, because a repository you have not opened is not one
you are about to work in all night.

## Roles and contract files

Gitcito reads each repository's manifests — `package.json`, `pubspec.yaml`,
`pyproject.toml`, `go.mod`, `Cargo.toml` and the rest — and proposes a name for
each part plus the files that look like an interface: an OpenAPI document, a
GraphQL schema, a lockfile.

**There is no catalogue of frameworks anywhere in this feature.** A curated list
ages, and being left off it is a hole. A detector is written once, and a stack it
does not recognise simply proposes nothing — you name the files yourself and
everything else works identically.

A monorepo produces several roles from one repository, one per directory with a
manifest. That is the whole monorepo story: roles hang off paths, not off
repositories.

With an AI provider configured, **Ask AI** sharpens the proposal using the
repository's own history — who has touched what, which files change most. It is
a proposal in a form you edit. Nothing is applied on its own, and everything
here works without it.

## What it actually watches

**Inside one repository**, the [teammate radar](teammate-radar.md) already
crosses incoming commits against your uncommitted files. A session does not
change that — it just runs it far more often, across every repository of the
event rather than the visible tab.

**Across repositories**, there is no exact signal, so the session uses the one
honest thing available: the contract files you declared. When someone pushes a
change to `openapi.yaml` in the backend and you have uncommitted work anywhere
else in the session, you hear about it.

Note what this deliberately does not do: it does not infer which repository
consumes which. Between repositories a guess dressed as a fact is worse than
telling four people that the schema moved.

**With AI enabled and the second pass turned on**, a path overlap that has
already been found can be handed to a model to ask whether the collision is
real — "Ana changed the signature of `fetchUser`, your local diff still calls it
with two arguments". It is never the first pass. It costs a call on your own
key, and a false alarm sends someone to audit healthy code, so it is off by
default.

## Ownership and the freeze

If a repository has a `CODEOWNERS`, files that belong to someone else get a
marker in the staging list. Gitcito reads the standard file rather than
inventing its own: it already exists, teams already know it, and git already
versions it. Set **your handle** in the session to switch this on; leave it
empty and the hint stays off.

For a repository without one, **Draft CODEOWNERS** writes a shallow first
version from commit history — one line per top-level directory. It is a starting
point a team edits, not a claim to have worked out who owns what, and it asks
before writing anything.

The **freeze** turns on in the last hours before the deadline and warns when a
commit touches anything outside its allow-list. It warns and never blocks: the
allow-list is something five people agreed in a hurry, and being wrong about it
should cost a dialog, not a commit.

## WIP branches

Optionally, the session pushes a snapshot of your working tree to
`wip/<you>/<branch>` every few minutes, so uncommitted work never lives on one
disk only. It force-pushes, because the branch is a moving mirror of one
person's working tree.

**It refuses whenever the snapshot holds credential-looking files.** The
interactive push guard is a confirmation dialog, and a dialog cannot gate
something that happens while nobody is looking — so this stops instead, and says
so. Commit or ignore the offending files and it resumes on its own.

Ending the session offers to delete those branches from the remote. Six people
leaving scratch refs on a shared repository is a mess somebody has to clean up
later.

## Inviting the others

There is no server, so an invitation is an artefact you hand over. **Share
session** writes a `.gitcito-session` file you pass by Slack, AirDrop or a USB
stick; the other four use **Join from a file**.

The file carries no absolute paths and no secrets. Repositories are matched on
the receiving machine by remote URL first and folder name second, so it works
whether people cloned over SSH or HTTPS and wherever they keep their code.
Anything it cannot match is reported rather than silently dropped.

An imported file is someone else's input, so it is validated and clamped before
anything is applied: intervals are bounded, patterns that try to escape the
repository are dropped, and nothing in it can name a remote, run a command or
touch a credential. **A shared preset may change what Gitcito shows, never what
Gitcito runs.**

## The look

`anime` gives you the banner, continuous motion and a burst when a push lands.
`calm` keeps the banner and the counters and drops the motion. `off` hides the
chrome entirely and keeps every behaviour.

Motion is confined to the banner and its bursts. **The diff, the staging list,
the conflict resolver and the commit graph never move** — at 4am those are
precision work, and a moving background is an obstacle rather than an
atmosphere. Your operating system's reduced-motion setting always wins, and
collapses `anime` to `calm` on its own.

## The limits, stated plainly

- **Cross-repo warnings only cover files you declared.** Nothing scans code, and
  nothing infers a dependency graph. If you do not declare a contract file, that
  boundary is silent.
- **Faster fetching costs battery and credentials.** Six people fetching every
  30 seconds for two days is real network traffic. Repositories are staggered, a
  failing one backs off, and one that keeps failing is parked entirely so a
  locked keychain cannot turn into a password prompt every half minute — but the
  cost does not disappear.
- **Ownership hints need a CODEOWNERS and a handle.** Without both, they are off.
- **The AI second pass can be wrong.** That is why it is opt-in, why it runs only
  after the exact comparison has already fired, and why the app tells you where
  it thinks the problem is instead of acting on it.
- **One session at a time.** A second event is a second session, not a second
  copy of this one.
- **Nothing leaves your machine.** No server, no telemetry. The session is a
  local setting that happens to be shareable as a file.
