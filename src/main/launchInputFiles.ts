import { open, realpath } from 'node:fs/promises'
import { extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { JSON_SCHEMA, load } from 'js-yaml'
import type { LaunchInput, LaunchInputResolution } from '../shared/types'

const MAX_FILE_BYTES = 1024 * 1024
const TOKEN = /\$\{fileValue:([^}]+)\}/g

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function inside(folder: string, file: string): boolean {
  const path = relative(folder, file)
  return path !== '..' && !path.startsWith('..' + sep) && !isAbsolute(path)
}

async function readDocument(folder: string, file: string): Promise<unknown> {
  if (isAbsolute(file)) throw new Error('absolute path')
  const root = await realpath(folder)
  const candidate = resolve(root, file)
  if (!inside(root, candidate)) throw new Error('path outside workspace')
  const target = await realpath(candidate)
  if (!inside(root, target)) throw new Error('symlink outside workspace')
  const extension = extname(file).toLowerCase()
  if (!['.json', '.yaml', '.yml'].includes(extension)) throw new Error('unsupported format')
  const handle = await open(target, 'r')
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) throw new Error('not a small regular file')
    // Bound the read even if another process grows the file after stat().
    const buffer = Buffer.alloc(MAX_FILE_BYTES + 1)
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
    if (bytesRead > MAX_FILE_BYTES) throw new Error('file too large')
    const text = buffer.subarray(0, bytesRead).toString('utf8')
    return extension === '.json' ? JSON.parse(text) : load(text, { schema: JSON_SCHEMA })
  } finally {
    await handle.close()
  }
}

function scalarAt(document: unknown, key: string): string {
  const parts = key.split('.')
  if (parts.length > 64 || parts.some((part) => !part || ['__proto__', 'prototype', 'constructor'].includes(part))) {
    throw new Error('invalid property path')
  }
  let value = document
  for (const part of parts) {
    if ((!isRecord(value) && !Array.isArray(value)) || !Object.hasOwn(value, part)) {
      throw new Error('missing property')
    }
    value = (value as Record<string, unknown>)[part]
  }
  if (typeof value === 'string' || typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value))) return String(value)
  throw new Error('property must be a scalar')
}

/** Read only the requested inputs, immediately before prompting. No cross-launch cache. */
export async function resolveLaunchInputs(folder: string, inputs: LaunchInput[]): Promise<LaunchInputResolution> {
  const documents = new Map<string, unknown>()
  const resolved: LaunchInput[] = []
  for (const input of inputs) {
    if (input.type !== 'promptString' && input.type !== 'pickString') {
      return { error: { id: input.id, source: input.type, reason: 'type' } }
    }
    let source = ''
    try {
      const values = new Map<string, string>()
      // Resolve templates once: a value containing another token stays literal.
      for (const text of [input.description, input.default]) {
        if (text === undefined) continue
        for (const match of text.matchAll(TOKEN)) {
          const name = match[1]
          source = name
          if (values.has(name)) continue
          const ref = input.fileValues && Object.hasOwn(input.fileValues, name) ? input.fileValues[name] : null
          if (!ref || typeof ref.file !== 'string' || !ref.file ||
              typeof ref.key !== 'string' || !ref.key) throw new Error('invalid file value')
          source = ref.file + '#' + ref.key
          if (!documents.has(ref.file)) documents.set(ref.file, await readDocument(folder, ref.file))
          values.set(name, scalarAt(documents.get(ref.file), ref.key))
        }
      }
      const expand = (text: string): string => text.replace(TOKEN, (_match, name: string) => values.get(name)!)
      resolved.push({
        ...input,
        ...(input.description !== undefined ? { description: expand(input.description) } : {}),
        ...(input.default !== undefined ? { default: expand(input.default) } : {})
      })
    } catch {
      // Do not forward parser errors: they may quote unrelated file contents.
      return { error: { id: input.id, source, reason: 'file' } }
    }
  }
  return { inputs: resolved }
}
