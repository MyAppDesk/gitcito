---
title: Diffs & previews
category: Reading changes
order: 20
summary: Split view, word-level highlighting, image diffs and file previews.
keywords: diff split side-by-side word level whitespace image diff preview markdown docx pdf
---

# Diffs & previews

## Reading a diff

| Toggle | What it does |
|---|---|
| **Unified ↔ split** | Side-by-side when you want to compare, stacked when you want to read |
| **Word-level** | Highlights just the changed tokens inside an edited line — red on the old, green on the new |
| **Ignore whitespace** | Hides reindentation so the real change surfaces |
| <kbd>⌘F</kbd> | Find inside the diff, with next/previous stepping |

![Split diff with word-level highlighting](../screenshots/split-diff.webp)

Above every diff sits the [semantic summary](semantic-diff.md) — what changed,
symbol by symbol, rather than line by line.

## Image diffs

Changed images get a real comparison: side by side, or a swipe handle to drag
between before and after.

![Image diff](../screenshots/image-diff.webp)

## Preview anything

The **Preview** mode renders the file instead of showing its source: Markdown,
Word (`.docx`), Excel (`.xlsx`), PDF, video, audio, images, and
syntax-highlighted code for everything else.

![Markdown preview](../screenshots/markdown-preview.webp)

## Files tab

The left sidebar's **Files** tab browses the working tree itself, with status
badges on folders (added / modified / deleted) that aggregate what is inside
them.

![The files tab with a preview](../screenshots/file-tree.webp)

![Folder badges totalling what changed inside each one](../screenshots/tree-badges.webp)

**See also:** [Semantic diff](semantic-diff.md) · [Staging](staging.md)
