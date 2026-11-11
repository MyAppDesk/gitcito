---
title: Profiles
category: Make it yours
order: 101
summary: Separate identities and tokens for work and everything else.
keywords: profile profiles identity git user email tokens accounts switch
---

# Profiles

A profile bundles a **Git identity** (name and email) with its **integration
tokens**. Switch profiles and both change together — commits are authored
correctly and API calls use the right account.

Useful when the same machine does work and personal repositories, or when you
have two GitHub accounts.

![A profile: git identity on one side, its integration tokens on the other](../screenshots/settings-profiles.webp)

## Each profile, its own accounts

Besides a token, a profile can **link** a login already on the machine — from
git's credential helper or the GitHub CLI — in Settings → Integrations. A link
belongs to one profile: a new profile starts disconnected, and an account
another profile already holds is refused, so two profiles can hold two GitHub
(or Azure DevOps) accounts side by side. See [Hosting](hosting.md#tokens).

## Per-repository binding

A repository can be **bound to a profile**, so a background fetch on it always
authenticates as the right account — even while you are looking at a repository
that belongs to the other one.

Tokens live in your [OS keychain](security.md), never in the settings file.

**See also:** [Security & secrets](security.md) · [Hosting](hosting.md)
