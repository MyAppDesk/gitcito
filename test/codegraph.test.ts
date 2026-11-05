import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync, mkdirSync, existsSync, writeFileSync, chmodSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { codegraphCommand, indexCodegraphAsync } from '../src/main/codegraph'

const HOSTILE = ['$(touch PWNED)', '`touch PWNED`', 'a"; touch PWNED; "b', "a'; touch PWNED; 'b", 'with spaces/x']

describe('codegraph worktree indexing', () => {
  it('does nothing when the setting is off', () => {
    const spawner = vi.fn(() => ({ unref() {} }))
    expect(indexCodegraphAsync('/tmp/wt', false, 'linux', spawner)).toBe(false)
    expect(spawner).not.toHaveBeenCalled()
  })

  it('passes the path as one argv entry with no shell on POSIX', () => {
    for (const name of HOSTILE) {
      const spawner = vi.fn((_f: string, _a: string[], _o: object) => ({ unref() {} }))
      const dir = `/tmp/${name}`
      expect(indexCodegraphAsync(dir, true, 'linux', spawner)).toBe(true)
      const [file, args, opts] = spawner.mock.calls[0]
      expect(file).toBe('codegraph')
      expect(args).toEqual(['init', dir])
      expect(opts).toMatchObject({ shell: false, cwd: dir })
    }
  })

  it('refuses cmd.exe metacharacters on Windows and quotes the rest', () => {
    expect(codegraphCommand('C:\\a"&calc', 'win32')).toBeNull()
    expect(codegraphCommand('C:\\a%PATH%', 'win32')).toBeNull()
    expect(codegraphCommand('C:\\a|calc', 'win32')).toBeNull()
    const ok = codegraphCommand('C:\\my repo\\wt', 'win32')
    expect(ok?.args.at(-1)).toBe('"codegraph init "C:\\my repo\\wt""')
  })

  it.skipIf(process.platform === 'win32')('a real spawn with hostile folder names executes nothing', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cg-'))
    const bin = join(root, 'bin')
    mkdirSync(bin)
    const log = join(root, 'args.log')
    writeFileSync(join(bin, 'codegraph'), `#!/bin/sh\nprintf '%s\\n' "$2" >> "${log}"\n`)
    chmodSync(join(bin, 'codegraph'), 0o755)
    const oldPath = process.env.PATH
    process.env.PATH = `${bin}:${oldPath}`
    try {
      const dirs = ['$(touch PWNED)', '`touch PWNED`', 'q"uote', 'sp ace'].map((n) => {
        const d = join(root, n)
        mkdirSync(d)
        return d
      })
      for (const d of dirs) expect(indexCodegraphAsync(d, true)).toBe(true)
      await vi.waitFor(() => expect(readFileSync(log, 'utf8').trim().split('\n')).toHaveLength(dirs.length))
      expect(readFileSync(log, 'utf8').trim().split('\n').sort()).toEqual([...dirs].sort())
      expect(existsSync(join(root, 'PWNED'))).toBe(false)
      for (const d of dirs) expect(existsSync(join(d, 'PWNED'))).toBe(false)
    } finally {
      process.env.PATH = oldPath
    }
  })
})
