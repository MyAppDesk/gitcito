// Decides whether a failed Release run should be re-run: only when every job
// that failed or was cancelled never started a step — the mark of a job no
// runner picked up (GitHub's macOS queue runs dry now and then). A real build
// failure ran steps, so it is never retried and never loops.
//
// Usage: gh api …/attempts/N/jobs | node scripts/release-retry.mjs
// Prints `retry` or `stop: <reason>`.

const BAD = new Set(['failure', 'cancelled', 'timed_out', 'startup_failure'])

/** @param {{ jobs?: Array<{ name: string; conclusion: string | null; steps?: Array<{ conclusion: string | null }> }> }} payload */
export function retryDecision(payload) {
  const jobs = payload.jobs ?? []
  const bad = jobs.filter((j) => BAD.has(j.conclusion ?? ''))
  if (!bad.length) return { retry: false, reason: 'no failed job' }
  // A step that ran has a conclusion; one that never did has none, or the list is empty.
  const ran = bad.filter((j) => (j.steps ?? []).some((s) => s.conclusion && s.conclusion !== 'skipped'))
  if (ran.length) return { retry: false, reason: `a real failure in ${ran.map((j) => j.name).join(', ')}` }
  return { retry: true, reason: `never started: ${bad.map((j) => j.name).join(', ')}` }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let input = ''
  process.stdin.on('data', (c) => (input += c))
  process.stdin.on('end', () => {
    const d = retryDecision(JSON.parse(input || '{}'))
    console.log(d.retry ? 'retry' : `stop: ${d.reason}`)
  })
}
