---
title: Secure share
category: Security
order: 72
summary: Move settings, vault entries or a whole workspace between machines.
keywords: secure share export import bundle encrypted settings workspace transfer machine
---

# Secure share

Getting a new machine set up usually means re-entering everything. Secure share
packs it into one encrypted bundle instead.

![Exporting one repository's settings as an encrypted bundle](../screenshots/secure-share.webp)

![The same export for a whole workspace](../screenshots/secure-workspace.webp)

## What can go in

| Section | Contents |
|---|---|
| **Settings** | Themes, layout, shortcuts, preferences |
| **Vault** | Global and per-repository secrets |
| **Repositories** | The repositories of a workspace, matched by remote or folder on import |

Secrets are only ever included when you **tick the box**. A bundle without that
tick contains no credentials at all.

## Importing

The import screen shows what is inside **before** applying anything, section by
section, and repositories are matched to what you already have — by remote URL
first, then by folder — so importing does not clone the world again.

**See also:** [Vault](vault.md) · [Security & secrets](security.md)
