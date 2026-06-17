# Screenshot & video automation

Regenerates every image in `docs/screenshots/` (and the promo video) by driving
the **real built app** with Playwright against the deterministic
[playground repos](../playground). No manual window-grabbing, no stale shots.

```bash
npm run screenshots          # regenerate all PNGs
npm run screenshots graph    # only shots whose name matches "graph"
npm run screenshots:gif      # PNGs + animated GIF clips (needs ffmpeg)
```

## How it works

1. **Build** the app if `out/` is missing (`electron-vite build`).
2. **Seed** the playground repos if they're missing (`setup-playground.sh`), then
   symlink them under `/tmp/gitcito-demo/` so screenshots show a clean,
   username-free path.
3. For each shot: launch the built Electron app with `--shot`, which enables an
   in-app **store bridge** (`window.__shot`, see
   [`src/renderer/src/lib/shotBridge.ts`](../../src/renderer/src/lib/shotBridge.ts)).
   A throwaway settings file points the app at the right repo(s).
4. **Drive** the UI into the exact state via the bridge's zustand stores — open a
   conflict, preview a file, show a settings page — then `page.screenshot()`.
   GIF clips are recorded with a Chromium screencast and stitched by ffmpeg.

The bridge ships nothing in a normal build: it only attaches when the app is
launched with `--shot` (the flag is forwarded into the renderer by the main
process).

## Adding a feature shot

Add one entry to [`shots.config.mjs`](./shots.config.mjs):

```js
{
  out: 'my-feature',           // → docs/screenshots/my-feature.png
  repos: ['octopus-merge'],    // playground repo(s); first is active
  themes: ['light', 'dark'],   // multiple → my-feature-light/-dark.png
  // Optional: mutate the repo on disk before launch.
  prepare: async ({ repoPaths, run }) => { /* e.g. start a merge */ },
  // Optional: put the running UI into the target state.
  drive: async (page, repoPaths) => {
    await page.evaluate(() => window.__shot.ui.getState().openModal({ kind: 'settings', page: 'general' }))
  }
}
```

`window.__shot` exposes `settings`, `ui`, `repo` (the zustand stores),
`repoActions`, and `waitForRepo(path)`. Anything the app can do, a shot can drive.

## Promo video (Remotion)

The [`remotion/`](../../remotion) project composes the generated PNGs into a
1080p promo with Ken Burns motion and cross-fades:

```bash
cd remotion
npm install                  # first time only (Remotion + React)
npm run studio               # live preview in the browser
npm run render               # → remotion/out/GitcitoVideo.mp4
```

It reads the screenshots from `../docs` via `--public-dir`, so regenerate the
PNGs first if features changed.
