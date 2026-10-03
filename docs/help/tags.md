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

The native Rust preview puts tag creation in a **Create tag** disclosure, so
release annotation and signing fields stay out of the way until needed. It can
create lightweight and annotated tags. For an annotated tag, **Sign this tag
(GPG/SSH)** uses Git's configured signing format and key; signing errors stop
creation rather than falling back to an unsigned tag. Undo removes the new tag
only while its tag object is unchanged. Listed tags use selectable rows and an
action menu. **Verify signature** runs Git's verification command and shows its
signer output and exit result; unsigned tags report Git's reason for not
verifying them.
Native tag lists also support selecting several local tags for one confirmed
deletion. The dialog lists each tag and target; each removed tag gets its own
undo entry. Removing a tag removes its reference, not the commit object itself.

On GitHub, published **releases** are listed in the sidebar with a changelog
page — see [Hosting](hosting.md). To draft the notes, use the
[changelog generator](changelog.md).

**See also:** [Signed commits](signing.md) · [Changelog generator](changelog.md)
