---
title: Signed commits
category: Recovery & safety
order: 61
summary: GPG, SSH or X.509 signing, with a verification badge per commit.
keywords: sign signing gpg ssh x509 verified signature badge trust
---

# Signed commits

Turn signing on per repository (**Settings → repo gear**): GPG, SSH or X.509,
with the key you choose. Gitcito writes `commit.gpgsign`, `gpg.format` and
`user.signingkey` for that repository — the same config any other tool reads.

| | |
|---|---|
| ![Signature column, light](../screenshots/signed-commits-light.webp) | ![Signature column, dark](../screenshots/signed-commits-dark.webp) |

The graph gains a dedicated, reorderable **signature column**:

| Badge | Means |
|---|---|
| **Verified** | Good signature from a key git trusts |
| **Unverified** | Signed, but the key is unknown or unvalidated |
| **Expired** | The signature or its key has expired |
| *(nothing)* | Unsigned |

Tags can be signed too — see [Tags](tags.md).

**See also:** [Security & secrets](security.md)
