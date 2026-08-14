#!/usr/bin/env node
// Screenshot + motion-clip capture harness for Gitcito.
//
//   node examples/screenshots/capture.mjs            # all stills (WebP)
//   node examples/screenshots/capture.mjs graph      # only shots matching "graph"
//   node examples/screenshots/capture.mjs --clips    # also render animated WebP clips
//   node examples/screenshots/capture.mjs --clips-only conflict
//
// How it works: builds the app if needed, ensures the deterministic playground
// repos exist, then for each shot launches the built Electron app with `--shot`
// (which enables the in-app `__shot` store bridge), seeds a throwaway settings
// file pointing at the right repos, drives the UI into the target state and
// screenshots it. Motion clips are recorded via a Chromium screencast and
// stitched into animated WebP with ffmpeg.
import { _electron as electron } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm, readdir, symlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { shots, clips } from './shots.config.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const PLAYGROUND = join(ROOT, 'examples', 'playground')
const OUT_DIR = join(ROOT, 'docs', 'screenshots')
const MAIN = join(ROOT, 'out', 'main', 'index.js')

// Repos are loaded through neutral symlinks so screenshots show a clean,
// username-free path (e.g. /tmp/gitcito-demo/octopus-merge) instead of the
// real checkout location.
const DEMO_ROOT = join('/tmp', 'gitcito-demo')

// Fixed content size for crisp, consistent shots regardless of the host OS chrome.
const WIDTH = 1440
const HEIGHT = 900

const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--')))
const filters = args.filter((a) => !a.startsWith('--'))
// `--gif`/`--gif-only` stay as aliases: the output is WebP now, but the flags
// predate that and are baked into muscle memory and older docs.
const clipsOnly = flags.has('--clips-only') || flags.has('--gif-only')
const wantGif = clipsOnly || flags.has('--clips') || flags.has('--gif')
const gifOnly = clipsOnly

function sh(cmd, cmdArgs, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, cmdArgs, { stdio: 'inherit', cwd: ROOT, ...opts })
    p.on('exit', (code) => (code === 0 || opts.allowFail ? resolve(code) : reject(new Error(`${cmd} exited ${code}`))))
    p.on('error', reject)
  })
}

function hasFfmpeg() {
  return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0
}

async function ensurePrereqs() {
  // Stills are transcoded to WebP, so ffmpeg is required for every run now —
  // not just the ones rendering clips.
  if (!hasFfmpeg()) {
    console.error('✖ ffmpeg not found — required to encode shots as WebP (brew install ffmpeg)')
    process.exit(1)
  }
  // Always rebuild so screenshots/GIFs reflect the latest source, not a stale
  // out/ from a previous run. Pass --no-build to reuse the existing bundle.
  if (flags.has('--no-build')) {
    if (!existsSync(MAIN)) {
      console.log('▶ building app (out/ missing)…')
      await sh('npm', ['run', 'build'])
    }
  } else {
    console.log('▶ building app…')
    await sh('npm', ['run', 'build'])
  }
  // Always reseed the full playground (unless --no-seed): partial runs of
  // setup-playground.sh wipe the dir and leave only one repo, which would make
  // most shots capture a "directory does not exist" error.
  if (flags.has('--no-seed')) {
    if (!existsSync(join(PLAYGROUND, 'MANIFEST.tsv'))) {
      console.log('▶ seeding playground repos…')
      await sh('bash', ['examples/setup-playground.sh'])
    }
  } else {
    console.log('▶ seeding playground repos (full)…')
    await sh('bash', ['examples/setup-playground.sh'])
  }
  await mkdir(OUT_DIR, { recursive: true })
  await linkDemoRepos()
}

// Symlink every playground repo into DEMO_ROOT so the app displays neutral paths.
async function linkDemoRepos() {
  await rm(DEMO_ROOT, { recursive: true, force: true })
  await mkdir(DEMO_ROOT, { recursive: true })
  for (const entry of await readdir(PLAYGROUND, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    await symlink(join(PLAYGROUND, entry.name), join(DEMO_ROOT, entry.name)).catch(() => {})
  }
}

function repoPathsFor(shot) {
  const map = {}
  for (const name of [...shot.repos, ...(shot.recents ?? [])]) map[name] = join(DEMO_ROOT, name)
  return map
}

// Build a partial settings file; the app's loader fills in every other default.
function seedSettings(shot, theme) {
  const repoPaths = repoPathsFor(shot)
  const ref = (name) => ({ path: repoPaths[name], name })
  const repos = shot.repos.map(ref)
  const tab =
    shot.kind === 'group'
      ? {
          id: 'shot-tab',
          kind: 'group',
          name: 'My Project',
          repos,
          activeRepoPath: shot.groupLanding ? null : repos[0].path,
          color: '#6366f1'
        }
      : { id: 'shot-tab', kind: 'repo', name: repos[0].name, repos: [repos[0]], activeRepoPath: repos[0].path }

  return {
    profiles: [
      {
        id: 'default',
        name: 'Octocat',
        gitName: 'Octocat',
        gitEmail: 'octocat@example.com',
        githubToken: '',
        azureToken: '',
        gitlabToken: '',
        bitbucketToken: '',
        ai: {
          enabled: true,
          provider: 'openai',
          endpoint: 'https://api.openai.com/v1',
          apiKey: 'sk-demo-xxxxxxxxxxxxxxxxxxxxxxxx',
          model: 'gpt-4o-mini',
          commitStyle: 'conventional',
          explainStyle: 'normal',
          conflictStyle: 'clean',
          branchNamingStyle: 'prefix/description',
          customInstructions: '',
          generateDescription: true,
          coAuthor: true
        }
      }
    ],
    activeProfileId: 'default',
    tabs: [tab],
    activeTabId: 'shot-tab',
    recentRepos: (shot.recents ?? []).map(ref),
    appThemeId: shot.appTheme ?? 'gitcito',
    codeThemeId: shot.appTheme ?? 'gitcito',
    themeMode: theme,
    onboardingCompleted: true
  }
}

async function launch(shot, theme) {
  const userDataDir = await mkdtemp(join(tmpdir(), 'gitcito-shot-'))
  await mkdir(userDataDir, { recursive: true })
  const repoPaths = repoPathsFor(shot)

  if (shot.prepare) await shot.prepare({ repoPaths, run: (c, a, o) => sh(c, a, o) })

  await writeFile(join(userDataDir, 'gitcito-settings.json'), JSON.stringify(seedSettings(shot, theme), null, 2))

  // Answer the keychain question before it is asked. The seeded profile carries
  // a demo AI key, so every launch would otherwise raise the consent explainer
  // and photograph it instead of the feature (each shot gets a fresh userData
  // dir, so it asks every single time).
  //
  // 'declined' is the default on purpose: refusing keeps tokens in memory and
  // the app fully working, while granting makes macOS raise its own "Gitcito
  // Safe Storage" dialog — an OS window Playwright cannot dismiss, which would
  // stall the run. Only shots that actually need a readable vault opt in.
  await writeFile(
    join(userDataDir, 'gitcito-keychain.json'),
    JSON.stringify({ consent: shot.keychain ? 'granted' : 'declined', explained: true }, null, 2)
  )

  const app = await electron.launch({
    // --disable-gpu forces software (CPU) rasterization so pixel output is
    // identical across runs, eliminating GPU/subpixel-antialiasing drift.
    args: [MAIN, '--shot', `--user-data-dir=${userDataDir}`, '--disable-gpu'],
    cwd: ROOT
  })
  const page = await app.firstWindow()

  // Deterministic content size + wait for the bridge and the active repo to load.
  await app.evaluate(
    ({ BrowserWindow }, { w, h }) => {
      const win = BrowserWindow.getAllWindows()[0]
      win.setContentSize(w, h)
    },
    { w: WIDTH, h: HEIGHT }
  )
  await page.waitForFunction(() => window.__shot?.ready === true, { timeout: 20000 })
  const activePath = shot.groupLanding ? null : repoPaths[shot.repos[0]]
  if (activePath) {
    await page.evaluate((p) => window.__shot.waitForRepo(p), activePath).catch(() => {})
  }
  // Second line of defence behind the seeded consent file: if anything still
  // manages to raise the keychain explainer, drop it before the shot is driven.
  // Only that one kind — every other modal is something a shot asked for.
  await page
    .evaluate(() => {
      const ui = window.__shot.ui.getState()
      if (ui.modal?.kind === 'keychain-consent') ui.closeModal()
    })
    .catch(() => {})

  // Freeze caret, scrollbars, animations and transitions for clean, deterministic frames.
  await page.addStyleTag({
    content:
      '::-webkit-scrollbar{display:none!important}' +
      '*{caret-color:transparent!important;animation-play-state:paused!important;transition:none!important;transition-duration:0s!important}'
  })
  await page.evaluate(() => document.fonts.ready)

  return { app, page, userDataDir }
}

async function settle(page, ms = 800) {
  await page.waitForTimeout(ms)
}

// Some shots drive a live subprocess (e.g. launch-configs spawns a real PTY via
// a .vscode/launch.json config); the Electron renderer can occasionally crash
// mid-drive ("Target page has been closed"). Retry so one flaky native crash
// doesn't lose the shot — and, crucially, doesn't abort the whole run.
const SHOT_ATTEMPTS = 3

async function withRetry(label, fn) {
  let lastErr
  for (let attempt = 1; attempt <= SHOT_ATTEMPTS; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      const msg = String(e?.message ?? e).split('\n')[0]
      if (attempt < SHOT_ATTEMPTS) console.warn(`  ↻ ${label}: ${msg} — retry ${attempt + 1}/${SHOT_ATTEMPTS}`)
    }
  }
  throw lastErr
}

async function capturePngTheme(shot, theme) {
  const { app, page, userDataDir } = await launch(shot, theme)
  try {
    if (shot.drive) await shot.drive(page, repoPathsFor(shot))
    await settle(page)
    const suffix = (shot.themes ?? ['dark']).length > 1 ? `-${theme}` : ''
    const file = join(OUT_DIR, `${shot.out}${suffix}.webp`)
    // Shoot PNG (Playwright's only lossless option) then transcode. WebP q90 is
    // ~a quarter of the PNG's bytes with no visible difference on UI text at 2x
    // zoom, and these ship in the repo, in the app bundle and on the website.
    const raw = await page.screenshot({ animations: 'disabled' })
    const tmpPng = join(userDataDir, 'shot.png')
    await writeFile(tmpPng, raw)
    await sh('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmpPng, '-c:v', 'libwebp', '-q:v', '90', file])
    console.log(`  ✓ ${file.replace(ROOT + '/', '')}`)
  } finally {
    // A crashed app makes close()/rm() throw too — never let cleanup mask the
    // real error or bubble past the retry boundary.
    await app.close().catch(() => {})
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {})
  }
}

async function capturePng(shot) {
  for (const theme of shot.themes ?? ['dark']) {
    const suffix = (shot.themes ?? ['dark']).length > 1 ? ` (${theme})` : ''
    await withRetry(`${shot.out}${suffix}`, () => capturePngTheme(shot, theme))
  }
}

async function captureGif(shot) {
  if (!hasFfmpeg()) {
    console.warn(`  ⚠ skipping ${shot.out}: ffmpeg not found (brew install ffmpeg)`)
    return
  }
  await withRetry(shot.out, () => captureGifOnce(shot))
}

async function captureGifOnce(shot) {
  const theme = (shot.themes ?? ['dark'])[0]
  const { app, page, userDataDir } = await launch(shot, theme)
  const framesDir = await mkdtemp(join(tmpdir(), 'gitcito-frames-'))
  const fps = 12
  try {
    await settle(page, 600)

    // Sample frames at a steady wall-clock rate. A CDP screencast only emits
    // frames on visual change, so static holds (e.g. dwelling on a theme)
    // collapse to a couple of frames while transitions burst — and since
    // ffmpeg replays every frame at a fixed fps, real dwell time is lost and
    // swaps look instant. Grabbing one screenshot per 1/fps tick instead keeps
    // GIF playback proportional to how long each state was actually on screen.
    const frames = []
    const frameMs = 1000 / fps
    let capturing = true
    const captureStart = Date.now()
    const sampler = (async () => {
      while (capturing) {
        const t0 = Date.now()
        try {
          frames.push(await page.screenshot({ type: 'png' }))
        } catch {
          // page closing mid-shot — stop quietly
          break
        }
        const rest = frameMs - (Date.now() - t0)
        if (rest > 0) await page.waitForTimeout(rest)
      }
    })()

    // durationMs is the total clip length: drive runs inside it, then we hold
    // on the final frame for whatever time is left (if any).
    const driveStart = Date.now()
    await shot.gif.drive(page, repoPathsFor(shot))
    const tail = shot.gif.durationMs - (Date.now() - driveStart)
    if (tail > 0) await page.waitForTimeout(tail)
    capturing = false
    await sampler
    const elapsedSec = (Date.now() - captureStart) / 1000

    // Write captured frames. page.screenshot rarely sustains a full `fps`, so
    // feed ffmpeg the *actual* capture rate as the input framerate — that sets
    // each frame's real duration so the clip runs at true speed — then resample
    // to a steady `fps` for smooth playback without changing total length.
    let i = 0
    for (const buf of frames) await writeFile(join(framesDir, `f${String(i++).padStart(4, '0')}.png`), buf)
    if (!frames.length) {
      console.warn(`  ⚠ ${shot.out}: no frames captured`)
      return
    }
    const inputFps = elapsedSec > 0 ? frames.length / elapsedSec : fps
    // Animated WebP, not GIF: a UI clip is full-colour, and GIF's 256-entry
    // palette both dithers the gradients and costs ~8x the bytes. Every target
    // renders it — GitHub markdown, the site, and the in-app Chromium.
    const out = join(OUT_DIR, `${shot.out}.webp`)
    const vf = `fps=${fps},scale=900:-1:flags=lanczos`
    await sh('ffmpeg', [
      '-y', '-framerate', String(inputFps), '-i', join(framesDir, 'f%04d.png'),
      '-vf', vf, '-c:v', 'libwebp_anim', '-lossless', '0', '-q:v', '70',
      '-compression_level', '5', '-loop', '0', '-an', out
    ])
    console.log(`  ✓ ${out.replace(ROOT + '/', '')} (${frames.length} frames)`)
  } finally {
    await app.close().catch(() => {})
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {})
    await rm(framesDir, { recursive: true, force: true }).catch(() => {})
  }
}

async function main() {
  await ensurePrereqs()
  const match = (s) => filters.length === 0 || filters.some((f) => s.out.includes(f))

  // Never let one shot's failure abort the whole regeneration — capture what we
  // can, report the rest at the end.
  const failures = []
  const run = async (shot, fn) => {
    console.log(`▶ ${shot.out}`)
    try {
      await fn(shot)
    } catch (e) {
      failures.push(shot.out)
      console.error(`  ✗ ${shot.out}: ${String(e?.message ?? e).split('\n')[0]}`)
    }
  }

  if (!gifOnly) {
    const todo = shots.filter(match)
    console.log(`\n📸 ${todo.length} still(s)`)
    for (const shot of todo) await run(shot, capturePng)
  }

  if (wantGif) {
    const todo = clips.filter(match)
    console.log(`\n🎬 ${todo.length} GIF clip(s)`)
    for (const shot of todo) await run(shot, captureGif)
  }

  if (failures.length) {
    console.error(`\n⚠ ${failures.length} shot(s) failed after ${SHOT_ATTEMPTS} attempts: ${failures.join(', ')}`)
    process.exit(1)
  }
  console.log('\n✅ done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
