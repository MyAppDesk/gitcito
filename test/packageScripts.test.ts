import { describe, it, expect, afterAll } from 'vitest'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { detectPackageManager, nearestPackageDir, readPackageScripts, shellCwd } from '../src/main/packageScripts'

const root = realpathSync(mkdtempSync(join(tmpdir(), 'gitcito-scripts-')))
afterAll(() => rmSync(root, { recursive: true, force: true }))

writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: { dev: 'vite', build: 'vite build', bad: 42 } }))
mkdirSync(join(root, 'web', 'src'), { recursive: true })
writeFileSync(join(root, 'web', 'package.json'), JSON.stringify({ scripts: { LOCAL_SERVER: 'node server.js' } }))
writeFileSync(join(root, 'web', 'pnpm-lock.yaml'), '')

describe('package scripts for the terminal', () => {
  it('reads the package.json nearest the current directory', async () => {
    expect(nearestPackageDir(join(root, 'web', 'src'))).toBe(join(root, 'web'))
    const web = await readPackageScripts(join(root, 'web', 'src'))
    expect(web).toEqual({ dir: join(root, 'web'), manager: 'pnpm', scripts: { LOCAL_SERVER: 'node server.js' } })
  })

  it('keeps only string scripts, and defaults to npm', async () => {
    expect(await readPackageScripts(root)).toEqual({ dir: root, manager: 'npm', scripts: { dev: 'vite', build: 'vite build' } })
  })

  it('tells the package manager from its lockfile', () => {
    expect(detectPackageManager(['yarn.lock'])).toBe('yarn')
    expect(detectPackageManager(['bun.lockb'])).toBe('bun')
    expect(detectPackageManager(['pnpm-lock.yaml', 'yarn.lock'])).toBe('pnpm')
    expect(detectPackageManager([])).toBe('npm')
  })

  it.runIf(process.platform === 'linux')('finds a process’s current directory', async () => {
    expect(await shellCwd(process.pid)).toBe(realpathSync(process.cwd()))
    expect(await shellCwd(undefined)).toBeNull()
  })
})
