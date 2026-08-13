---
title: Changelog generator
category: Working with changes
order: 34
summary: Turn conventional commits between two refs into a grouped changelog.
keywords: changelog release notes conventional commits generate CHANGELOG
---

# Changelog generator

Give it two refs — it defaults to **latest tag → HEAD** — and it turns the
commits between them into a changelog, grouped by Conventional Commit type.

![The changelog generator](../screenshots/changelog-gen.png)

- **Breaking changes** are surfaced first, whatever type they came from.
- Then Features, Fixes, Performance, and so on.
- Commits that follow no convention land under **Other** rather than being
  dropped — a changelog that silently loses commits is worse than a messy one.

Copy the result, or **prepend it straight to `CHANGELOG.md`**.

> Writing your messages in [Conventional style](committing.md) is what makes
> this useful. The generator is only as good as the subjects it reads.

**See also:** [Committing](committing.md) · [Hosting & pull requests](hosting.md)
