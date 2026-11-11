---
title: Committing
category: Working with changes
order: 31
summary: Message styles, templates, co-authors and the linter.
keywords: commit message composer conventional gitmoji ticket amend template co-author linter undo reset
---

# Committing

## Message styles

Pick one in Settings; the composer adapts to it.

| Style | Looks like |
|---|---|
| **Conventional** | `feat(api)!: add rate limiting` — with a type dropdown |
| **Gitmoji** | `✨ add rate limiting` — with an emoji picker |
| **Gitmoji + Conventional** | `✨ feat(api): add rate limiting` — emoji picker *and* type dropdown |
| **Ticket** | `ABC-123: add rate limiting` — seeded from the branch name |
| **Plain** · **Auto** | Whatever you type; Auto lets the AI decide the shape |
| **Caveman** · **Haiku** | Exactly what they sound like |

![Composer prefilled from a commit template](../screenshots/commit-template.webp)

### Gitmoji

[Gitmoji](https://gitmoji.dev) puts an emoji in front of the subject so a
history reads at a glance — 🐛 fixes, ✨ features, 🔥 removals. With either
gitmoji style, the emoji button sits right beside the subject field: it opens
**all 75 official gitmoji**, searchable by emoji, by `:code:` (what gitmoji-cli
users type) or by meaning in your own language.

**Gitmoji + Conventional** keeps the type and the emoji in step. Pick a type
and its emoji follows; change the type and it changes too — unless you chose
the emoji yourself (🚑️ on a `fix`, say), which is never overwritten.

| Type | Emoji | Type | Emoji |
|---|---|---|---|
| `feat` | ✨ | `test` | ✅ |
| `fix` | 🐛 | `build` | 📦️ |
| `docs` | 📝 | `ci` | 👷 |
| `style` | 🎨 | `chore` | 🔧 |
| `refactor` | ♻️ | `revert` | ⏪️ |
| `perf` | ⚡️ | | |

The AI writes in the same shape, and if a model forgets the emoji or answers
with a `:shortcode:`, the subject is corrected before it reaches the field.

Commits written by other tools as `:sparkles: add login` are **shown** as
`✨ add login` in the graph, the commit details and the history views.

Limits:

- The picker always writes the **unicode** emoji, never a `:shortcode:`.
- Shortcodes are converted for display only. The commit itself is not
  rewritten, and searching the history matches the text as it was committed.
- Only gitmoji count: a subject that starts with any other emoji is left alone.
- A repository whose `commit-msg` hook runs commitlint with the stock
  Conventional preset rejects a leading emoji. That is the hook's rule, not
  Gitcito's — configure commitlint for gitmoji or use plain Conventional there.

## Things the composer does for you

- <kbd>↑</kbd> <kbd>↓</kbd> recalls your **recent messages**.
- A **co-author picker** adds `Co-authored-by:` trailers from the repository's
  own contributors.
- `commit.template` / `.gitmessage` **prefills** the message, comment lines
  stripped.
- During a merge, cherry-pick or revert, the message is **pre-filled** the way
  git would.
- Drafts **persist** per repository, so switching tabs never loses a message.

## The linter

A live, non-blocking check: subject length (with a character counter), a
trailing period, a non-imperative or lowercase subject, over-wide body lines.
Hints, never a gate — it will not stop you committing.

## Amend

Amend rewrites the last commit with whatever is staged. Gitcito shows you the
existing message first so you are editing, not retyping.

**Amend Commit…** on a graph row does the same thing for HEAD: it loads the
full message, switches the composer into amend mode, and focuses it. A HEAD
that was already pushed can still be amended, but Gitcito warns that updating
the remote will take a force push.

**Undo Commit…** is the sibling for an unpushed HEAD: mixed reset to the
parent, working-tree changes kept, message restored to the composer. The
initial commit has a dedicated path that leaves an unborn branch instead of
destroying the files.

**See also:** [Staging](staging.md) · [Absorb](absorb.md) · [Changelog generator](changelog.md)
