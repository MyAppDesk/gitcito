import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto'
import type { SecureBundleHeader, SecureBundleSectionSummary, SecureWorkspaceTab } from '../shared/types'

// Pure pack/unpack logic for .gitcito secure bundles — a password-encrypted set
// of sections shared out-of-band. A section is either a repo's files (typically
// .env and friends, re-materialised at the same relative paths in another
// checkout) or the global vault's key/value secrets. No Electron imports so it
// stays unit-testable; dialogs, fs and IPC live in secureShare.ts.
//
// Envelope (plaintext JSON): format marker, version, project label, a per-section
// summary (repo folder/remote for import-time matching, or vault entry count) —
// everything the import UI needs before the password. Payload: JSON
// `{ sections: [...] }`, encrypted with AES-256-GCM under a scrypt-derived key.
// GCM authenticates, so a wrong password and a tampered file both fail the tag.
//
// v1 (legacy single-repo) bundles carried `{ files: [...] }` and no sections; we
// still read them, upgrading to a single repo section on unpack.

export const BUNDLE_FORMAT = 'gitcito-secure-bundle'
// v2: repo + vault sections. v3 added workspace-structure and git-notes
// sections; a bundle is stamped v3 only when it carries one, so older builds
// refuse it cleanly as unsupported-version instead of misreading it.
export const BUNDLE_VERSION = 3
const BASE_VERSION = 2

const SCRYPT = { N: 32768, r: 8, p: 1 }
const SCRYPT_MAXMEM = 64 * 1024 * 1024

export interface BundleFile {
  path: string
  content: Buffer
  executable?: boolean
}

export interface BundleVaultEntry {
  key: string
  value: string
  note?: string
}

/** One git note, pinned to the commit it annotates. */
export interface BundleNote {
  sha: string
  body: string
}

/** A section of a bundle, in memory (Buffers, secret values). Repo files land at
 *  relative paths in a target repo; vault entries merge into the global vault;
 *  a workspace section recreates tab structure; a notes section applies git
 *  notes into a matched repo. */
export type BundleSection =
  | { kind: 'repo'; project: string; folder: string; remote?: string; files: BundleFile[] }
  | { kind: 'vault'; entries: BundleVaultEntry[] }
  | { kind: 'workspace'; name: string; tabs: SecureWorkspaceTab[] }
  | { kind: 'notes'; folder: string; remote?: string; ref: string; notes: BundleNote[] }

export class BundleError extends Error {
  constructor(public code: 'invalid' | 'bad-password' | 'unsupported-version') {
    super(code)
  }
}

/** True for a relative path that cannot escape the repo it is written into:
 *  no absolute paths, drive letters, `.`/`..` segments, or empty segments. */
export function isSafeRelPath(p: string): boolean {
  if (!p || p.length > 1024) return false
  const norm = p.replace(/\\/g, '/')
  if (norm.startsWith('/') || /^[a-zA-Z]:/.test(norm)) return false
  return norm.split('/').every((seg) => seg !== '' && seg !== '.' && seg !== '..')
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32, { ...SCRYPT, maxmem: SCRYPT_MAXMEM })
}

function summarise(section: BundleSection): SecureBundleSectionSummary {
  if (section.kind === 'vault') return { kind: 'vault', entryCount: section.entries.length }
  if (section.kind === 'workspace') {
    const repoCount = section.tabs.reduce((n, t) => n + (t.kind === 'repo' ? 1 : t.repos.length), 0)
    return { kind: 'workspace', name: section.name, tabCount: section.tabs.length, repoCount }
  }
  if (section.kind === 'notes') {
    return {
      kind: 'notes',
      folder: section.folder,
      ...(section.remote ? { remote: section.remote } : {}),
      ref: section.ref,
      noteCount: section.notes.length
    }
  }
  return {
    kind: 'repo',
    project: section.project,
    folder: section.folder,
    ...(section.remote ? { remote: section.remote } : {}),
    fileCount: section.files.length
  }
}

function encodeSection(section: BundleSection): unknown {
  if (section.kind === 'vault') {
    return {
      kind: 'vault',
      entries: section.entries.map((e) => ({ key: e.key, value: e.value, ...(e.note ? { note: e.note } : {}) }))
    }
  }
  if (section.kind === 'workspace') return { kind: 'workspace', name: section.name, tabs: section.tabs }
  if (section.kind === 'notes') {
    return {
      kind: 'notes',
      folder: section.folder,
      ...(section.remote ? { remote: section.remote } : {}),
      ref: section.ref,
      notes: section.notes.map((n) => ({ sha: n.sha, body: n.body }))
    }
  }
  return {
    kind: 'repo',
    project: section.project,
    folder: section.folder,
    ...(section.remote ? { remote: section.remote } : {}),
    files: section.files.map((f) => ({
      path: f.path.replace(/\\/g, '/'),
      content: f.content.toString('base64'),
      ...(f.executable ? { executable: true } : {})
    }))
  }
}

/** Pack sections into a v2 `.gitcito` bundle string. `project` is the envelope
 *  label shown before unlock (a repo name, or e.g. "Workspace" for a multi-repo
 *  bundle). */
export function packSections(project: string, sections: BundleSection[], password: string): string {
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = deriveKey(password, salt)
  const plain = Buffer.from(JSON.stringify({ sections: sections.map(encodeSection) }), 'utf-8')
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plain), cipher.final()])
  const fileCount = sections.reduce((n, s) => n + (s.kind === 'repo' ? s.files.length : 0), 0)
  // Stamp the lowest version that can express this bundle, so a v2-only build
  // still opens bundles that carry nothing new.
  const version = sections.every((s) => s.kind === 'repo' || s.kind === 'vault') ? BASE_VERSION : BUNDLE_VERSION
  const bundle = {
    format: BUNDLE_FORMAT,
    version,
    project,
    createdAt: Date.now(),
    fileCount,
    sections: sections.map(summarise),
    kdf: { algo: 'scrypt', ...SCRYPT, salt: salt.toString('base64') },
    cipher: { algo: 'aes-256-gcm', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') },
    payload: enc.toString('base64')
  }
  return JSON.stringify(bundle, null, 2)
}

/** Back-compat convenience: pack a single repo's files as a v2 bundle. */
export function packBundle(project: string, files: BundleFile[], password: string): string {
  return packSections(project, [{ kind: 'repo', project, folder: project, files }], password)
}

/** Parse the plaintext envelope without decrypting. Returns null when the text
 *  is not a gitcito bundle at all; throws on a bundle from a newer version. */
export function readBundleHeader(text: string): SecureBundleHeader | null {
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
  if (!raw || raw.format !== BUNDLE_FORMAT) return null
  if (typeof raw.version !== 'number' || raw.version > BUNDLE_VERSION) {
    throw new BundleError('unsupported-version')
  }
  const project = typeof raw.project === 'string' ? raw.project : 'unknown'
  const createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : 0
  const fileCount = typeof raw.fileCount === 'number' ? raw.fileCount : 0
  const header: SecureBundleHeader = { project, createdAt, fileCount, version: raw.version }
  if (raw.version >= 2 && Array.isArray(raw.sections)) {
    header.sections = raw.sections as SecureBundleSectionSummary[]
  } else {
    // Synthesise a single repo tab so the import UI is uniform across versions.
    header.sections = [{ kind: 'repo', project, folder: project, fileCount }]
  }
  return header
}

function decrypt(text: string, password: string): { version: number; obj: Record<string, unknown> } {
  const head = readBundleHeader(text)
  if (head === null) throw new BundleError('invalid')
  const raw = JSON.parse(text) as {
    version?: number
    kdf?: { salt?: string }
    cipher?: { iv?: string; tag?: string }
    payload?: string
  }
  if (!raw.kdf?.salt || !raw.cipher?.iv || !raw.cipher?.tag || !raw.payload) {
    throw new BundleError('invalid')
  }
  const key = deriveKey(password, Buffer.from(raw.kdf.salt, 'base64'))
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(raw.cipher.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(raw.cipher.tag, 'base64'))
  let plain: Buffer
  try {
    plain = Buffer.concat([decipher.update(Buffer.from(raw.payload, 'base64')), decipher.final()])
  } catch {
    throw new BundleError('bad-password')
  }
  try {
    return { version: raw.version ?? 1, obj: JSON.parse(plain.toString('utf-8')) }
  } catch {
    throw new BundleError('invalid')
  }
}

function decodeFiles(files: unknown): BundleFile[] {
  if (!Array.isArray(files)) throw new BundleError('invalid')
  return files
    .filter((f) => f && typeof f.path === 'string' && typeof f.content === 'string')
    .map((f) => ({
      path: f.path as string,
      content: Buffer.from(f.content as string, 'base64'),
      ...(f.executable ? { executable: true } : {})
    }))
}

/** Decrypt a bundle to its sections. A v1 bundle (`{ files }`) upgrades to a
 *  single repo section keyed by the envelope project name. */
export function unpackSections(text: string, password: string): BundleSection[] {
  const { version, obj } = decrypt(text, password)
  if (version >= 2) {
    const rawSections = obj.sections
    if (!Array.isArray(rawSections)) throw new BundleError('invalid')
    // Explicit dispatch by kind; a kind this build does not know is skipped
    // rather than misread (the version stamp keeps truly old builds out).
    const out: BundleSection[] = []
    for (const s of rawSections as Record<string, unknown>[]) {
      if (s.kind === 'vault') {
        const entries = Array.isArray(s.entries) ? s.entries : []
        out.push({
          kind: 'vault',
          entries: entries
            .filter((e) => e && typeof e.key === 'string' && typeof e.value === 'string')
            .map((e) => ({
              key: e.key as string,
              value: e.value as string,
              ...(typeof e.note === 'string' ? { note: e.note } : {})
            }))
        })
      } else if (s.kind === 'repo') {
        const project = typeof s.project === 'string' ? s.project : 'unknown'
        out.push({
          kind: 'repo',
          project,
          folder: typeof s.folder === 'string' ? s.folder : project,
          ...(typeof s.remote === 'string' ? { remote: s.remote } : {}),
          files: decodeFiles(s.files)
        })
      } else if (s.kind === 'workspace') {
        const tabs = Array.isArray(s.tabs) ? (s.tabs as SecureWorkspaceTab[]) : []
        out.push({
          kind: 'workspace',
          name: typeof s.name === 'string' ? s.name : 'Workspace',
          tabs: tabs.filter((t) => t && (t.kind === 'repo' ? !!t.repo : t.kind === 'group' && Array.isArray(t.repos)))
        })
      } else if (s.kind === 'notes') {
        const notes = Array.isArray(s.notes) ? s.notes : []
        out.push({
          kind: 'notes',
          folder: typeof s.folder === 'string' ? s.folder : 'unknown',
          ...(typeof s.remote === 'string' ? { remote: s.remote } : {}),
          ref: typeof s.ref === 'string' ? s.ref : 'refs/notes/commits',
          notes: notes
            .filter((n) => n && typeof n.sha === 'string' && typeof n.body === 'string')
            .map((n) => ({ sha: n.sha as string, body: n.body as string }))
        })
      }
      // any other kind: skipped on purpose
    }
    return out
  }
  // v1: single repo of files.
  const header = readBundleHeader(text)
  const project = header?.project ?? 'unknown'
  return [{ kind: 'repo', project, folder: project, files: decodeFiles(obj.files) }]
}

/** Back-compat: decrypt a bundle to a flat file list (repo sections only). */
export function unpackBundle(text: string, password: string): BundleFile[] {
  return unpackSections(text, password).flatMap((s) => (s.kind === 'repo' ? s.files : []))
}
