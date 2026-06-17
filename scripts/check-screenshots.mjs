#!/usr/bin/env node
// Release guard: warn when the screenshots in docs/ are likely stale.
//
// Run automatically by release-it (before:init hook). Compares the last commit
// that touched renderer/app source against the last commit that touched
// docs/screenshots. If source is newer, the captured images probably no longer
// match the app, so we prompt before cutting a release.
//
// Non-interactive (CI, no TTY): never blocks — just prints a notice.
import { execSync } from 'node:child_process'
import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

const lastTouched = (path) => {
  try {
    const ts = execSync(`git log -1 --format=%ct -- ${path}`, { encoding: 'utf-8' }).trim()
    return ts ? Number(ts) : 0
  } catch {
    return 0
  }
}

const srcAt = Math.max(lastTouched('src'), lastTouched('examples/screenshots'))
const shotsAt = lastTouched('docs/screenshots')

if (shotsAt === 0 || srcAt <= shotsAt) {
  process.exit(0) // never captured, or screenshots are at least as new as source
}

const days = Math.round((srcAt - shotsAt) / 86400)
console.log(
  `\n⚠  App source changed more recently than docs/screenshots (~${days} day(s) ago).\n` +
    `   The screenshots in the README may be out of date.\n`
)

if (!stdout.isTTY) {
  console.log('   (non-interactive — continuing release; run `npm run screenshots` if needed)\n')
  process.exit(0)
}

const rl = createInterface({ input: stdin, output: stdout })
const answer = (await rl.question('   [r]egenerate now · [c]ontinue release · [a]bort? ')).trim().toLowerCase()
rl.close()

if (answer === 'a' || answer === '') {
  console.log('   Release aborted.')
  process.exit(1)
}
if (answer === 'r') {
  console.log('\n▶ regenerating screenshots…\n')
  const res = spawnSync('npm', ['run', 'screenshots'], { stdio: 'inherit' })
  if (res.status !== 0) process.exit(res.status ?? 1)
  console.log(
    '\n✅ screenshots regenerated. Commit them, then re-run the release ' +
      '(release-it needs a clean working tree).\n'
  )
  process.exit(1) // stop this release; the tree is now dirty
}
// 'c' or anything else → continue
process.exit(0)
