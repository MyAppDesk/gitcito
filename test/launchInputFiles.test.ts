import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveLaunchInputs } from '../src/main/launchInputFiles'
import type { LaunchInput } from '../src/shared/types'

const folders: string[] = []
async function workspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'gitcito-input-files-'))
  folders.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(folders.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

const versionInput: LaunchInput = {
  id: 'version', type: 'promptString',
  description: 'Current: ${fileValue:version} (${fileValue:build})',
  default: '',
  fileValues: {
    version: { file: 'version.yaml', key: 'settings.base.MARKETING_VERSION' },
    build: { file: 'version.yaml', key: 'settings.base.CURRENT_PROJECT_VERSION' }
  }
}
const yaml = (version: string, build: number): string =>
  `# editable version\nsettings:\n  base:\n    MARKETING_VERSION: '${version}'\n    CURRENT_PROJECT_VERSION: ${build}\n`

async function resolved(dir: string, input: LaunchInput): Promise<LaunchInput> {
  const result = await resolveLaunchInputs(dir, [input])
  if ('error' in result) throw new Error(JSON.stringify(result.error))
  return result.inputs[0]
}

describe('file values in launch inputs', () => {
  it('shows YAML version/build, preserves an optional blank, and does not modify files or definitions', async () => {
    const dir = await workspace()
    const source = yaml('1.0.1', 2)
    await writeFile(join(dir, 'version.yaml'), source)
    const input = await resolved(dir, versionInput)
    expect(input.description).toBe('Current: 1.0.1 (2)')
    expect(input.default).toBe('')
    expect(versionInput.description).toContain('${fileValue:version}')
    expect(await readFile(join(dir, 'version.yaml'), 'utf8')).toBe(source)
  })

  it('reads the file again for each launch, including manual corrections', async () => {
    const dir = await workspace()
    await writeFile(join(dir, 'version.yaml'), yaml('1.0.1', 2))
    expect((await resolved(dir, versionInput)).description).toBe('Current: 1.0.1 (2)')
    await writeFile(join(dir, 'version.yaml'), yaml('1.0.0', 3))
    expect((await resolved(dir, versionInput)).description).toBe('Current: 1.0.0 (3)')
  })

  it('prefills a default from JSON and supports numbers, booleans, and array indices', async () => {
    const dir = await workspace()
    await writeFile(join(dir, 'package.json'), JSON.stringify({ version: '2.3.4', ports: [0], enabled: false }))
    const input: LaunchInput = {
      id: 'json', type: 'promptString', description: '${fileValue:port} / ${fileValue:enabled}',
      default: '${fileValue:version}', fileValues: {
        version: { file: 'package.json', key: 'version' },
        port: { file: 'package.json', key: 'ports.0' },
        enabled: { file: 'package.json', key: 'enabled' }
      }
    }
    expect(await resolved(dir, input)).toMatchObject({ default: '2.3.4', description: '0 / false' })
  })

  it('leaves plain inputs unchanged and supports pickString descriptions and defaults', async () => {
    const dir = await workspace()
    const plain: LaunchInput = { id: 'token', type: 'promptString', password: true }
    expect(await resolved(dir, plain)).toEqual(plain)
    await writeFile(join(dir, 'config.yml'), 'target: staging\n')
    expect(await resolved(dir, {
      id: 'target', type: 'pickString', options: ['staging', 'production'],
      default: '${fileValue:target}', fileValues: { target: { file: 'config.yml', key: 'target' } }
    })).toMatchObject({ default: 'staging', options: ['staging', 'production'] })
  })

  it('resolves only referenced values and never evaluates returned text', async () => {
    const dir = await workspace()
    await writeFile(join(dir, 'config.json'), JSON.stringify({ text: '${fileValue:other}' }))
    expect(await resolved(dir, {
      id: 'text', type: 'promptString', description: '${fileValue:text}', fileValues: {
        text: { file: 'config.json', key: 'text' },
        other: { file: 'missing.json', key: 'secret' }
      }
    })).toMatchObject({ description: '${fileValue:other}' })
  })

  it.each(['missing', 'object', 'nothing', '__proto__', 'constructor', 'version.length'])('rejects missing or non-scalar JSON property %s', async (key) => {
    const dir = await workspace()
    await writeFile(join(dir, 'config.json'), JSON.stringify({ object: {}, nothing: null, version: '1.0.0' }))
    expect(await resolveLaunchInputs(dir, [{
      id: 'v', type: 'promptString', default: '${fileValue:value}',
      fileValues: { value: { file: 'config.json', key } }
    }])).toEqual({ error: { id: 'v', source: 'config.json#' + key, reason: 'file' } })
  })

  it('rejects malformed data without exposing parser snippets', async () => {
    const dir = await workspace()
    await writeFile(join(dir, 'version.yaml'), 'secret: [PRIVATE-CONTENT\n')
    const result = await resolveLaunchInputs(dir, [versionInput])
    expect(result).toHaveProperty('error.reason', 'file')
    expect(JSON.stringify(result)).not.toContain('PRIVATE-CONTENT')
  })

  it('reports missing files and undefined template values', async () => {
    const dir = await workspace()
    expect(await resolveLaunchInputs(dir, [versionInput])).toHaveProperty('error.source', 'version.yaml#settings.base.MARKETING_VERSION')
    expect(await resolveLaunchInputs(dir, [{ id: 'v', type: 'promptString', default: '${fileValue:unknown}' }]))
      .toEqual({ error: { id: 'v', source: 'unknown', reason: 'file' } })
  })

  it('blocks traversal, absolute paths, and symlinks outside the workspace', async () => {
    const parent = await workspace()
    const dir = join(parent, 'repo')
    await mkdir(dir)
    await writeFile(join(parent, 'secret.json'), '{"value":"secret"}')
    await symlink(join(parent, 'secret.json'), join(dir, 'link.json'))
    for (const file of ['../secret.json', join(parent, 'secret.json'), 'link.json']) {
      expect(await resolveLaunchInputs(dir, [{
        id: 'v', type: 'promptString', default: '${fileValue:value}',
        fileValues: { value: { file, key: 'value' } }
      }])).toHaveProperty('error.reason', 'file')
    }
  })

  it('resolves nested-workspace files relative to the launch directory', async () => {
    const dir = await workspace()
    const child = join(dir, 'service')
    await mkdir(child)
    await writeFile(join(dir, 'version.yaml'), yaml('1.0.0', 1))
    await writeFile(join(child, 'version.yaml'), yaml('9.8.7', 65))
    expect((await resolved(child, versionInput)).description).toBe('Current: 9.8.7 (65)')
  })

  it('rejects oversized files, directories, and unsupported file types', async () => {
    const dir = await workspace()
    await writeFile(join(dir, 'big.json'), ' '.repeat(1024 * 1024 + 1))
    await mkdir(join(dir, 'directory.json'))
    await writeFile(join(dir, 'script.js'), '{"value":1}')
    for (const file of ['big.json', 'directory.json', 'script.js']) {
      expect(await resolveLaunchInputs(dir, [{
        id: 'v', type: 'promptString', default: '${fileValue:value}',
        fileValues: { value: { file, key: 'value' } }
      }])).toHaveProperty('error.reason', 'file')
    }
  })

  it('aborts unsupported command inputs instead of displaying an empty text prompt', async () => {
    expect(await resolveLaunchInputs('/unused', [{ id: 'v', type: 'command' }]))
      .toEqual({ error: { id: 'v', source: 'command', reason: 'type' } })
  })
})
