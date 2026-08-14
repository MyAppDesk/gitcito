# Screenshot automation

Regenerates every image in `docs/screenshots/` by driving the **real built app**
with Playwright against the deterministic [playground repos](../playground). No
manual window-grabbing, no stale shots.

Everything lands as **WebP** — stills and motion clips alike.

```bash
npm run screenshots          # regenerate every still
npm run screenshots graph    # only shots whose name matches "graph"
npm run screenshots:clips    # stills + animated motion clips
```

Both rebuild the app and reseed the playground first. `--no-build` and
`--no-seed` skip those when you are iterating on one shot.

Needs **ffmpeg** (`brew install ffmpeg`): it encodes every image.

## How it works

1. **Build** the app (`electron-vite build`), so shots reflect the current source
   rather than a stale `out/`. `--no-build` reuses what is there.
2. **Seed** the playground repos (`setup-playground.sh`), then symlink them under
   `/tmp/gitcito-demo/` so screenshots show a clean, username-free path.
   `--no-seed` skips it.
3. For each shot: launch the built Electron app with `--shot`, which enables an
   in-app **store bridge** (`window.__shot`, see
   [`src/renderer/src/lib/shotBridge.ts`](../../src/renderer/src/lib/shotBridge.ts)).
   A throwaway settings file points the app at the right repo(s).
4. **Drive** the UI into the exact state via the bridge's zustand stores — open a
   conflict, preview a file, show a settings page — then `page.screenshot()`,
   transcoded to WebP (q90: about a quarter of the PNG's bytes, with no visible
   difference on UI text at 2x zoom).
   Motion clips are recorded with a Chromium screencast and stitched by ffmpeg
   into animated WebP (`clip-*.webp`) — a UI clip is full-colour, which GIF's
   256-entry palette both dithers and pays ~8x the bytes for.

The bridge ships nothing in a normal build: it only attaches when the app is
launched with `--shot` (the flag is forwarded into the renderer by the main
process).

## Adding a feature shot

Add one entry to [`shots.config.mjs`](./shots.config.mjs):

```js
{
  out: 'my-feature',           // → docs/screenshots/my-feature.webp
  repos: ['octopus-merge'],    // playground repo(s); first is active
  themes: ['light', 'dark'],   // multiple → my-feature-light/-dark.webp
  keychain: true,              // rarely: grant keychain consent (see below)
  // Optional: mutate the repo on disk before launch.
  prepare: async ({ repoPaths, run }) => { /* e.g. start a merge */ },
  // Optional: put the running UI into the target state.
  drive: async (page, repoPaths) => {
    await page.evaluate(() => window.__shot.ui.getState().openModal({ kind: 'settings', page: 'general' }))
  }
}
```

`window.__shot` exposes `settings`, `ui`, `repo`, `terminals` (the zustand
stores), `repoActions`, and `waitForRepo(path)`. Anything the app can do, a shot
can drive.

## Run the playground rebuild afterwards

Several shots have a `prepare` step that mutates its playground repo on disk —
starting a merge, staging files, dirtying the working tree. Those are the same
repositories the test suite reads, so a capture run leaves tests failing until
you reseed:

```bash
npm run playground:rebuild
```

## Keychain consent

The seeded profile carries a demo AI key, so the app would ask to store it on
every launch and the explainer would land on top of the shot. Each run therefore
writes `gitcito-keychain.json` into the throwaway userData dir before launching.

The answer is **declined** by default: refusing keeps tokens in memory and the
app fully working, while granting makes macOS raise its own "Gitcito Safe
Storage" dialog — an OS window Playwright cannot dismiss, which stalls the run.
Set `keychain: true` only on shots that need a readable vault (`vault`,
`secure-share`, `secure-workspace`); expect a one-off OS prompt on those.

## Where the images are used

The handbook (`docs/help/*.md`) references them as
`![alt](../screenshots/name.webp)`, which resolves three ways: on GitHub, in the
app (bundled by a Vite glob), and on the website (copied to `assets/`).

A screenshot no page uses fails `npm test` — an orphan is either a page someone
forgot to write or dead weight.
