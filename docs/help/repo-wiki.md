---
title: Repo wiki (AI)
category: AI
order: 81
summary: A generated guide to a codebase where every claim cites a file.
keywords: wiki documentation generated codebase overview dependencies architecture export docs
---

# Repo wiki

Point it at a repository and it writes a short wiki explaining the codebase.

## The repo card

- **Language breakdown** by bytes.
- **The stack** — frameworks shown as badges (Next, Angular, Electron, Tailwind,
  Django…).
- **Dependencies** read straight from your manifests (`package.json`,
  `Cargo.toml`, `go.mod`, `pyproject.toml`, `pubspec.yaml`, `Gemfile`…) and
  grouped by architectural role. Scaffolding — type stubs, loaders, lint plugins
  — is filtered out first, and only packages the project really declares can
  appear.
- **A module dependency graph**, parsed from the source (JS/TS, Python, Go,
  Rust, Dart, Ruby, C/C++, PHP) and resolved against the repo's own files, so a
  package import never becomes a fake edge.

## The written pages

Gitcito plans a handful of pages from the files the repository tracks — docs and
manifests first, then whatever churns most — and writes each page from the files
it covers.

**Every statement cites the file it came from**, and a claim no file supports is
rejected rather than published. Pages are written in parallel and stored in one
go, so a failed run never replaces a good wiki. It tells you when the wiki was
written at an older commit.

## Export

**Export to docs/** writes the whole thing into `docs/wiki/` as linked Markdown —
so it can be committed, reviewed in a PR, and read on your host.

Secret-looking files are never sent.

**See also:** [AI features](ai.md)
