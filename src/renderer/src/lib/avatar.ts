// Avatar helpers: Gravatar lookup (SHA-256 email hash) + a deterministic
// generated fallback so we never fall back to a bare letter.

import { blobatarUri } from 'blobatar/uri'

const genCache = new Map<string, string>()

/**
 * The generated fallback: a deterministic blobatar derived from the seed,
 * as an SVG data-URI usable as <img> src or CSS background.
 *
 * `background: 'circle'` because `.ava` already clips to a disc — the default
 * transparent backdrop would let the row show through around the figure, so
 * gravatar photos and fallbacks would not read as the same shape. Cached per
 * seed: the graph re-renders the same authors on every scroll, and each URI is
 * ~1 KB of markup to rebuild.
 */
export function generatedAvatar(seed: string): string {
  const key = seed || '?'
  const cached = genCache.get(key)
  if (cached) return cached
  const uri = blobatarUri(key, { background: 'circle' })
  genCache.set(key, uri)
  return uri
}

const hexCache = new Map<string, string>()

async function sha256Hex(input: string): Promise<string> {
  const cached = hexCache.get(input)
  if (cached) return cached
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  hexCache.set(input, hex)
  return hex
}

const urlCache = new Map<string, string>()

/**
 * Gravatar URL for an email (Gravatar accepts SHA-256 hashes). Uses `d=404`
 * so a missing avatar 404s and the caller can fall back to the generated one.
 */
export async function gravatarUrl(email: string, size: number): Promise<string> {
  const norm = email.trim().toLowerCase()
  const key = `${norm}@${size}`
  const cached = urlCache.get(key)
  if (cached) return cached
  const hash = await sha256Hex(norm)
  const url = `https://gravatar.com/avatar/${hash}?s=${size}&d=404`
  urlCache.set(key, url)
  return url
}
