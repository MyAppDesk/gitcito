#!/usr/bin/env node
/**
 * Refuse to package an app whose integrated terminal would be the basic one.
 *
 * node-pty is an optional dependency with a native addon. When its build fails
 * — or it was never installed — `npm install` still succeeds, the app still
 * builds and packages, and the terminal silently falls back to "basic shell
 * mode": a plain pipe with TERM=dumb, no prompt, colours, completion or
 * full-screen programs. A locally built AppImage shipped exactly that, with
 * nothing in the build output to say so.
 *
 * The check loads node-pty with Electron's own Node (ELECTRON_RUN_AS_NODE), the
 * runtime the packaged main process uses. node-pty is a Node-API addon, so the
 * failure this catches is not an ABI mismatch — it is the addon missing or its
 * native build absent for this platform.
 *
 * GITCITO_ALLOW_BASIC_TERMINAL=1 packages anyway, for a platform where node-pty
 * genuinely cannot be built.
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(root, 'package.json'))

if (process.env.GITCITO_ALLOW_BASIC_TERMINAL === '1') {
  console.warn('⚠ check-native: GITCITO_ALLOW_BASIC_TERMINAL=1 — packaging without checking node-pty.')
  process.exit(0)
}

/** The Electron binary (the `electron` package's main export is its path). */
const electron = require('electron')
const { version } = require('electron/package.json')

// Load it the way the main process does: a bare require, resolved from the repo.
const probe = "try { require('node-pty'); } catch (e) { console.error(e && e.message); process.exit(1) }"
const run = spawnSync(electron, ['-e', probe], {
  cwd: root,
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  encoding: 'utf8'
})

if (run.status === 0) {
  console.log(`✔ check-native: node-pty loads in Electron ${version}.`)
  process.exit(0)
}

const reason = (run.stderr || run.error?.message || 'unknown error').trim().split('\n')[0]
console.error(`✖ check-native: node-pty does not load in Electron ${version}: ${reason}

  The packaged app's terminal would fall back to basic shell mode — no prompt,
  colours, completion or full-screen programs. Fix the install, then package:

    npm install                          # builds node-pty, then rebuilds it for Electron
    npx electron-rebuild -f -w node-pty  # or just the rebuild, and read its output

  To package anyway: GITCITO_ALLOW_BASIC_TERMINAL=1
`)
process.exit(1)
