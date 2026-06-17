import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { MANIFEST, SETUP_SCRIPT } from '../helpers'

// Ensure the playground fixtures exist before any test runs.
//   - CI / fresh checkout: MANIFEST.tsv is absent → generate it.
//   - Local: regenerate only if missing (set PLAYGROUND_FORCE=1 to force).
// Re-running the script wipes and recreates examples/playground deterministically.
export default function setup(): void {
  const force = process.env.PLAYGROUND_FORCE === '1'
  if (!force && existsSync(MANIFEST)) return
  // eslint-disable-next-line no-console
  console.log('[playground] generating fixtures via setup-playground.sh …')
  execFileSync('bash', [SETUP_SCRIPT], { stdio: 'inherit' })
}
