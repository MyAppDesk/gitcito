#!/usr/bin/env node
// Release guard: clear a stale `.git/index.lock` before release-it runs.
//
// Why this exists: when Gitcito itself is open on this repo (dev mode), its
// background `git status` refreshes briefly create `.git/index.lock`. If
// release-it's commit step races one of those refreshes — or a previous git
// process crashed — the lock lingers and release-it dies with:
//
//   fatal: Unable to create '.../.git/index.lock': File exists.
//
// We never yank a lock that a live git process is holding. We poll for it to
// clear on its own (the common, transient case); only if it survives the
// timeout AND no git process is running do we treat it as stale and remove it.
import { existsSync, statSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const gitDir = (() => {
  try {
    return execSync('git rev-parse --git-dir', { encoding: 'utf-8' }).trim()
  } catch {
    return '.git'
  }
})()

const lockPath = resolve(gitDir, 'index.lock')

// A Gitcito instance open on THIS repo is the usual culprit: its background
// `git status` refreshes grab index.lock and race release-it's commit. Detect
// it up front so the user can close it instead of hitting a mid-release crash.
const gitcitoOnThisRepo = () => {
  try {
    const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim()
    const out = execSync('pgrep -fl Electron', { encoding: 'utf-8' })
    return out
      .split('\n')
      .some((line) => line.includes(`--app-path=${repoRoot}`))
  } catch {
    return false
  }
}

if (gitcitoOnThisRepo()) {
  console.error(
    '\n✖ Gitcito appears to be running on this repository.\n' +
      '  Its background git refreshes race release-it for .git/index.lock.\n' +
      '  Close Gitcito (and any `electron-vite dev` session) for this repo, then retry.\n'
  )
  process.exit(1)
}

const sleep = (ms) => {
  const end = Date.now() + ms
  while (Date.now() < end) {
    // busy-wait: this script is short-lived and runs synchronously before init
  }
}

const gitProcessRunning = () => {
  try {
    // Match real git invocations, not this node script or editors.
    const out = execSync("pgrep -fl '(^|/)git '", { encoding: 'utf-8' }).trim()
    return out.length > 0
  } catch {
    return false // pgrep exits non-zero when nothing matches
  }
}

if (!existsSync(lockPath)) {
  process.exit(0)
}

// Poll: a transient lock from a concurrent `git status` clears within ~1s.
const TIMEOUT_MS = 5000
const INTERVAL_MS = 250
const start = Date.now()
while (existsSync(lockPath) && Date.now() - start < TIMEOUT_MS) {
  sleep(INTERVAL_MS)
}

if (!existsSync(lockPath)) {
  process.exit(0) // cleared on its own
}

if (gitProcessRunning()) {
  console.error(
    `\n✖ ${lockPath} is held by a running git process.\n` +
      `  Close other git clients (including Gitcito if it has this repo open) and retry.\n`
  )
  process.exit(1)
}

const ageSec = Math.round((Date.now() - statSync(lockPath).mtimeMs) / 1000)
console.warn(
  `\n⚠ Removing stale ${lockPath} (age ~${ageSec}s, no git process running).\n`
)
rmSync(lockPath)
process.exit(0)
