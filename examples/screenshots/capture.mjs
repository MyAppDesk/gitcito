#!/usr/bin/env node
// Screenshot + GIF capture harness for Gitcito.
//
//   node examples/screenshots/capture.mjs            # all PNG shots
//   node examples/screenshots/capture.mjs graph      # only shots matching "graph"
//   node examples/screenshots/capture.mjs --gif      # also render animated clips
//   node examples/screenshots/capture.mjs --gif-only conflict
//
// How it works: builds the app if needed, ensures the deterministic playground
// repos exist, then for each shot launches the built Electron app with `--shot`
// (which enables the in-app `__shot` store bridge), seeds a throwaway settings
// file pointing at the right repos, drives the UI into the target state and
// screenshots it. GIF clips are recorded via a Chromium screencast and stitched
// with ffmpeg.
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
const wantGif = flags.has('--gif') || flags.has('--gif-only')
const gifOnly = flags.has('--gif-only')

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
  if (!existsSync(MAIN)) {
    console.log('▶ building app (out/ missing)…')
    await sh('npm', ['run', 'build'])
  }
  if (!existsSync(join(PLAYGROUND, 'MANIFEST.tsv'))) {
    console.log('▶ seeding playground repos…')
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

  const app = await electron.launch({
    args: [MAIN, '--shot', `--user-data-dir=${userDataDir}`],
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
  // Freeze caret + scrollbars for clean frames.
  await page.addStyleTag({
    content: '::-webkit-scrollbar{display:none!important} *{caret-color:transparent!important}'
  })
  await page.evaluate(() => document.fonts.ready)

  return { app, page, userDataDir }
}

async function settle(page, ms = 800) {
  await page.waitForTimeout(ms)
}

async function capturePng(shot) {
  for (const theme of shot.themes ?? ['dark']) {
    const { app, page, userDataDir } = await launch(shot, theme)
    try {
      if (shot.drive) await shot.drive(page, repoPathsFor(shot))
      await settle(page)
      const suffix = (shot.themes ?? ['dark']).length > 1 ? `-${theme}` : ''
      const file = join(OUT_DIR, `${shot.out}${suffix}.png`)
      await page.screenshot({ path: file })
      console.log(`  ✓ ${file.replace(ROOT + '/', '')}`)
    } finally {
      await app.close()
      await rm(userDataDir, { recursive: true, force: true })
    }
  }
}

async function captureGif(shot) {
  if (!hasFfmpeg()) {
    console.warn(`  ⚠ skipping ${shot.out}: ffmpeg not found (brew install ffmpeg)`)
    return
  }
  const theme = (shot.themes ?? ['dark'])[0]
  const { app, page, userDataDir } = await launch(shot, theme)
  const framesDir = await mkdtemp(join(tmpdir(), 'gitcito-frames-'))
  const fps = 12
  try {
    await settle(page, 600)
    const session = await page.context().newCDPSession(page)
    const frames = []
    session.on('Page.screencastFrame', async (f) => {
      frames.push(Buffer.from(f.data, 'base64'))
      await session.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
    })
    await session.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: WIDTH, maxHeight: HEIGHT })
    await shot.gif.drive(page, repoPathsFor(shot))
    await page.waitForTimeout(shot.gif.durationMs)
    await session.send('Page.stopScreencast')

    // Write captured frames and let ffmpeg sample them at a steady fps.
    let i = 0
    for (const buf of frames) await writeFile(join(framesDir, `f${String(i++).padStart(4, '0')}.png`), buf)
    if (!frames.length) {
      console.warn(`  ⚠ ${shot.out}: no frames captured`)
      return
    }
    const out = join(OUT_DIR, `${shot.out}.gif`)
    const palette = join(framesDir, 'palette.png')
    const vf = `fps=${fps},scale=900:-1:flags=lanczos`
    await sh('ffmpeg', ['-y', '-framerate', String(fps), '-i', join(framesDir, 'f%04d.png'), '-vf', `${vf},palettegen`, palette])
    await sh('ffmpeg', [
      '-y', '-framerate', String(fps), '-i', join(framesDir, 'f%04d.png'), '-i', palette,
      '-lavfi', `${vf} [x]; [x][1:v] paletteuse`, out
    ])
    console.log(`  ✓ ${out.replace(ROOT + '/', '')} (${frames.length} frames)`)
  } finally {
    await app.close()
    await rm(userDataDir, { recursive: true, force: true })
    await rm(framesDir, { recursive: true, force: true })
  }
}

async function main() {
  await ensurePrereqs()
  const match = (s) => filters.length === 0 || filters.some((f) => s.out.includes(f))

  if (!gifOnly) {
    const todo = shots.filter(match)
    console.log(`\n📸 ${todo.length} PNG shot(s)`)
    for (const shot of todo) {
      console.log(`▶ ${shot.out}`)
      await capturePng(shot)
    }
  }

  if (wantGif) {
    const todo = clips.filter(match)
    console.log(`\n🎬 ${todo.length} GIF clip(s)`)
    for (const shot of todo) {
      console.log(`▶ ${shot.out}`)
      await captureGif(shot)
    }
  }
  console.log('\n✅ done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
