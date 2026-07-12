import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto'
import type { SecureBundleHeader } from '../shared/types'

// Pure pack/unpack logic for .gitcito secure bundles — a password-encrypted
// set of repo files (typically .env and friends) shared out-of-band and
// re-materialized at the same relative paths in another checkout. No Electron
// imports so it stays unit-testable; dialogs and IPC live in secureShare.ts.
//
// Envelope (plaintext JSON): format marker, project name, KDF + cipher params.
// Payload: JSON `{ files: [{ path, content(b64), executable? }] }`, encrypted
// with AES-256-GCM under a scrypt-derived key. GCM authenticates, so a wrong
// password and a tampered file are indistinguishable — both fail the auth tag.

export const BUNDLE_FORMAT = 'gitcito-secure-bundle'
export const BUNDLE_VERSION = 1

const SCRYPT = { N: 32768, r: 8, p: 1 }
const SCRYPT_MAXMEM = 64 * 1024 * 1024

export interface BundleFile {
  path: string
  content: Buffer
  executable?: boolean
}

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

export function packBundle(project: string, files: BundleFile[], password: string): string {
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = deriveKey(password, salt)
  const plain = Buffer.from(
    JSON.stringify({
      files: files.map((f) => ({
        path: f.path.replace(/\\/g, '/'),
        content: f.content.toString('base64'),
        ...(f.executable ? { executable: true } : {})
      }))
    }),
    'utf-8'
  )
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plain), cipher.final()])
  const bundle = {
    format: BUNDLE_FORMAT,
    version: BUNDLE_VERSION,
    project,
    createdAt: Date.now(),
    fileCount: files.length,
    kdf: { algo: 'scrypt', ...SCRYPT, salt: salt.toString('base64') },
    cipher: { algo: 'aes-256-gcm', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') },
    payload: enc.toString('base64')
  }
  return JSON.stringify(bundle, null, 2)
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
  return {
    project: typeof raw.project === 'string' ? raw.project : 'unknown',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : 0,
    fileCount: typeof raw.fileCount === 'number' ? raw.fileCount : 0
  }
}

export function unpackBundle(text: string, password: string): BundleFile[] {
  if (readBundleHeader(text) === null) throw new BundleError('invalid')
  const raw = JSON.parse(text) as {
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
  let parsed: { files?: Array<{ path?: string; content?: string; executable?: boolean }> }
  try {
    parsed = JSON.parse(plain.toString('utf-8'))
  } catch {
    throw new BundleError('invalid')
  }
  if (!Array.isArray(parsed.files)) throw new BundleError('invalid')
  return parsed.files
    .filter((f) => typeof f.path === 'string' && typeof f.content === 'string')
    .map((f) => ({
      path: f.path as string,
      content: Buffer.from(f.content as string, 'base64'),
      ...(f.executable ? { executable: true } : {})
    }))
}
