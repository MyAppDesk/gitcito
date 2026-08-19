# Repository Chat File Actions — Hybrid Agent Design

**Status:** Approved in chat on 2026-08-18
**Scope:** Repository chat, file mutations, context collection, action execution, and reporting

## Summary

Gitcito repository chat currently answers questions and can propose a bounded set of Git actions,
but it cannot edit repository files. When asked to change the license, the tested provider returned
an action-shaped JSON array inside Markdown. Gitcito rendered that payload as prose, made no file
change, and later Git operations had nothing to stage or commit.

This design adds a hybrid file-tool protocol:

- Claude-style exact edits for focused changes.
- Codex-style locally generated diffs for review.
- Explicit create, replace, and delete operations.
- Main-process validation, optimistic concurrency checks, and rollback.
- Existing Gitcito approval modes, with file changes auto-running only in `auto-all`.
- A bounded result loop that reports actual execution back to the model without allowing recursive
  action batches.

The model proposes intent. Gitcito remains the authority that validates paths, materializes changes,
computes diffs, asks for approval, writes files, runs Git, and reports outcomes.

## Goals

1. Let repository chat create, edit, replace, and delete safe text files inside the selected repo.
2. Support ordered plans such as edit files, stage them, then commit them.
3. Make repo-wide mechanical updates possible when matches span more than eight files.
4. Never execute action-shaped JSON that appears only in human-facing Markdown.
5. Prevent stale proposals, path traversal, symlink escape, secret writes, binary writes, and writes
   into Git internals.
6. Give the user a locally computed diff and precise partial-failure information.
7. Preserve compatibility with OpenAI-compatible providers that do not support native
   `json_schema` or the Responses API `apply_patch` tool.

## Non-goals

- General-purpose shell access from repository chat.
- An autonomous test or command execution agent.
- Editing arbitrary files outside the selected repository.
- Reading or deleting existing untracked files that repository chat did not receive as evidence.
- Automatically retrying a failed mutation with a second mutation batch.
- Replacing the existing Ask surface or broadening the Git action set.

## User-approved approval policy

The existing modes retain their meaning:

- `ask`: every proposal waits for the user.
- `auto-safe`: only reversible Git bookkeeping auto-runs. File mutations do not auto-run.
- `auto-all`: file creation, edits, replacement, deletion, staging, and commits auto-run.

Git-destructive actions always require explicit confirmation, regardless of mode. Within the current
chat action set, `discard` remains destructive. A file deletion is a normal file mutation for approval
purposes, as explicitly requested, but it still receives hash checks and batch rollback.

## Architecture

The feature follows the existing Electron boundaries:

```text
repoChat.ts
  selects evidence
  requests structured actions
  validates model semantics
  prepares hashes and diffs
        |
        v
RepoChatReply over IPC
        |
        v
RepoChatPanel / repoChatStore
  renders proposal and approval state
  triggers auto-run or user-approved execution
        |
        v
main-process file mutation service
  revalidates and applies one atomic file batch
        |
        v
existing Git APIs
  stage / commit / other Git actions in order
        |
        v
finalization request with actions disabled
```

Repository reads, filesystem writes, Git operations, provider calls, and sensitive validation remain
in the main process. The renderer only coordinates UI state through typed APIs.

## Action contracts

The existing `AskAction` remains the Git-only union used by the Ask feature. Repository chat receives
a broader union so the Ask prompt cannot accidentally start proposing file changes without file
evidence.

```ts
type RepoChatFileAction =
  | {
      type: 'edit_file'
      path: string
      oldText: string
      newText: string
      replaceAll?: boolean
      description: string
    }
  | {
      type: 'write_file'
      path: string
      content: string
      mode: 'create' | 'replace'
      description: string
    }
  | {
      type: 'delete_file'
      path: string
      description: string
    }

type RepoChatAction = AskAction | PreparedRepoChatFileAction
```

The model emits an unprepared main-process version of these actions. After validation, Gitcito adds
execution-owned fields that the model cannot choose:

```ts
type FileActionPreparation = {
  expectedHash: string | null
  expectedOccurrences?: number
  preview: string
}
```

`expectedHash` is `null` only for a target that must not exist. `preview` is a unified diff produced
from local before/after content. The renderer treats these fields as display and execution metadata,
not as user-editable input.

### Exact edits

`edit_file` searches the complete local file, not just the excerpt sent to the provider.

- Without `replaceAll`, `oldText` must occur exactly once.
- With `replaceAll`, it must occur at least once.
- Preparation records the exact occurrence count.
- Execution requires the count and file hash to remain unchanged.
- Empty `oldText`, no-op edits, and an unchanged final file are invalid.

### Whole-file writes

- `mode: 'create'` requires the path not to exist.
- `mode: 'replace'` requires the target to have been sent completely as repository evidence.
- A replace may be used for short files such as `LICENSE`; large or partially shown files must use
  exact edits.
- Existing mode bits are preserved on replacement; created files use ordinary non-executable file
  permissions.

### Deletes

- The path must identify an existing regular file supplied as repository evidence.
- Existing untracked files cannot be deleted because they are excluded from repository evidence.
- A file created earlier in the same file batch may be deleted, though a create/delete no-op plan is
  rejected during simulation.

## Ordered plan validation

File actions must form a prefix of the proposal. Git actions follow them:

```text
file actions -> stage/unstage -> commit or other existing Git actions
```

The validator simulates the path state in order. Paths created or changed by file actions become
eligible for later `stage`, `commit.files`, and `stash.files` entries. Existing Git action rules remain
unchanged for all other paths.

Limits keep model output and local work bounded:

- At most 48 file actions.
- At most 12 Git actions.
- At most 64 total actions.
- At most 512 KiB final content per file.
- At most 2 MiB final content across one file batch.

The current silent `slice(0, 12)` behavior is removed. Exceeding a limit becomes a validation error so
the provider can correct its answer instead of silently losing part of a repo-wide change.

## Context collection

The two-pass context strategy remains, but direct reads and search matches use separate limits:

1. The selector chooses up to eight paths for broad excerpts and up to five literal search terms.
2. Direct paths receive the existing larger windows.
3. Search results may contribute compact windows from up to 48 distinct files.
4. Packing takes one result per file before adding a second result from any file, favoring repository
   breadth for mechanical changes.
5. The existing 32,000-character outbound evidence budget remains authoritative.

All evidence retains source IDs, but action eligibility is based on every safe repository evidence
path, not only the at-most-12 sources the final prose chooses to cite. External attachments are never
eligible mutation targets.

Evidence records whether a file was supplied completely. That flag gates whole-file replacement and
is not controlled by the model.

The existing exclusions remain: unsafe paths, secret-looking files, ignored tracked files, generated
artifacts, binaries, and untracked files. Searches use only the allow-list derived from Git.

## Preventing action laundering

Only the top-level structured `actions` property is executable. The answer validator also inspects
human-facing `content` for:

- JSON code fences whose parsed value is an action or action array.
- A content body that is itself parseable action-shaped JSON.

An object is action-shaped only when it contains a recognized action `type` and the fields associated
with that type. Ordinary JSON examples that do not represent executable actions remain valid prose.

If action-shaped content is found outside `actions`, `chatCompleteJson` uses its existing one-time
correction retry with a specific error. If the corrected reply repeats the problem, Gitcito throws an
`InvalidAIResponse`; it does not render the payload as a successful answer.

## File preparation and security

A focused main-process module owns file-action preparation and application. Every target must pass:

1. `isSafeRepoPath` and normalized root containment.
2. Rejection of any `.git` path segment.
3. `lstat` checks that reject a symlink target or symlinked ancestor.
4. Secret-file detection.
5. Git ignore detection for existing or prospective targets.
6. Generated-path exclusion.
7. Regular-text-file and NUL checks for existing content.
8. Per-file and per-batch size limits.
9. Evidence and existence rules for the requested operation.

The complete file batch is simulated in memory first. Multiple exact edits to one file operate on the
result of the previous action. Preparation produces final content, original hashes, occurrence counts,
and per-action previews without changing disk state.

## Atomic file application

File actions execute as one main-process call exposed through the existing Git dispatcher as a write
method. Because it is absent from `READ_METHODS`, it takes the repository's exclusive lock.

Under that lock, the executor:

1. Revalidates every path, existence expectation, hash, and occurrence count.
2. Materializes all final files into temporary siblings.
3. Moves deletion targets to temporary backups.
4. Renames prepared files into place.
5. Removes backups only after the batch succeeds.
6. Restores original files and removes created files if any step fails.

Temporary names are random, cannot be model-selected, and are cleaned in success and rollback paths.
If rollback itself fails, the result names affected paths and uses `rollback_failed`; Gitcito never
claims the batch was reverted successfully.

The file batch is atomic from the action executor's perspective. Later Git actions are deliberately
sequential and may partially succeed. A commit-hook failure does not undo valid working-tree changes or
staging.

## Git execution and commit preflight

After a successful file batch, the existing action executor runs Git actions in order through the
existing APIs and repository store mutation wrapper.

Before `git commit`, the executor refreshes status and verifies that the index contains changes. If it
does not, execution returns `no_staged_changes` without invoking Git hooks. If a hook fails, the action
returns `hook_failed` with credential-redacted detail and preserves the current working tree and index.

Execution results include:

```ts
type RepoChatExecutionResult = {
  applied: number
  failedIndex?: number
  failedType?: RepoChatAction['type']
  error?: { code: RepoChatActionErrorCode; detail?: string; paths?: string[] }
  remaining: number
  actionResults: Array<{ index: number; type: RepoChatAction['type']; status: 'done' | 'failed' | 'skipped' }>
}
```

This replaces the current all-or-nothing UI assumption while preserving the first-failure stop rule.

## Error contract

The main process returns stable error codes and redacted details. Initial codes are:

- `unsafe_path`
- `git_internal_path`
- `symlink_path`
- `secret_file`
- `ignored_path`
- `generated_path`
- `binary_file`
- `file_too_large`
- `batch_too_large`
- `evidence_required`
- `incomplete_evidence`
- `not_found`
- `already_exists`
- `stale_file`
- `old_text_missing`
- `ambiguous_edit`
- `no_staged_changes`
- `hook_failed`
- `rollback_failed`
- `unknown`

The renderer maps codes to translation keys. Raw details may appear as a tooltip or diagnostic detail,
but user-facing primary text is always translated.

## Result loop

The proposal reply is the planning response. Once the user approves it, or `auto-all` starts it, the
renderer records the execution result on the proposal card.

For executed proposals, Gitcito makes one finalization request containing:

- The original user request.
- The proposed action descriptions.
- Machine-generated per-action results.
- Refreshed branch and working-tree status.

The finalization schema omits `actions`, and its system prompt forbids new mutations. It may summarize
success or explain a failure, but it cannot enter another edit loop. A failed finalization request does
not change the authoritative card result. Dismissed proposals do not trigger finalization.

Subsequent user turns retain a compact app note containing applied count, failed action, error code,
and remaining count.

## Renderer behavior

The existing proposal card gains:

- File-action badges for create, edit, replace, and delete.
- Repo-relative path and model description.
- A collapsed locally computed diff that can be expanded.
- Per-action state: pending, running, done, failed, or skipped.
- Partial-success summary and auto-run indicator.

`auto-safe` does not auto-run a plan containing any file action. `auto-all` auto-runs file actions and
non-destructive Git actions. The existing discard confirmation remains mandatory and names the files
that would be lost.

All new labels, errors, buttons, and accessibility text are added to every renderer locale.

## Documentation

Update:

- `docs/help/repo-chat.md` and its localized counterparts with file actions, approval behavior, diff
  previews, and safety restrictions.
- `docs/help/ai.md` where it describes repository-chat actions.
- `README.md` if its repository-chat feature line currently implies read-only or Git-only behavior.
- Documentation mappings only if a new surface requires one; the existing repository-chat page remains
  the canonical page.

No endpoint, API key, or provider-specific test credential is written to repository files.

## Testing strategy

Development is test-driven. Focused tests precede implementation for each layer.

### Pure validation tests

- File-action JSON schemas and semantic validation.
- Ordered path simulation and action limits.
- Exact edit occurrence rules and no-op rejection.
- Whole-file replacement requiring complete evidence.
- Action-shaped JSON laundering in fenced and full-body content.
- Approval classification for all three file actions.
- Error-code-to-translation-key coverage.

### Main-process file tests

Use temporary repositories and real files for:

- Create, exact edit, replace, delete, and multiple actions on one file.
- Paths outside the repo, `.git`, secret names, ignored paths, generated paths, binaries, and sizes.
- File and ancestor symlinks.
- Stale hashes and changed occurrence counts.
- Temporary-file cleanup and successful rollback after an injected failure.
- Mode preservation and parent-directory creation.

### Repository chat tests

- Search evidence from more than eight distinct files.
- Breadth-first packing of search matches.
- A localization-style change spanning at least 17 files.
- Mutation targets limited to repository evidence while create paths remain possible.
- Provider fallback without native `json_schema`.
- One correction retry followed by explicit failure.

### Executor and renderer tests

- File batch followed by stage and commit.
- Commit preflight with an empty index.
- Hook failure with file and stage results preserved.
- Partial action counts and remaining actions.
- `ask`, `auto-safe`, and `auto-all` behavior.
- Mandatory confirmation for destructive Git actions in `auto-all`.
- Finalization request with actions disabled and fallback when finalization fails.

### Validation gates

After restoring dependencies with the repository's configured Node environment, run:

```text
npm run typecheck
npm run lint:i18n
npm run lint:docs
npm test
npm run build
git diff --check
```

Gitcito is not launched during implementation validation, per the repository working agreement. A
headless provider compatibility probe may use the supplied endpoint and credential through ephemeral
environment variables; neither value is committed or logged.

## Acceptance criteria

The implementation is accepted when all of the following hold:

1. Asking repository chat to replace the project license produces validated file actions rather than
   action JSON inside Markdown.
2. The plan can replace `LICENSE`, update repo-wide references found across more than eight files,
   create a new file, delete an eligible tracked file, stage the results, and commit them.
3. `auto-all` performs those non-destructive actions without a click.
4. Destructive Git actions still require explicit confirmation.
5. Stale, unsafe, secret, binary, ignored, generated, and symlinked targets are refused before writes.
6. The card displays a Gitcito-computed diff and truthful per-action outcomes.
7. Empty commits are blocked before hooks run; real hook failures are reported as partial failures.
8. All translated UI, documentation, tests, typechecks, lints, and builds pass.
