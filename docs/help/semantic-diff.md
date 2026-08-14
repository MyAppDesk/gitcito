---
title: Semantic diff
category: Reading changes
order: 21
summary: What changed, symbol by symbol — renames, signature changes, moves.
keywords: semantic diff ast tree-sitter rename signature moved symbols what changed
---

# Semantic diff

A pure rename shows up in a line diff as an entire file deleted and an entire
file added. That is technically true and completely useless.

Above every file diff, Gitcito shows a **What changed** strip: both versions of
the file are parsed with **tree-sitter** — real syntax trees, not regular
expressions — and their declarations are matched up.

![The what-changed strip: renames and signature changes, symbol by symbol](../screenshots/semantic-diff.webp)

| Verdict | Example |
|---|---|
| **Renamed** | `startServer` → `bootServer` |
| **Signature** | `open(path)` → `open(path, mode)` |
| **Added** / **Removed** | a new function; a deleted one |
| **Moved** | same code, 40 lines further down |
| **Changed** | same name and signature, different body |

Renames and signature changes sort first — they are what a reviewer must not
miss. Click a row to jump to that symbol in the diff.

## What it can parse

TypeScript, TSX, JavaScript, Python, Go, Rust, Java, C, C++, C#, Ruby, PHP,
Swift, Kotlin, Scala, Lua, Bash and Zig.

A file whose language has no grammar simply keeps its normal line diff — the
strip does not appear at all. Same for files over 400 KB.

## Honest limits

- A rename whose body also changed is reported as a rename **and** says so.
- Two one-line functions that happen to look alike are *not* paired: below a
  size threshold the match has to be near-exact, so you get a clean
  removed + added instead of a fictional rename.
- Symbols that only drift a few lines because something above them grew are not
  reported as "moved" — that would bury the real moves.

**See also:** [Diff viewer](diffs.md) · [What changed since](range-diff.md)
