---
title: Tags & releases
category: Sync & many repos
order: 53
summary: Lightweight, annotated or signed tags — local and remote.
keywords: tag tags annotated signed release push delete remote
---

# Tags & releases

Create a tag from any commit:

| Kind | When |
|---|---|
| **Lightweight** | A pointer. Fine for a personal marker |
| **Annotated** | Carries a message, an author and a date — what a release should be |
| **Signed** | Annotated, plus a GPG/SSH signature |

![Creating a tag: name, optional message, and whether to sign it](../screenshots/create-tag.webp)

Delete tags locally, push them, or delete them on the remote. Remote tags are
browsable without fetching them all first.

On GitHub, published **releases** are listed in the sidebar with a changelog
page — see [Hosting](hosting.md). To draft the notes, use the
[changelog generator](changelog.md).

**See also:** [Signed commits](signing.md) · [Changelog generator](changelog.md)
