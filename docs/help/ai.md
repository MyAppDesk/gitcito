---
title: AI features
category: AI
order: 80
summary: Optional, provider-agnostic, and grounded in your actual code.
keywords: ai openai anthropic ollama local llm commit message explain review wiki grounded
---

# AI features

Every AI feature is **optional** and off until you configure a provider.
Nothing is sent anywhere until you ask for something specific.

![AI settings](../screenshots/settings-ai.webp)

## Providers

Presets for **OpenAI, Anthropic, OpenRouter, Groq, Mistral and Ollama**
(entirely local), or any OpenAI-compatible endpoint. Models are fetched live,
and you can add custom instructions.

> Only OpenAI is properly battle-tested. The others use an OpenAI-compatible
> call shape and should work — but they are unverified.

## What it can do

| Feature | What you get |
|---|---|
| **Commit message** | Summary (and optional body) from your staged diff, in your chosen style |
| **Explain this file** | Plain-language explanation in a side panel — Normal, Concise, ELI5… even Pirate |
| **Hover to explain** | Hold <kbd>⇧</kbd> and point at an identifier for a one-line explanation, plus the lines it drew on |
| **Conflict resolution** | Proposes a merge into the editable output — never auto-applies |
| **PR review** | Summarises a diff and flags risks, each anchored to a real `path:line` |
| **PR description** · **branch names** | Drafted from the branch's commits and diff |
| **Themes** · **graph palettes** | Generated from a prompt |
| **Smart staging** | Suggestions for what belongs in this commit |
| **[Repository chat](repo-chat.md)** | Questions about this repository, answered from files and commits you can pin as context |

## Grounded, not guessing

The review sees the diff as **labelled hunks** and may only cite those labels;
Gitcito then resolves each label to a real file and line. A model that invents a
location is **rejected and asked again**, so findings always point at code that
exists.

Hover-to-explain reads only a numbered window around the token — in a diff, only
the hunks visible on screen — so when a definition lives elsewhere it says so
instead of inventing it. Answers are cached per file version.

[Repository chat](repo-chat.md) works the same way: it may cite only the
excerpts it was handed, and the two-pass request picks those from Git's own
tracked-file list rather than from anything the model writes.

**Masked secret files are never sent.** Neither are files the secret-masking
rules cover — including a file you pin to chat by hand, which is refused with a
reason rather than read.

**See also:** [Repository chat](repo-chat.md) · [Repo wiki](repo-wiki.md) ·
[Security & secrets](security.md)
