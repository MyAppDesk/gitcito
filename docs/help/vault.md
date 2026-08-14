---
title: Vault
category: Security
order: 71
summary: A local, encrypted store for the secrets a repo needs — never committed.
keywords: vault secrets env keychain encrypted local per-repo global copy
---

# Vault

The `.env` values a project needs have to live somewhere. The vault is that
somewhere, without them ending up in the repository.

![The vault](../screenshots/vault.webp)

- **Encrypted at rest** with your OS keychain.
- **Two scopes**: entries attached to a repository, and a **global** set you can
  reference from anywhere.
- **Not a file, and nothing to do with your `.env`.** Entries are *associated*
  with a repository but never written into it, never committed, never pushed.
- **Nothing ever leaves your machine.** No sync, no cloud.

## Using it

Open with <kbd>⌘⇧V</kbd>, from the tools menu, from Settings, or the command
palette. Switch between any known repository, reveal or copy a value, or **Copy
as .env** a whole set straight to the clipboard.

## Moving it between machines

[Secure share](secure-share.md) can pack the vault into an encrypted bundle —
and only when you explicitly ask for secrets to be included.

**See also:** [Security & secrets](security.md) · [Secure share](secure-share.md)
