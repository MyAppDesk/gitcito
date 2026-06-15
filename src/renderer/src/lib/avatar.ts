// Avatar helpers: Gravatar lookup (SHA-256 email hash) + a deterministic
// generated fallback so we never fall back to a bare letter.

/** Fast deterministic string hash (FNV-1a-ish), returns uint32. */
function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const genCache = new Map<string, string>()

/**
 * A simple-but-cool generated avatar: a diagonal 2-colour gradient with a
 * translucent third-colour blob, derived deterministically from the seed.
 * Returned as an SVG data-URI usable as <img> src or CSS background.
 */
export function generatedAvatar(seed: string): string {
  const key = seed || '?'
  const cached = genCache.get(key)
  if (cached) return cached

  const h = hashSeed(key)
  const h1 = h % 360
  const h2 = (h1 + 45 + ((h >> 9) % 60)) % 360
  const h3 = (h1 + 180 + ((h >> 17) % 60)) % 360
  const cx = 20 + ((h >> 3) % 45)
  const cy = 18 + ((h >> 11) % 48)
  const r = 22 + ((h >> 20) % 22)

  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='hsl(${h1} 68% 56%)'/>` +
    `<stop offset='1' stop-color='hsl(${h2} 70% 48%)'/>` +
    `</linearGradient></defs>` +
    `<rect width='80' height='80' fill='url(#g)'/>` +
    `<circle cx='${cx}' cy='${cy}' r='${r}' fill='hsl(${h3} 85% 66%)' opacity='0.55'/>` +
    `</svg>`

  const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`
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
