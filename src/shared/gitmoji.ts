// The gitmoji catalogue (https://gitmoji.dev) and the pure text logic around it.
// Shared because both sides need it: the renderer for the picker and for
// showing `:shortcode:` subjects as emoji, the main process for normalising
// what a model writes. No i18n here — labels are mapped to dictionary keys in
// the renderer (lib/gitmoji.ts), keyed by `code`.

/** Every official gitmoji, in gitmoji.dev order. `emoji` is the canonical
 *  form, including the U+FE0F variation selector where gitmoji.dev has one. */
export const GITMOJI_CATALOG = [
  { emoji: '🎨', code: 'art' },
  { emoji: '⚡️', code: 'zap' },
  { emoji: '🔥', code: 'fire' },
  { emoji: '🐛', code: 'bug' },
  { emoji: '🚑️', code: 'ambulance' },
  { emoji: '✨', code: 'sparkles' },
  { emoji: '📝', code: 'memo' },
  { emoji: '🚀', code: 'rocket' },
  { emoji: '💄', code: 'lipstick' },
  { emoji: '🎉', code: 'tada' },
  { emoji: '✅', code: 'white_check_mark' },
  { emoji: '🔒️', code: 'lock' },
  { emoji: '🔐', code: 'closed_lock_with_key' },
  { emoji: '🔖', code: 'bookmark' },
  { emoji: '🚨', code: 'rotating_light' },
  { emoji: '🚧', code: 'construction' },
  { emoji: '💚', code: 'green_heart' },
  { emoji: '⬇️', code: 'arrow_down' },
  { emoji: '⬆️', code: 'arrow_up' },
  { emoji: '📌', code: 'pushpin' },
  { emoji: '👷', code: 'construction_worker' },
  { emoji: '📈', code: 'chart_with_upwards_trend' },
  { emoji: '♻️', code: 'recycle' },
  { emoji: '➕', code: 'heavy_plus_sign' },
  { emoji: '➖', code: 'heavy_minus_sign' },
  { emoji: '🔧', code: 'wrench' },
  { emoji: '🔨', code: 'hammer' },
  { emoji: '🌐', code: 'globe_with_meridians' },
  { emoji: '✏️', code: 'pencil2' },
  { emoji: '💩', code: 'poop' },
  { emoji: '⏪️', code: 'rewind' },
  { emoji: '🔀', code: 'twisted_rightwards_arrows' },
  { emoji: '📦️', code: 'package' },
  { emoji: '👽️', code: 'alien' },
  { emoji: '🚚', code: 'truck' },
  { emoji: '📄', code: 'page_facing_up' },
  { emoji: '💥', code: 'boom' },
  { emoji: '🍱', code: 'bento' },
  { emoji: '♿️', code: 'wheelchair' },
  { emoji: '💡', code: 'bulb' },
  { emoji: '🍻', code: 'beers' },
  { emoji: '💬', code: 'speech_balloon' },
  { emoji: '🗃️', code: 'card_file_box' },
  { emoji: '🔊', code: 'loud_sound' },
  { emoji: '🔇', code: 'mute' },
  { emoji: '👥', code: 'busts_in_silhouette' },
  { emoji: '🚸', code: 'children_crossing' },
  { emoji: '🏗️', code: 'building_construction' },
  { emoji: '📱', code: 'iphone' },
  { emoji: '🤡', code: 'clown_face' },
  { emoji: '🥚', code: 'egg' },
  { emoji: '🙈', code: 'see_no_evil' },
  { emoji: '📸', code: 'camera_flash' },
  { emoji: '⚗️', code: 'alembic' },
  { emoji: '🔍️', code: 'mag' },
  { emoji: '🏷️', code: 'label' },
  { emoji: '🌱', code: 'seedling' },
  { emoji: '🚩', code: 'triangular_flag_on_post' },
  { emoji: '🥅', code: 'goal_net' },
  { emoji: '💫', code: 'dizzy' },
  { emoji: '🗑️', code: 'wastebasket' },
  { emoji: '🛂', code: 'passport_control' },
  { emoji: '🩹', code: 'adhesive_bandage' },
  { emoji: '🧐', code: 'monocle_face' },
  { emoji: '⚰️', code: 'coffin' },
  { emoji: '🧪', code: 'test_tube' },
  { emoji: '👔', code: 'necktie' },
  { emoji: '🩺', code: 'stethoscope' },
  { emoji: '🧱', code: 'bricks' },
  { emoji: '🧑‍💻', code: 'technologist' },
  { emoji: '💸', code: 'money_with_wings' },
  { emoji: '🧵', code: 'thread' },
  { emoji: '🦺', code: 'safety_vest' },
  { emoji: '✈️', code: 'airplane' },
  { emoji: '🦖', code: 't-rex' }
] as const

export type GitmojiCode = (typeof GITMOJI_CATALOG)[number]['code']
export type Gitmoji = (typeof GITMOJI_CATALOG)[number]

/** The gitmoji that matches each Conventional-Commit type, for the combined
 *  `✨ feat(scope): …` style. Choosing a type seeds its emoji. */
export const CC_TYPE_GITMOJI: Record<string, string> = {
  feat: '✨',
  fix: '🐛',
  docs: '📝',
  style: '🎨',
  refactor: '♻️',
  perf: '⚡️',
  test: '✅',
  build: '📦️',
  ci: '👷',
  chore: '🔧',
  revert: '⏪️'
}

// U+FE0F (emoji presentation) is optional in practice: gitmoji.dev writes `⚡️`,
// many tools and keyboards write `⚡`. Both must be recognised as the same one.
const VS16 = /\uFE0F/g
const bare = (s: string): string => s.replace(VS16, '')

const BY_BARE_EMOJI = new Map<string, Gitmoji>(GITMOJI_CATALOG.map((g) => [bare(g.emoji), g]))
const BY_CODE = new Map<string, Gitmoji>(GITMOJI_CATALOG.map((g) => [g.code, g]))
// Longest first, so a ZWJ sequence like 🧑‍💻 wins over a shorter prefix of it.
const BARE_EMOJIS = [...BY_BARE_EMOJI.keys()].sort((a, b) => b.length - a.length)

/** The catalogue entry for an emoji (with or without U+FE0F) or a `code`. */
export function findGitmoji(emojiOrCode: string): Gitmoji | undefined {
  const s = emojiOrCode.trim().replace(/^:|:$/g, '')
  return BY_CODE.get(s) ?? BY_BARE_EMOJI.get(bare(s))
}

/**
 * A leading gitmoji on a subject — unicode (`✨ x`) or shortcode (`:sparkles: x`).
 * `raw` is exactly what was written (so it can be preserved), `emoji` the
 * canonical form. Only gitmoji count: a subject that merely starts with some
 * other emoji is left alone.
 */
export function splitGitmoji(summary: string): { emoji: string; raw: string; rest: string } {
  const sc = /^:([a-z0-9_+-]+):(?: |$)/.exec(summary)
  if (sc) {
    const g = BY_CODE.get(sc[1])
    if (g) return { emoji: g.emoji, raw: `:${sc[1]}:`, rest: summary.slice(sc[0].length) }
  }
  for (const b of BARE_EMOJIS) {
    // Walk the subject past the emoji while tolerating a VS16 after any code unit.
    let i = 0
    let j = 0
    while (j < b.length && i < summary.length) {
      if (summary[i] === '\uFE0F') {
        i++
        continue
      }
      if (summary[i] !== b[j]) break
      i++
      j++
    }
    if (j < b.length) continue
    while (summary[i] === '\uFE0F') i++
    if (i === summary.length || summary[i] === ' ') {
      const g = BY_BARE_EMOJI.get(b)!
      return { emoji: g.emoji, raw: summary.slice(0, i), rest: summary.slice(i + (summary[i] === ' ' ? 1 : 0)) }
    }
  }
  return { emoji: '', raw: '', rest: summary }
}

/** Replace gitmoji `:shortcodes:` with their emoji, for display. Codes that are
 *  not gitmoji (`:foo:`, a time like `10:30:45`) are left exactly as written. */
export function emojifyGitmoji(text: string): string {
  if (!text.includes(':')) return text
  return text.replace(/:([a-z0-9_+-]+):/g, (whole, code: string) => BY_CODE.get(code)?.emoji ?? whole)
}

/**
 * Bring a model's subject into the combined `✨ type(scope): …` shape: shortcodes
 * become unicode, and a subject with a Conventional type but no gitmoji gets the
 * one that matches the type. Models follow the format instruction most of the
 * time; this makes the result deterministic for the times they do not.
 */
export function normalizeGitmojiConventional(summary: string): string {
  const s = summary.trim()
  const { emoji, rest } = splitGitmoji(s)
  const type = /^(\w+)(\([^)]*\))?!?:\s/.exec(rest)?.[1]
  const seeded = emoji || (type ? (CC_TYPE_GITMOJI[type] ?? '') : '')
  return seeded ? `${seeded} ${rest}` : s
}

/** Unicode-only form of a gitmoji-led subject (`:bug: x` → `🐛 x`). */
export function normalizeGitmojiUnicode(summary: string): string {
  const s = summary.trim()
  const { emoji, rest } = splitGitmoji(s)
  return emoji ? `${emoji} ${rest}` : s
}
