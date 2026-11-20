import type { TestFile } from '../../../shared/types'

/**
 * The files and tests the Tests panel shows: only failures when asked, and
 * only names (or paths) containing the query. A file whose path matches keeps
 * all its tests; otherwise only its matching tests stay, and a file left with
 * none disappears.
 */
export function filterTestFiles(files: readonly TestFile[], opts: { failedOnly: boolean; query: string }): TestFile[] {
  const q = opts.query.trim().toLowerCase()
  const out: TestFile[] = []
  for (const f of files) {
    let tests = opts.failedOnly ? f.tests.filter((t) => t.status === 'failed') : f.tests
    if (q && !f.file.toLowerCase().includes(q)) tests = tests.filter((t) => t.name.toLowerCase().includes(q))
    if (tests.length) out.push({ ...f, tests })
  }
  return out
}
