---
name: git-operation
description: Add or change a git-backed operation in Gitcito end to end — main-process git service, IPC dispatch, renderer API adapter, store action, UI. Use when wiring a new git command, exposing new repo data to the UI, or debugging why a `gitApi.*` call fails or a UI action does not refresh.
---

# Adding a git operation

Gitcito is Electron: git only ever runs in the **main** process. A feature
crosses four layers, and skipping one is the usual cause of "the button does
nothing".

```
src/main/git.ts            gitService.<method>  — spawns git, parses output
      ↓ single 'git' IPC channel (method name + args)
src/preload/index.ts       window.api.git(method, ...args)
src/renderer/src/infrastructure/api.ts   gitApi.<method>  — typed adapter
src/renderer/src/stores/repo.ts          repoActions.<action>  — toast, undo, refresh
src/renderer/src/components/*            calls the action
```

## 1. Main process — `src/main/git.ts`

Add the method to `gitService`. It takes the repo path first (the dispatcher
uses `args[0]` as the lock key), returns plain JSON-serializable data, and
throws on failure — the renderer turns a thrown error into an error toast.

Then classify it:

- **Read-only?** Add its name to `READ_METHODS`. Reads take a shared lock and
  run concurrently; anything absent is treated as a write and takes the
  exclusive lock. Mislabeling a write as a read corrupts state under
  concurrency.
- **Worth logging?** `eventForCall()` maps a method to an `ActivityEvent`, which
  feeds the operation log and the analytics counters. Add a case when the
  action is something a user would look for in their history.

## 2. Shared types — `src/shared/types.ts`

Any structure crossing the IPC boundary is declared here, and only here. Both
sides import from `../../shared/types`.

## 3. Preload + renderer adapter

Generic git calls need no preload change — they ride the single `git` channel.
Add a typed wrapper in `infrastructure/api.ts`:

```ts
myOp: (path: string, ref: string) => call<MyResult>('myOp', path, ref),
```

`api.ts` is the only file that touches `window.api`. A component or store that
reaches for `window.api.git` directly is a bug.

A **new channel** (streaming progress, a push from main → renderer) does need a
`contextBridge` entry in `src/preload/index.ts` plus an `ipcMain.handle` /
`webContents.send` on the main side. Follow `clone:progress` for the shape.

## 4. Store action — `src/renderer/src/stores/repo.ts`

Never call `gitApi` for a mutation straight from a component. Go through
`useRepoStore.getState().run(...)`, which serializes the call per repo, shows a
busy label, toasts the result, records undo, and refreshes:

```ts
myOp: (path: string, ref: string) =>
  useRepoStore.getState().run(
    path,
    interp(t('act.myOp'), { ref }),        // success toast + busy label (translated)
    () => gitApi.myOp(path, ref),
    {                                       // optional undo entry
      label: interp(t('undoLabel.myOp'), { ref }),
      undo: () => gitApi.reset(path, 'ORIG_HEAD', 'hard'),
      redo: () => gitApi.myOp(path, ref)
    },
    null,                                   // op: 'push' | 'pull' | 'fetch' | null
    undefined,                              // onError: return true to swallow the default toast
    ['log', 'status']                       // refresh only these slices
  ),
```

Notes that matter:

- The label is user-facing → it comes from the dictionary (see the
  `translations` skill), never a raw string.
- The **refresh slice list** is a performance contract: omitting a slice keeps
  its previous array *identity*, so the graph memo does not invalidate. Pass
  the narrowest set that reflects your change; omit the argument for a full
  refresh.
- Add an undo entry whenever the operation is reversible with a git command.
  Undo is what makes the app safe to explore.

## 5. UI

Components read state via selectors (`useRepoStore((s) => s.repos[path])`) and
call `repoActions.*`. Keep them free of git knowledge.

## Verify

```bash
npm run typecheck && npm run lint:i18n && npm test
```

Add a test in `test/` that runs the real git command against a playground
fixture — see the `playground-fixture` skill. Never verify by launching the
app; the user does that.
