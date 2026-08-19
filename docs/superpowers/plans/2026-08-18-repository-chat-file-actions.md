# Repository Chat File Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Gitcito repository chat safely create, edit, replace, and delete repository files, then run ordered Git actions with truthful previews and results.

**Architecture:** Keep model output provider-portable by using structured exact-edit, whole-file-write, and delete actions. The main process expands repository evidence, validates and prepares all file changes, computes local unified diffs, applies file batches under the repository write lock, and reports stable results through the existing renderer approval lifecycle. A final model call receives execution results with actions disabled.

**Tech Stack:** Electron, TypeScript, React, Zustand, Vitest, simple-git, Node.js filesystem APIs, existing OpenAI-compatible AI transport.

**Spec:** `docs/superpowers/specs/2026-08-18-repository-chat-file-actions-design.md`

## Global Constraints

- File actions are `edit_file`, `write_file`, and `delete_file`; repository chat receives them, while the existing Ask planner remains Git-only.
- `auto-safe` never auto-runs file mutations; `auto-all` does. Destructive Git actions always confirm.
- Existing or replacement targets must be grounded in repository evidence. External attachments are never writable.
- Maximums are 48 file actions, 12 Git actions, 64 total actions, 512 KiB final content per file, and 2 MiB per file batch.
- Direct context remains eight paths and five searches; search evidence may span 48 distinct files under the existing 32,000-character budget.
- Repository files, Git, provider calls, path validation, and mutation execution remain in the main process.
- Do not add shell access to repository chat and do not execute action-shaped content from Markdown.
- Reject `.git/**`, secret-looking, ignored, generated, binary, oversized, stale, and symlinked targets.
- Every user-visible renderer string must use translation keys present in all 16 locale dictionaries.
- Do not launch Gitcito. Validate with typecheck, i18n/docs lint, tests, build, and `git diff --check`.
- Do not store the supplied endpoint or credential in repository files or command output.
- The repository says to commit only when explicitly asked. Each task includes a conditional commit checkpoint; skip `git commit` until that authorization exists.

## File map

### New files

- `src/main/repoFileActions.ts` — validate, prepare, preview, revalidate, and atomically apply file-action batches.
- `test/repoFileActions.test.ts` — real-filesystem coverage for preparation, security, stale detection, and rollback.
- `test/aiJson.test.ts` — provider-independent tests for synchronous/asynchronous JSON validation and correction inputs.
- `test/repoChatLive.test.ts` — opt-in headless compatibility probe configured only through environment variables.

### Existing files to modify

- `src/shared/types.ts` — raw/prepared file actions, repository-chat action union, execution result, and error codes.
- `src/main/aiSchemas.ts` — separate Git-only and repository-chat action schemas.
- `src/main/ai.ts` — await synchronous or asynchronous JSON validators.
- `src/main/grounding.ts` — ordered repository-chat action validation while preserving Ask validation.
- `src/main/repoChat.ts` — broad search evidence, complete-file tracking, action laundering rejection, file preparation, and finalization handler.
- `src/main/git.ts` — one write-locked `applyRepoFileActions` service method.
- `src/preload/index.ts`, `src/renderer/src/env.d.ts`, `src/renderer/src/infrastructure/api.ts` — typed finalization API; the generic Git IPC already carries file application.
- `src/renderer/src/lib/askActions.ts` — file-action safety, detail, and destructive classification.
- `src/renderer/src/lib/askActionRun.ts` — file-prefix batching, commit preflight, stable errors, and partial results.
- `src/renderer/src/lib/askActionMeta.ts` — file-action icons and labels without broadening the Ask planner.
- `src/renderer/src/lib/repoChatStore.ts` — execution result storage, finalization, and model-facing outcome notes.
- `src/renderer/src/stores/chat.ts` — construct the store with both proposal and finalization requests.
- `src/renderer/src/components/RepoChatPanel.tsx` — previews, per-action outcomes, auto-run, and finalization trigger.
- `src/renderer/src/styles.css` — collapsed diff and action-state styling.
- `src/renderer/src/i18n/{en,ar,de,es,fr,he,it,ja,ko,nl,pl,pt-BR,ru,tr,uk,zh-CN}.ts` — action labels and result/error copy.
- `test/chatActions.test.ts` — schema, safety, executor, store, and finalization behavior.
- `test/repoChat.test.ts` — search breadth, complete evidence, and laundering regression coverage.
- `docs/help/repo-chat.md` plus `docs/help/{ar,de,es,fr,he,it,ja,ko,nl,pl,pt-BR,ru,tr,uk,zh-CN}/repo-chat.md` — feature and safety documentation.
- `docs/help/ai.md`, `README.md` — change repository-chat wording from Git-only proposals to file and Git actions.

---

### Task 1: Shared file-action contracts and schemas

**Files:**
- Modify: `src/shared/types.ts:1020-1100`
- Modify: `src/shared/types.ts:1270-1290`
- Modify: `src/main/aiSchemas.ts:110-145`
- Modify: `src/main/grounding.ts:340-410`
- Test: `test/chatActions.test.ts`

**Interfaces:**
- Consumes: existing `AskAction`, `RepoChatReply`, `isSafeRepoPath`, and `validateAskActions`.
- Produces: `RepoChatFileAction`, `PreparedRepoChatFileAction`, `RepoChatAction`, `RepoChatActionErrorCode`, `RepoFileBatchResult`, `RepoChatExecutionResult`, `REPO_CHAT_ACTIONS_SCHEMA`, and `validateRepoChatActions(value, context)`.

- [ ] **Step 1: Write failing contract and validation tests**

Add imports for the new types/schema/validator and these cases to `test/chatActions.test.ts`:

```ts
const editFile = {
  type: 'edit_file',
  path: 'LICENSE',
  oldText: 'MIT License',
  newText: 'Apache License',
  description: 'Replace the license heading'
} as const

const actionContext = {
  workingTreePaths: new Set(['dirty.ts']),
  evidencePaths: new Set(['LICENSE']),
  completePaths: new Set(['LICENSE'])
}

it('validates grounded file actions followed by Git actions', () => {
  const actions = [editFile, { type: 'stage', files: ['LICENSE'], description: 'Stage LICENSE' }]
  expect(validateRepoChatActions(actions, actionContext)).toEqual([])
})

it('keeps replacement grounded and file actions before Git actions', () => {
  const ungrounded = [{ type: 'delete_file', path: 'ghost.ts', description: 'Delete it' }]
  expect(validateRepoChatActions(ungrounded, actionContext).join(' ')).toContain('evidence')

  const late = [{ type: 'stage', files: ['dirty.ts'], description: 'Stage' }, editFile]
  expect(validateRepoChatActions(late, actionContext).join(' ')).toContain('before Git actions')

  const incomplete = [{
    type: 'write_file', path: 'LICENSE', content: 'Apache', mode: 'replace', description: 'Replace'
  }]
  expect(
    validateRepoChatActions(incomplete, { ...actionContext, completePaths: new Set() }).join(' ')
  ).toContain('complete evidence')
})

it('rejects plans over the file, Git, and total action limits', () => {
  const files = Array.from({ length: 49 }, (_, i) => ({
    type: 'write_file' as const,
    path: `new-${i}.txt`,
    content: 'x',
    mode: 'create' as const,
    description: 'Create file'
  }))
  expect(validateRepoChatActions(files, actionContext).join(' ')).toContain('48 file actions')
})
```

- [ ] **Step 2: Run the focused test and confirm the new API is missing**

Run:

```bash
npm test -- test/chatActions.test.ts
```

Expected: FAIL because `RepoChatFileAction`, `REPO_CHAT_ACTIONS_SCHEMA`, or `validateRepoChatActions` is not exported.

- [ ] **Step 3: Add the shared types**

Add these shapes near `AskAction` and change `RepoChatReply.actions` to `RepoChatAction[]`:

```ts
export type RepoChatFileAction =
  | { type: 'edit_file'; path: string; oldText: string; newText: string; replaceAll?: boolean; description: string }
  | { type: 'write_file'; path: string; content: string; mode: 'create' | 'replace'; description: string }
  | { type: 'delete_file'; path: string; description: string }

export type PreparedRepoChatFileAction = RepoChatFileAction & {
  expectedHash: string | null
  expectedOccurrences?: number
  preview: string
}

export type RepoChatAction = AskAction | PreparedRepoChatFileAction

export type RepoChatActionErrorCode =
  | 'unsafe_path' | 'git_internal_path' | 'symlink_path' | 'secret_file'
  | 'ignored_path' | 'generated_path' | 'binary_file' | 'file_too_large'
  | 'batch_too_large' | 'evidence_required' | 'incomplete_evidence'
  | 'not_found' | 'already_exists' | 'stale_file' | 'old_text_missing'
  | 'ambiguous_edit' | 'no_staged_changes' | 'hook_failed'
  | 'rollback_failed' | 'unknown'

export type RepoFileBatchResult =
  | { ok: true; applied: number }
  | { ok: false; error: { code: RepoChatActionErrorCode; detail?: string; paths?: string[] } }

export interface RepoChatExecutionResult {
  applied: number
  failedIndex?: number
  failedType?: RepoChatAction['type']
  error?: { code: RepoChatActionErrorCode; detail?: string; paths?: string[] }
  remaining: number
  actionResults: Array<{
    index: number
    type: RepoChatAction['type']
    status: 'done' | 'failed' | 'skipped'
  }>
}
```

- [ ] **Step 4: Separate Git-only and chat action schemas**

Extract the current item object as `ASK_ACTION_SCHEMA`, retain `ASK_ACTIONS_SCHEMA`, and add:

```ts
export const REPO_CHAT_ACTIONS_SCHEMA: Record<string, unknown> = {
  type: 'array',
  maxItems: 64,
  items: {
    anyOf: [
      ASK_ACTION_SCHEMA,
      {
        type: 'object',
        required: ['type', 'path', 'oldText', 'newText', 'description'],
        properties: {
          type: { const: 'edit_file' }, path: { type: 'string' },
          oldText: { type: 'string' }, newText: { type: 'string' },
          replaceAll: { type: 'boolean' }, description: { type: 'string' }
        }
      },
      {
        type: 'object',
        required: ['type', 'path', 'content', 'mode', 'description'],
        properties: {
          type: { const: 'write_file' }, path: { type: 'string' }, content: { type: 'string' },
          mode: { type: 'string', enum: ['create', 'replace'] }, description: { type: 'string' }
        }
      },
      {
        type: 'object',
        required: ['type', 'path', 'description'],
        properties: {
          type: { const: 'delete_file' }, path: { type: 'string' }, description: { type: 'string' }
        }
      }
    ]
  }
}
```

Keep strict provider mode disabled for this union-shaped schema.

- [ ] **Step 5: Implement ordered semantic validation**

Add an exported context type and validator in `grounding.ts`:

```ts
export interface RepoChatActionContext {
  workingTreePaths: Set<string>
  evidencePaths: Set<string>
  completePaths: Set<string>
}

export function validateRepoChatActions(value: unknown, context: RepoChatActionContext): string[]
```

The implementation must count each action family, require a non-empty description, validate each
file-action field, enforce a file-action prefix, reject replace/delete/edit outside `evidencePaths`,
require `completePaths` for `write_file` replacement, and extend later Git path validation with file
outputs produced earlier in the plan. Delegate each Git-only sub-list to the existing
`validateAskActions` so Ask behavior does not drift.

Change `validateChatAnswer` to accept `RepoChatActionContext | null` instead of a path set and delegate
its optional `actions` field to `validateRepoChatActions`. Existing tests that disable proposals pass
`null`; Git-only tests construct the three-set context.

- [ ] **Step 6: Run the focused tests and typecheck**

Run:

```bash
npm test -- test/chatActions.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Conditional checkpoint**

If commits have been explicitly authorized:

```bash
git add src/shared/types.ts src/main/aiSchemas.ts src/main/grounding.ts test/chatActions.test.ts
git commit -m "feat: define repository chat file actions"
```

Otherwise run `git diff --check` and leave the task changes uncommitted.

---

### Task 2: Async JSON validation, broad search evidence, and laundering rejection

**Files:**
- Create: `test/aiJson.test.ts`
- Modify: `src/main/ai.ts:190-295`
- Modify: `src/main/repoChat.ts:20-540`
- Modify: `test/repoChat.test.ts`
- Modify: `test/chatActions.test.ts`

**Interfaces:**
- Consumes: `JsonSpec`, `RepoChatEvidence`, `validateRepoChatActions`, and `REPO_CHAT_ACTIONS_SCHEMA`.
- Produces: async-capable `JsonSpec.validate`, `validateJsonReply(text, spec)`, `selectSearchEvidence(hits)`, complete-evidence metadata, and `contentContainsActionPayload(content)`.

- [ ] **Step 1: Write failing tests for async validators**

Create `test/aiJson.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validateJsonReply } from '../src/main/ai'

describe('AI JSON validation', () => {
  it('awaits an asynchronous semantic validator', async () => {
    const result = await validateJsonReply<{ value: string }>('{"value":"x"}', {
      name: 'async_test',
      schema: { type: 'object' },
      validate: async (value) =>
        (value as { value?: string }).value === 'x' ? [] : ['value must be x']
    })
    expect(result).toEqual({ value: { value: 'x' }, errors: [] })
  })

  it('returns parse errors without invoking semantic validation', async () => {
    let called = false
    const result = await validateJsonReply('not json', {
      name: 'parse_test', schema: {}, validate: () => { called = true; return [] }
    })
    expect(called).toBe(false)
    expect(result.errors[0]).toContain('not valid JSON')
  })
})
```

- [ ] **Step 2: Write failing search-breadth and laundering tests**

Add to `test/repoChat.test.ts`:

```ts
it('keeps compact search evidence from more than eight files', () => {
  const hits = Array.from({ length: 17 }, (_, i) => ({ file: `src/i18n/l${i}.ts`, line: i + 1, text: 'MIT' }))
  const selected = selectSearchEvidence(hits)
  expect(new Set(selected.map((hit) => hit.file))).toHaveLength(17)
})

it('packs one match per file before second matches', () => {
  const hits = [
    { file: 'a.ts', line: 1, text: 'MIT' }, { file: 'a.ts', line: 20, text: 'MIT' },
    { file: 'b.ts', line: 2, text: 'MIT' }
  ]
  expect(selectSearchEvidence(hits).map((hit) => `${hit.file}:${hit.line}`)).toEqual([
    'a.ts:1', 'b.ts:2', 'a.ts:20'
  ])
})

it('detects executable action JSON hidden in answer content', () => {
  expect(contentContainsActionPayload('```json\n[{"type":"stage","files":["a.ts"]}]\n```')).toBe(true)
  expect(contentContainsActionPayload('Example: {"kind":"stage"}')).toBe(false)
})
```

Add to `test/chatActions.test.ts` a `validateChatAnswer` assertion that action-shaped content without
top-level actions produces an error containing `actions field`.

- [ ] **Step 3: Run the new tests and verify the helpers are absent**

Run:

```bash
npm test -- test/aiJson.test.ts test/repoChat.test.ts test/chatActions.test.ts
```

Expected: FAIL on missing exports and current eight-path truncation behavior.

- [ ] **Step 4: Make JSON validation awaitable**

Change `JsonSpec.validate` to:

```ts
validate: (value: unknown) => string[] | Promise<string[]>
```

Export a provider-independent helper:

```ts
export async function validateJsonReply<T>(
  text: string,
  spec: JsonSpec
): Promise<{ value: T | null; errors: string[] }> {
  const value = parseLooseJson<T>(text)
  if (value === null) {
    return { value: null, errors: ['The reply was not valid JSON. Return a single JSON object and nothing else.'] }
  }
  return { value, errors: await spec.validate(value) }
}
```

Use it for both the first reply and the existing correction retry in `chatCompleteJson`.

- [ ] **Step 5: Separate direct paths from search-hit breadth**

Add:

```ts
export const REPO_CHAT_MAX_SEARCH_PATHS = 48

export function selectSearchEvidence<T extends { file: string }>(hits: T[]): T[]
```

Group hits by first-seen file, keep at most 48 files, then emit round zero for every file before round
one. In `collectEvidence`, retain the selector's up-to-eight direct paths and append every distinct
selected search path instead of slicing the combined list to eight. Keep at most two windows per
search file and let `packRepoChatEvidence` enforce the final character budget.

Set `complete: content.length <= MAX_FILE_CHARS` only for a whole first-window read. Search windows,
diff hunks, and clipped evidence are incomplete. Preserve `complete` internally but omit it when
mapping evidence to public `RepoChatSource`.

- [ ] **Step 6: Reject action laundering**

Add:

```ts
export function contentContainsActionPayload(content: string): boolean
```

Parse JSON fences and a body that is entirely JSON. Return true only for an object with a recognized
action `type` or an array containing such objects. In `validateChatAnswer`, add a validation error when
this helper returns true. This ensures the existing correction retry runs and the second failure throws
`InvalidAIResponse`.

- [ ] **Step 7: Use the repository-chat action schema and limits**

Change `chatAnswerSchema(true)` to use `REPO_CHAT_ACTIONS_SCHEMA`; update `RawChatAnswer.actions` to the
raw repository-chat union and remove the final `slice(0, 12)`. Validation, not truncation, must enforce
limits.

- [ ] **Step 8: Run focused tests and typecheck**

Run:

```bash
npm test -- test/aiJson.test.ts test/repoChat.test.ts test/chatActions.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 9: Conditional checkpoint**

If commits have been explicitly authorized:

```bash
git add src/main/ai.ts src/main/repoChat.ts test/aiJson.test.ts test/repoChat.test.ts test/chatActions.test.ts
git commit -m "fix: broaden and validate repository chat actions"
```

Otherwise run `git diff --check` and leave the task changes uncommitted.

---

### Task 3: Prepare and preview safe file mutations

**Files:**
- Create: `src/main/repoFileActions.ts`
- Create: `test/repoFileActions.test.ts`
- Modify: `src/main/repoChat.ts`

**Interfaces:**
- Consumes: `RepoChatFileAction`, `PreparedRepoChatFileAction`, `RepoChatActionErrorCode`, `isSafeRepoPath`, `isSecretFile`.
- Produces: `RepoFileActionError`, `RepoFileActionContext`, `prepareRepoFileActions(repoPath, actions, context)`, and `isGeneratedRepoPath(path)`.

- [ ] **Step 1: Write failing preparation tests against real temporary files**

Create `test/repoFileActions.test.ts` with per-test temporary directories and cleanup:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { prepareRepoFileActions, RepoFileActionError } from '../src/main/repoFileActions'

const roots: string[] = []
const root = (): string => {
  const value = mkdtempSync(join(tmpdir(), 'gitcito-file-actions-'))
  roots.push(value)
  return value
}
afterEach(() => roots.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })))

it('prepares an exact edit with a local preview and hash', async () => {
  const repo = root()
  writeFileSync(join(repo, 'LICENSE'), 'MIT License\nCopyright MyAppDesk\n')
  const [action] = await prepareRepoFileActions(repo, [{
    type: 'edit_file', path: 'LICENSE', oldText: 'MIT License', newText: 'Apache License, Version 2.0',
    description: 'Replace the license heading'
  }], {
    evidencePaths: new Set(['LICENSE']), completePaths: new Set(['LICENSE']), ignoredPaths: new Set()
  })
  expect(action.expectedHash).toMatch(/^[0-9a-f]{64}$/)
  expect(action.expectedOccurrences).toBe(1)
  expect(action.preview).toContain('-MIT License')
  expect(action.preview).toContain('+Apache License, Version 2.0')
})

it('rejects ambiguous edits and incomplete whole-file replacement', async () => {
  const repo = root()
  writeFileSync(join(repo, 'a.txt'), 'same\nsame\n')
  const context = { evidencePaths: new Set(['a.txt']), completePaths: new Set<string>(), ignoredPaths: new Set<string>() }
  await expect(prepareRepoFileActions(repo, [{
    type: 'edit_file', path: 'a.txt', oldText: 'same', newText: 'next', description: 'Edit'
  }], context)).rejects.toMatchObject({ code: 'ambiguous_edit' })
  await expect(prepareRepoFileActions(repo, [{
    type: 'write_file', path: 'a.txt', content: 'next', mode: 'replace', description: 'Replace'
  }], context)).rejects.toMatchObject({ code: 'incomplete_evidence' })
})
```

Add cases for create, delete, replace-all occurrence count, `.git/config`, `.env`, ignored paths,
generated paths, NUL content, 512 KiB per-file overflow, 2 MiB batch overflow, target symlink, and
symlinked parent.

- [ ] **Step 2: Run the test and confirm the module is missing**

Run:

```bash
npm test -- test/repoFileActions.test.ts
```

Expected: FAIL because `src/main/repoFileActions.ts` does not exist.

- [ ] **Step 3: Define preparation errors and guards**

Start the module with:

```ts
export const REPO_FILE_MAX_BYTES = 512 * 1024
export const REPO_FILE_BATCH_MAX_BYTES = 2 * 1024 * 1024

export interface RepoFileActionContext {
  evidencePaths: Set<string>
  completePaths: Set<string>
  ignoredPaths: Set<string>
}

export class RepoFileActionError extends Error {
  constructor(
    readonly code: RepoChatActionErrorCode,
    message: string,
    readonly paths: string[] = []
  ) {
    super(message)
  }
}
```

Implement lexical root containment, `.git` segment rejection, secret/generated/ignored checks, and an
`lstat` walk that rejects any existing symlink in the target or its ancestors. Missing ancestors are
valid only for creation.

- [ ] **Step 4: Implement sequential in-memory simulation**

Implement:

```ts
export async function prepareRepoFileActions(
  repoPath: string,
  actions: RepoChatFileAction[],
  context: RepoFileActionContext
): Promise<PreparedRepoChatFileAction[]>
```

Maintain a per-path simulated value so multiple actions on one file consume the preceding result.
Hash every simulated input with SHA-256, use `null` for a missing create target, count exact matches,
reject no-op final values, and enforce the two size limits against final UTF-8 byte lengths.

- [ ] **Step 5: Generate previews with local Git**

Use a temporary directory outside the repository, write before/after content, and invoke:

```ts
execFile('git', ['diff', '--no-index', '--no-color', '--', beforePath, afterPath])
```

Treat exit code 1 as a valid diff, reject other non-zero exits, and normalize the two headers to
`--- a/<repo path>` and `+++ b/<repo path>`. Creation uses `/dev/null` as the old display header;
deletion uses it as the new display header. Always remove the preview temporary directory.

- [ ] **Step 6: Wire async preparation into repository-chat validation**

Inside the async `chatCompleteJson` validator in `answerRepoChat`, run synchronous action validation
first. If it passes, collect every action target's current ignored status with
`gitService.ignoredTrackedFiles`, then call `prepareRepoFileActions`. Capture the resulting prepared
file actions for the returned reply. Convert `RepoFileActionError` into one concrete validator line so
the provider's one correction attempt can repair exact text, mode, or path mistakes.

After `chatCompleteJson` succeeds, rebuild the original action order by replacing each raw file action
with the corresponding prepared action while leaving `AskAction` entries unchanged. Return that rebuilt
array in `RepoChatReply.actions`; never return raw file actions to the renderer.

- [ ] **Step 7: Run focused tests and typecheck**

Run:

```bash
npm test -- test/repoFileActions.test.ts test/repoChat.test.ts test/chatActions.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Conditional checkpoint**

If commits have been explicitly authorized:

```bash
git add src/main/repoFileActions.ts src/main/repoChat.ts test/repoFileActions.test.ts
git commit -m "feat: prepare repository chat file mutations"
```

Otherwise run `git diff --check` and leave the task changes uncommitted.

---

### Task 4: Atomically apply file batches under the repository lock

**Files:**
- Modify: `src/main/repoFileActions.ts`
- Modify: `src/main/git.ts:1-90`
- Modify: `src/main/git.ts:3860-3910`
- Modify: `src/main/git.ts:5880-6030`
- Modify: `src/renderer/src/infrastructure/api.ts:140-250`
- Test: `test/repoFileActions.test.ts`
- Test: `test/gitOps.test.ts`

**Interfaces:**
- Consumes: prepared file actions and the existing Git dispatcher lock.
- Produces: `applyPreparedRepoFileActions(repoPath, actions, ignoredPaths, io?)` and `gitService.applyRepoFileActions(repoPath, actions): Promise<RepoFileBatchResult>`.

- [ ] **Step 1: Add failing stale, success, and rollback tests**

Extend `test/repoFileActions.test.ts`:

```ts
it('applies a prepared create, edit, and delete batch', async () => {
  const repo = root()
  writeFileSync(join(repo, 'a.txt'), 'old\n')
  writeFileSync(join(repo, 'gone.txt'), 'remove\n')
  const context = {
    evidencePaths: new Set(['a.txt', 'gone.txt']),
    completePaths: new Set(['a.txt', 'gone.txt']),
    ignoredPaths: new Set<string>()
  }
  const prepared = await prepareRepoFileActions(repo, [
    { type: 'edit_file', path: 'a.txt', oldText: 'old', newText: 'new', description: 'Edit' },
    { type: 'write_file', path: 'new.txt', content: 'created\n', mode: 'create', description: 'Create' },
    { type: 'delete_file', path: 'gone.txt', description: 'Delete' }
  ], context)
  const result = await applyPreparedRepoFileActions(repo, prepared, new Set())
  expect(result).toEqual({ applied: 3 })
  expect(readFileSync(join(repo, 'a.txt'), 'utf8')).toBe('new\n')
  expect(readFileSync(join(repo, 'new.txt'), 'utf8')).toBe('created\n')
  expect(existsSync(join(repo, 'gone.txt'))).toBe(false)
})

it('refuses a stale file before the first write', async () => {
  const repo = root()
  writeFileSync(join(repo, 'a.txt'), 'old\n')
  const prepared = await prepareRepoFileActions(repo, [{
    type: 'edit_file', path: 'a.txt', oldText: 'old', newText: 'new', description: 'Edit'
  }], { evidencePaths: new Set(['a.txt']), completePaths: new Set(['a.txt']), ignoredPaths: new Set() })
  writeFileSync(join(repo, 'a.txt'), 'user changed it\n')
  await expect(applyPreparedRepoFileActions(repo, prepared, new Set())).rejects.toMatchObject({ code: 'stale_file' })
  expect(readFileSync(join(repo, 'a.txt'), 'utf8')).toBe('user changed it\n')
})
```

Use an injected filesystem adapter that fails a selected rename to assert that original files return,
created files disappear, deleted files return, and temporary siblings are removed. Add a second test
where restoration fails and assert `rollback_failed` includes the affected path.

- [ ] **Step 2: Run the focused tests and verify application is absent**

Run:

```bash
npm test -- test/repoFileActions.test.ts
```

Expected: FAIL because `applyPreparedRepoFileActions` is missing.

- [ ] **Step 3: Implement full-batch revalidation**

Add:

```ts
export interface RepoFileActionFs {
  lstat: typeof lstat
  readFile: typeof readFile
  writeFile: typeof writeFile
  mkdir: typeof mkdir
  rename: typeof rename
  rm: typeof rm
  chmod: typeof chmod
}

export async function applyPreparedRepoFileActions(
  repoPath: string,
  actions: PreparedRepoChatFileAction[],
  ignoredPaths: Set<string>,
  io: RepoFileActionFs = nodeRepoFileActionFs
): Promise<{ applied: number }>
```

Validate the complete action array and all hashes/occurrence counts before creating the first temporary
file. Re-run every security guard because the IPC caller and filesystem state are untrusted.

- [ ] **Step 4: Implement temporary writes and rollback**

Write final contents to random sibling files, preserve existing mode bits on replacements, create
missing parent directories, move delete targets to random sibling backups, and rename final files into
place. On failure, restore backups and original contents in reverse path order, remove creations, and
delete temporary siblings. Throw the original stable error when rollback succeeds; throw
`rollback_failed` with paths when restoration fails.

- [ ] **Step 5: Add the write-locked Git service method**

Import the file executor in `git.ts` and add:

```ts
async applyRepoFileActions(
  repoPath: string,
  actions: PreparedRepoChatFileAction[]
): Promise<RepoFileBatchResult> {
  const paths = [...new Set(actions.map((action) => action.path))]
  const ignored = new Set(await gitService.ignoredTrackedFiles(repoPath, paths))
  try {
    const result = await applyPreparedRepoFileActions(repoPath, actions, ignored)
    return { ok: true, applied: result.applied }
  } catch (error) {
    if (error instanceof RepoFileActionError) {
      return { ok: false, error: { code: error.code, detail: error.message, paths: error.paths } }
    }
    throw error
  }
}
```

Do not add this method to `READ_METHODS`; the existing dispatcher will take the exclusive repo lock.
Export a narrow testable classifier and use it in the dispatcher:

```ts
export function gitMethodIsRead(method: string): boolean {
  return READ_METHODS.has(method)
}
```

Add the typed renderer adapter:

```ts
applyRepoFileActions: (path: string, actions: PreparedRepoChatFileAction[]) =>
  call<RepoFileBatchResult>('applyRepoFileActions', path, actions),
```

The generic preload Git bridge needs no new method.

- [ ] **Step 6: Add a Git-service integration test**

In `test/gitOps.test.ts`, create or clone a temporary repo, prepare one edit, call
`gitService.applyRepoFileActions`, and assert both disk content and `gitService.status(repo).unstaged`.
Import `gitMethodIsRead` and assert `gitMethodIsRead('applyRepoFileActions')` is false, proving the
dispatcher classifies the new method as an exclusive write without exposing lock internals.

- [ ] **Step 7: Run file and Git tests**

Run:

```bash
npm test -- test/repoFileActions.test.ts test/gitOps.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Conditional checkpoint**

If commits have been explicitly authorized:

```bash
git add src/main/repoFileActions.ts src/main/git.ts src/renderer/src/infrastructure/api.ts test/repoFileActions.test.ts test/gitOps.test.ts
git commit -m "feat: apply repository file actions atomically"
```

Otherwise run `git diff --check` and leave the task changes uncommitted.

---

### Task 5: Execute mixed file and Git plans with truthful partial results

**Files:**
- Modify: `src/renderer/src/lib/askActionRun.ts`
- Modify: `src/renderer/src/lib/askActions.ts`
- Modify: `test/chatActions.test.ts`

**Interfaces:**
- Consumes: `RepoChatAction`, `RepoChatExecutionResult`, `gitApi.applyRepoFileActions`, and existing Git methods.
- Produces: `executeRepoChatActions(repoPath, actions)` and `classifyRepoChatActionError(action, error)` while retaining `executeAskActions(repoPath, AskAction[])` for the AI config wizard.

- [ ] **Step 1: Write failing executor tests for batching, commit preflight, and partial failures**

Extend the existing mocked `window.api.git` tests:

```ts
it('applies the file prefix once before staging and committing', async () => {
  const actions: RepoChatAction[] = [
    { ...editFile, expectedHash: 'a'.repeat(64), expectedOccurrences: 1, preview: '-MIT\n+Apache' },
    { type: 'stage', files: ['LICENSE'], description: 'Stage' },
    { type: 'commit', message: 'docs: change license', description: 'Commit' }
  ]
  git.mockImplementation((method: string) => Promise.resolve(
    method === 'status' ? { ...status, staged: [{ path: 'LICENSE', status: 'M' }] } :
    method === 'applyRepoFileActions' ? { ok: true, applied: 1 } : undefined
  ))
  const result = await executeRepoChatActions('/repo', actions)
  expect(result.error).toBeUndefined()
  expect(result.applied).toBe(3)
  expect(git.mock.calls.map((call) => call[0])).toEqual([
    'applyRepoFileActions', 'stage', 'status', 'commit'
  ])
})

it('blocks an empty commit before invoking commit', async () => {
  git.mockImplementation((method: string) => Promise.resolve(method === 'status' ? status : undefined))
  const result = await executeRepoChatActions('/repo', [commit])
  expect(result.error?.code).toBe('no_staged_changes')
  expect(git.mock.calls.map((call) => call[0])).toEqual(['status'])
})

it('reports applied and remaining actions after a hook failure', async () => {
  git.mockImplementation((method: string) => {
    if (method === 'status') return Promise.resolve({ ...status, staged: [{ path: 'a.ts', status: 'M' }] })
    if (method === 'commit') return Promise.reject(new Error('pre-commit hook exited with code 1'))
    return Promise.resolve(undefined)
  })
  const result = await executeRepoChatActions('/repo', [stage, commit, { type: 'tag', name: 'v1', description: 'Tag' }])
  expect(result).toMatchObject({ applied: 1, failedIndex: 1, failedType: 'commit', remaining: 1 })
  expect(result.error?.code).toBe('hook_failed')
  expect(result.actionResults.map((item) => item.status)).toEqual(['done', 'failed', 'skipped'])
})
```

- [ ] **Step 2: Run the executor tests and confirm failures**

Run:

```bash
npm test -- test/chatActions.test.ts
```

Expected: FAIL because the current executor throws and has no file batching or structured partial result.

- [ ] **Step 3: Keep Ask execution stable and add chat execution**

Leave `executeAskActions(repoPath, AskAction[])` available for `AIConfigWizard`. Add:

```ts
export async function executeRepoChatActions(
  repoPath: string,
  actions: RepoChatAction[]
): Promise<RepoChatExecutionResult>
```

Collect the leading prepared file actions and send them in one `applyRepoFileActions` call. Mark every
file action done only when the discriminated result has `ok: true`. Convert an `ok: false` result
directly into the returned `RepoChatExecutionResult` without relying on Electron to preserve custom
`Error` properties. Then map the remaining Git actions exactly as the current executor does, stopping
at the first failure and marking later entries skipped.

- [ ] **Step 4: Add commit preflight and error classification**

Before each commit, stage `commit.files` when present, refresh status, and return
`no_staged_changes` when `status.staged.length === 0`. Classify commit errors matching
`/hook|husky|pre-commit|commit-msg/i` as `hook_failed`; preserve credential-redacted error text as
`detail`. Map `RepoFileActionError`-shaped IPC errors by their `code`; all other failures use `unknown`.

- [ ] **Step 5: Extend safety and detail helpers to file actions**

Change the chat-facing helpers to accept `RepoChatAction`. Return `normal` for all three file action
types, return `action.path` from `askActionDetail`, and keep `destructiveAskFiles` limited to
`discard`. Keep the Ask planner's `AskAction` typing where it does not render repository-chat actions.

- [ ] **Step 6: Run focused tests and typecheck**

Run:

```bash
npm test -- test/chatActions.test.ts
npm run typecheck
```

Expected: PASS, including existing AI config wizard executor tests.

- [ ] **Step 7: Conditional checkpoint**

If commits have been explicitly authorized:

```bash
git add src/renderer/src/lib/askActionRun.ts src/renderer/src/lib/askActions.ts test/chatActions.test.ts
git commit -m "feat: execute mixed repository chat actions"
```

Otherwise run `git diff --check` and leave the task changes uncommitted.

---

### Task 6: Persist execution results and finalize with actions disabled

**Files:**
- Modify: `src/main/repoChat.ts:540-680`
- Modify: `src/preload/index.ts:125-145`
- Modify: `src/renderer/src/env.d.ts:125-140`
- Modify: `src/renderer/src/infrastructure/api.ts:585-610`
- Modify: `src/renderer/src/lib/repoChatStore.ts`
- Modify: `src/renderer/src/stores/chat.ts`
- Modify: `test/chatActions.test.ts`
- Modify: `test/repoChat.test.ts`

**Interfaces:**
- Consumes: `RepoChatExecutionResult`, existing transcript normalization, `chatAnswerSchema(false)`, and `gitService.status`.
- Produces: `finalizeRepoChat(repoPath, messages, result, cfg)`, `aiApi.repoChatFinalize`, and store method `finalizeActions(repoPath, messageId, result, cfg)`.

- [ ] **Step 1: Write failing finalization and outcome-note tests**

In `test/chatActions.test.ts`, construct the store with proposal and finalization mocks:

```ts
it('stores a partial result and appends a final response without actions', async () => {
  const request = vi.fn(async () => reply({ actions: [stage, commit] }))
  const finalize = vi.fn(async () => reply({ content: 'Stage succeeded; commit failed.' }))
  const store = createRepoChatStore(request, finalize)
  await store.getState().send('/repo', 'stage and commit', cfg)
  const proposal = store.getState().threads['/repo'].messages.at(-1)!
  const result: RepoChatExecutionResult = {
    applied: 1, failedIndex: 1, failedType: 'commit', remaining: 0,
    error: { code: 'hook_failed', detail: 'hook exited 1' },
    actionResults: [
      { index: 0, type: 'stage', status: 'done' },
      { index: 1, type: 'commit', status: 'failed' }
    ]
  }
  await store.getState().finalizeActions('/repo', proposal.id, result, cfg)
  expect(finalize).toHaveBeenCalledOnce()
  expect(store.getState().threads['/repo'].messages.at(-1)?.content).toContain('commit failed')
  expect(store.getState().threads['/repo'].messages.at(-1)?.actions).toBeUndefined()
  expect(actionOutcomeNote({ ...proposal, execution: result })).toContain('hook_failed')
})
```

Add tests that dismissed actions do not finalize, a cleared thread ignores a late finalizer, and a
failed finalizer leaves the proposal's execution result authoritative while setting
`finalizationFailed: true` on that proposal.

- [ ] **Step 2: Write a failing main-process finalization contract test**

Export a pure `finalizationMessages` helper from `repoChat.ts` and assert in `test/repoChat.test.ts` that
it includes applied/failed/remaining counts, refreshed status, and the instruction `Do not propose any actions`.
Also assert `chatAnswerSchema(false)` has no actions property.

- [ ] **Step 3: Run focused tests and verify missing APIs**

Run:

```bash
npm test -- test/chatActions.test.ts test/repoChat.test.ts
```

Expected: FAIL on missing `finalizeActions`, `execution`, or `finalizationMessages`.

- [ ] **Step 4: Implement the finalization handler**

Add:

```ts
export async function finalizeRepoChat(
  repoPathValue: unknown,
  transcriptValue: unknown,
  executionValue: unknown,
  cfg: AIConfig
): Promise<RepoChatReply>
```

Validate the repo path, transcript, and `RepoChatExecutionResult`; refresh `gitService.status`; call
`chatCompleteJson` with `chatAnswerSchema(false)`, `sourceIds: []`, and a system instruction that this
is a factual completion report and no actions may be proposed. Register `ai:repoChatFinalize` beside
`ai:repoChat`.

- [ ] **Step 5: Wire preload and renderer APIs**

Add the following shape consistently to preload, `env.d.ts`, and `aiApi`:

```ts
repoChatFinalize(
  repoPath: string,
  messages: RepoChatMessage[],
  result: RepoChatExecutionResult,
  cfg: AIConfig
): Promise<RepoChatReply>
```

The preload invokes `ai:repoChatFinalize`; no credential or result is logged.

- [ ] **Step 6: Extend store state and lifecycle**

Replace the separate authoritative applied/error fields with:

```ts
execution?: RepoChatExecutionResult
finalizationFailed?: boolean
```

Keep `actionsState` and `actionsAuto` for UI state. Add `finalizeActions` to the store; patch the proposal
with `execution`, set done/failed from `result.error`, call the finalizer, and append its action-free
assistant reply. Use the existing request-id/cleared-thread guard. If finalization rejects, retain the
proposal result, set `finalizationFailed: true` on that proposal, and do not populate the thread-level
retry error because retrying the original user request could propose and execute a second action batch.

- [ ] **Step 7: Update model-facing outcome notes**

Include `applied`, `failedType`, stable error code, and `remaining`. Never include a secret path or
unredacted credential detail. Preserve pending and dismissed notes.

- [ ] **Step 8: Run focused tests and typecheck**

Run:

```bash
npm test -- test/chatActions.test.ts test/repoChat.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 9: Conditional checkpoint**

If commits have been explicitly authorized:

```bash
git add src/main/repoChat.ts src/preload/index.ts src/renderer/src/env.d.ts src/renderer/src/infrastructure/api.ts src/renderer/src/lib/repoChatStore.ts src/renderer/src/stores/chat.ts test/chatActions.test.ts test/repoChat.test.ts
git commit -m "feat: finalize repository chat action results"
```

Otherwise run `git diff --check` and leave the task changes uncommitted.

---

### Task 7: Render file previews, partial outcomes, and translated copy

**Files:**
- Modify: `src/renderer/src/lib/askActionMeta.ts`
- Modify: `src/renderer/src/components/RepoChatPanel.tsx:145-470`
- Modify: `src/renderer/src/styles.css:2620-2715`
- Modify: `src/renderer/src/i18n/{en,ar,de,es,fr,he,it,ja,ko,nl,pl,pt-BR,ru,tr,uk,zh-CN}.ts`
- Modify: `test/chatActions.test.ts`
- Test: `test/i18n.test.ts`

**Interfaces:**
- Consumes: prepared action `preview`, `RepoChatExecutionResult.actionResults`, store `finalizeActions`, and existing approval helpers.
- Produces: file-action metadata, expandable safe diff markup, and localized primary status text.

- [ ] **Step 1: Write failing metadata and approval tests**

Add to `test/chatActions.test.ts`:

```ts
it('classifies file changes as normal and keeps deletes non-Git-destructive', () => {
  const prepared = { ...editFile, expectedHash: 'a'.repeat(64), expectedOccurrences: 1, preview: 'diff' }
  expect(askActionSafety(prepared)).toBe('normal')
  expect(askActionsAutoRun([prepared], 'auto-safe')).toBe(false)
  expect(askActionsAutoRun([prepared], 'auto-all')).toBe(true)
  expect(destructiveAskFiles([prepared])).toEqual([])
})

it('provides metadata and path detail for every file action', () => {
  expect(repoChatActionMeta('edit_file').labelKey).toBe('askAction.editFile')
  expect(repoChatActionMeta('write_file', 'create').labelKey).toBe('askAction.createFile')
  expect(repoChatActionMeta('write_file', 'replace').labelKey).toBe('askAction.replaceFile')
  expect(repoChatActionMeta('delete_file').labelKey).toBe('askAction.deleteFile')
})
```

- [ ] **Step 2: Run focused tests and confirm metadata is missing**

Run:

```bash
npm test -- test/chatActions.test.ts test/i18n.test.ts
```

Expected: FAIL on missing file-action metadata and translation keys.

- [ ] **Step 3: Add file-action metadata without changing Ask metadata**

Keep `ASK_ACTION_META` typed to `AskAction['type']`. Add a function that accepts a
`RepoChatAction['type']` and optional write mode, returning icons and one of:

```ts
'askAction.createFile'
'askAction.editFile'
'askAction.replaceFile'
'askAction.deleteFile'
```

Use `FilePlus2`, `FilePenLine`, `FileOutput`, and `FileX2` from `lucide-react`; fall back to the existing
Git action record for Git types.

- [ ] **Step 4: Render previews and per-action state**

In `ChatActionCard`, derive each row's state from `message.execution?.actionResults[i]`. Render prepared
file previews with escaped React text:

```tsx
<details className="repo-chat-action-preview">
  <summary>{action.path}</summary>
  <pre><code>{action.preview}</code></pre>
</details>
```

Do not feed diffs through `dangerouslySetInnerHTML`. Show the existing success/failure labels plus
applied and remaining counts. Keep technical detail in `title`; primary copy comes from translations.

- [ ] **Step 5: Trigger execution and bounded finalization**

Replace the panel's `executeAskActions` call with `executeRepoChatActions`. Always pass the returned
result to `finalizeActions`; for a result with `error`, preserve the normal `useRepoStore.run` error toast
after the store has received the structured result. The card is authoritative if finalization fails.
The existing effect continues to auto-run only when `askActionsAutoRun` allows the complete plan.

- [ ] **Step 6: Add locale keys to all 16 dictionaries**

Add the four action labels above and concise primary status/error keys needed by the component. English
reference wording is:

```ts
'askAction.createFile': 'Create file',
'askAction.editFile': 'Edit file',
'askAction.replaceFile': 'Replace file',
'askAction.deleteFile': 'Delete file',
'chat.actionsPartial': '{applied} completed; {remaining} not run',
'chat.actionsFinalizing': 'Checking the result…',
'chat.actionsFinalizationFailed': 'The actions finished, but the assistant could not summarize them.',
'chat.actionStale': 'A file changed after this proposal was prepared.',
'chat.actionNoStaged': 'There are no staged changes to commit.',
'chat.actionHookFailed': 'A Git hook stopped the commit.',
'chat.actionRollbackFailed': 'Gitcito could not fully restore the file batch.'
```

Translate every value idiomatically in `ar`, `de`, `es`, `fr`, `he`, `it`, `ja`, `ko`, `nl`, `pl`,
`pt-BR`, `ru`, `tr`, `uk`, and `zh-CN`, preserving `{applied}` and `{remaining}` exactly. Map other stable
error codes to the existing generic `chat.actionsFailed` primary label and keep their redacted detail in
the tooltip.

- [ ] **Step 7: Style the preview and states**

Add styles scoped under `.repo-chat-actions` for a compact `<details>`, monospace horizontally
scrollable `<pre>`, success/failure row accents, and RTL-safe spacing. Reuse existing theme variables;
do not add literal colors when a semantic variable already exists.

- [ ] **Step 8: Run UI logic, i18n lint, and typecheck**

Run:

```bash
npm test -- test/chatActions.test.ts test/i18n.test.ts
npm run lint:i18n
npm run typecheck
```

Expected: PASS with exact locale key parity and placeholder parity.

- [ ] **Step 9: Conditional checkpoint**

If commits have been explicitly authorized:

```bash
git add src/renderer/src/lib/askActionMeta.ts src/renderer/src/components/RepoChatPanel.tsx src/renderer/src/styles.css src/renderer/src/i18n test/chatActions.test.ts test/i18n.test.ts
git commit -m "feat: show repository file action previews"
```

Otherwise run `git diff --check` and leave the task changes uncommitted.

---

### Task 8: Documentation, provider compatibility probe, and full verification

**Files:**
- Create: `test/repoChatLive.test.ts`
- Modify: `docs/help/repo-chat.md`
- Modify: `docs/help/{ar,de,es,fr,he,it,ja,ko,nl,pl,pt-BR,ru,tr,uk,zh-CN}/repo-chat.md`
- Modify: `docs/help/ai.md`
- Modify: `README.md:96-110`
- Modify only if required by docs lint: `scripts/docs-map.json`
- Test: all existing test files

**Interfaces:**
- Consumes: the completed user-visible behavior and the repository validation contract.
- Produces: accurate handbook/README copy and evidence that provider fallback and the full repository gate pass.

- [ ] **Step 1: Update the English repository-chat handbook**

Replace the Git-only action-set paragraph with a section that states:

```text
Repository chat can propose exact edits, whole-file creation or replacement, and file deletion,
followed by the existing Git actions. Gitcito computes the displayed diff locally. Existing files must
come from the evidence the assistant read; unsafe, secret, ignored, generated, binary, stale, and
symlinked targets are refused. Auto-run all actions includes file changes, while destructive Git
operations always ask first.
```

Document the expandable diff, partial results, empty-commit preflight, and action-free final completion
message. Keep the existing screenshots unless the rendered layout materially differs; agents do not
launch the app to recapture them.

- [ ] **Step 2: Update every localized repository-chat page**

Apply the same meaning to the 15 localized `repo-chat.md` files, preserving each page's language,
front matter, links, images, and Markdown structure. Do not copy the English paragraph into translated
pages.

- [ ] **Step 3: Update AI overview and README**

In `docs/help/ai.md`, describe repository chat as proposing validated file and Git actions. In
`README.md`, change the feature sentence to:

```text
...links every answer back to the lines it read, and can propose reviewed file edits plus Git actions
under always-ask, auto-safe, or auto-all approval...
```

Preserve the README's existing links and paragraph flow.

- [ ] **Step 4: Restore the declared dependency tree before validation**

The earlier hook failure came from an incomplete `node_modules` tree with the declared `blobatar`
package absent. Run:

```bash
npm ci
```

Expected: exit 0 and `node_modules/blobatar` exists. `package-lock.json` must remain unchanged; if it
changes, stop and inspect the package-manager/Node mismatch before continuing.

- [ ] **Step 5: Run focused provider-contract tests**

Run:

```bash
npm test -- test/aiJson.test.ts test/repoChat.test.ts test/repoFileActions.test.ts test/chatActions.test.ts
```

Expected: PASS, including prompt-only JSON fallback helpers, laundering rejection, 17-file search
breadth, file preparation, and mixed execution.

- [ ] **Step 6: Add and run an opt-in headless live-provider probe**

Create `test/repoChatLive.test.ts` with a test that is skipped unless explicitly enabled:

```ts
import { afterAll, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { answerRepoChat } from '../src/main/repoChat'
import { defaultProfile } from '../src/shared/types'

const live = process.env.GITCITO_LIVE_AI === '1' ? it : it.skip
const roots: string[] = []
afterAll(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })))

live('prepares a license file action through an OpenAI-compatible provider', async () => {
  const endpoint = process.env.GITCITO_LIVE_ENDPOINT
  const apiKey = process.env.GITCITO_LIVE_API_KEY
  const model = process.env.GITCITO_LIVE_MODEL
  expect(endpoint && apiKey && model).toBeTruthy()

  const repo = mkdtempSync(join(tmpdir(), 'gitcito-live-chat-'))
  roots.push(repo)
  execFileSync('git', ['-C', repo, 'init'])
  execFileSync('git', ['-C', repo, 'config', 'user.name', 'Gitcito Test'])
  execFileSync('git', ['-C', repo, 'config', 'user.email', 'gitcito@example.invalid'])
  writeFileSync(join(repo, 'LICENSE'), 'MIT License\n\nCopyright MyAppDesk\n')
  execFileSync('git', ['-C', repo, 'add', 'LICENSE'])
  execFileSync('git', ['-C', repo, 'commit', '-m', 'test: seed license'])

  const reply = await answerRepoChat(
    repo,
    [{ role: 'user', content: 'Change LICENSE to Apache 2.0. Propose the file change without committing.' }],
    {
      ...defaultProfile().ai,
      enabled: true,
      provider: 'openai',
      endpoint: endpoint!,
      apiKey: apiKey!,
      model: model!,
      repoChatActions: true
    }
  ).catch(() => {
    throw new Error('Live provider probe failed without exposing its configuration.')
  })
  expect(reply.actions?.some((action) => action.type === 'edit_file' || action.type === 'write_file')).toBe(true)
})
```

The normal suite records this file as skipped. For a live probe, export the three values without
echoing them and run:

```bash
GITCITO_LIVE_AI=1 npm test -- test/repoChatLive.test.ts
```

The test uses a temporary repo, stops after preparation, and never executes the proposed mutation.

- [ ] **Step 7: Run the complete repository gate**

Run each command separately and retain its exact result:

```bash
npm run typecheck
npm run lint:i18n
npm run lint:docs
npm test
npm run build
git diff --check
```

Expected: every command exits 0. Do not claim runtime UI validation because the repository contract
forbids launching the app.

- [ ] **Step 8: Inspect final scope and credentials**

Run:

```bash
git status --short
git diff --stat
git diff -- docs/superpowers/specs/2026-08-18-repository-chat-file-actions-design.md docs/superpowers/plans/2026-08-18-repository-chat-file-actions.md
rg -n '<test-key-marker>|<test-endpoint-marker>' . --glob '!node_modules/**' --glob '!.git/**'
```

Expected: only intended source, test, translation, and documentation files are changed; the credential
and endpoint search returns no matches.

- [ ] **Step 9: Conditional final checkpoint**

If commits have been explicitly authorized, review staged scope and commit the documentation/verification
task separately:

```bash
git add README.md docs/help docs/superpowers src test
git diff --cached --stat
git commit -m "docs: document repository chat file actions"
```

If commits are not authorized, leave all changes uncommitted, report the exact gate results, and provide
the final `git status --short` scope.
