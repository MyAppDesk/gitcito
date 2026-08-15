---
title: Commit notes
category: Reading history
order: 26
summary: Attach text to a commit that is already pushed — without changing the commit.
keywords: notes git notes annotate comment commit refs/notes review ticket amend rewrite push notes fetch notes
---

# Commit notes

A commit message is written once and then frozen: changing it rewrites the
commit, gives it a new hash, and breaks everyone who already has the old one.
That is fine an hour after committing and impossible a week later.

`git notes` is the way out. A note is stored **beside** the commit, under
`refs/notes/commits`, and attaching one leaves the commit byte-for-byte
identical. So it works on history that is already published — which is exactly
when you most want to add something.

Typical use: the review that approved it, the ticket it closed, why it was
reverted, which release it shipped in.

## Writing one

Select a commit. Under the message there is a **Note** section: *Add a note*,
type, **Save note**. Multi-line is fine.

![Writing a note under a pushed commit's message, then saving it](../screenshots/clip-commit-note.webp)

Saving a note is an ordinary Gitcito action — it toasts, and **Undo** puts the
previous text back, including restoring a note you removed.

Clearing the text and saving removes the note; there is no such thing as an
empty note.

## Finding one

Notes are invisible in a normal log, which is the main reason people never
discover them. Gitcito marks a commit that carries one with a small note icon in
the graph's message column, so the annotation is findable without knowing it is
there.

From the command line, `git log --notes` prints them under each message.

## Sharing them

**This is the part that surprises everyone: a normal `git push` does not push
notes, and a normal `git fetch` does not fetch them.** They live outside
`refs/heads` and `refs/tags`, so the default refspecs skip them entirely. Notes
written on your laptop stay on your laptop until someone moves them explicitly.

Tools → **Note** → *Push notes* / *Fetch notes*, per remote. They run:

```sh
git push <remote> refs/notes/*
git fetch <remote> +refs/notes/*:refs/notes/*
```

Some hosts also need notes enabled or allowed on their side; a rejection there
is the host's policy, not a Gitcito limit.

## Limits

- **One notes ref.** Gitcito reads and writes the default
  `refs/notes/commits`. Custom namespaces (`git notes --ref=review`) are not
  exposed — a repository using them will not see those notes here.
- **No merge of diverging notes.** If two people annotate the same commit and
  both push, git refuses the second push. Resolving that means
  `git notes merge` in the [terminal](terminal.md).
- **Notes are not backed up by a purge backup** or by [snapshots](recovery.md).
  They are ordinary refs and survive normal operations, but a repository
  re-cloned from scratch starts without them.

See also: [Committing](committing.md) · [The commit graph](graph.md)
