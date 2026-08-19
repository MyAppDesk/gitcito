---
title: Local CI
category: Sync & many repos
order: 58
summary: Run the repo's GitHub Actions locally with act — before anything is pushed.
keywords: local ci act actions workflow runner docker pipeline test before push nektos
---

# Local CI

The push–wait–red-cross–fix–push loop wastes ten minutes per round trip. With
[act](https://nektosact.com) the same workflows run in Docker containers on
your machine, and Gitcito drives them: pick a workflow, press Run, watch the
same log CI would print — before anything leaves your machine.

![Local CI](../screenshots/local-ci.webp)

## An integration, not a bundled runtime

Gitcito deliberately does **not** ship act or Docker — an app that drags a
container runtime along is the opposite of a git client. This is an opt-in
integration: enable it in **Settings → Integrations** (or in the dialog
itself), and Gitcito detects what is installed and guides you through the rest
— `brew install act`, a running Docker daemon, done. Nothing runs until all
three are true: enabled, act installed, Docker reachable.

## What it does

- Lists every workflow under `.github/workflows`, by its `name:`.
- **Run** executes the workflow with act against your **working tree** — your
  uncommitted changes included, which is exactly the point: test before you
  commit, not after you push.
- Output streams live into the dialog; **Stop** kills the run. Exit 0 shows
  **Passed**, anything else **Failed** with the code.

## Limits

- act is a very good imitation of GitHub's runners, not a perfect one: actions
  that need GitHub-hosted services, secrets, or exotic runner images may behave
  differently. A local green is strong evidence, not a guarantee.
- One run at a time per repository; starting another cancels the first.
- Workflow-level runs only — picking individual jobs, matrices or events is
  act territory; run it in the [terminal](terminal.md) when you need flags.
- First run downloads runner images — expect it to be slow once.

**See also:** [Hosting & pull requests](hosting.md) · [Terminal](terminal.md)
