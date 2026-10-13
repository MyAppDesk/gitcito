# shellcheck shell=bash disable=SC2154
# 67. moved-code — a block cut from one place and pasted in another.
#
# Commits a small module, then leaves the working tree with parseConfig moved
# from the top of the file to the bottom, untouched, plus one ordinary edit
# (the default timeout). A plain diff shows the move as a deletion and an
# unrelated-looking addition; with "Moved code" on, both ends are tinted blue
# and their margin arrows point at each other.
#
# Verify:
#   • Select utils.ts (modified) ⇒ the parseConfig lines are blue at both ends,
#     with ↓ on the removed copy and ↑ on the added one; hovering an arrow
#     names the other end's line number.
#   • The DEFAULT_TIMEOUT edit stays red/green — an edit is not a move.
#   • Toggling "Moved code" off shows the move as plain −/+ again.
R="$ROOT/moved-code"
new_repo "$R"

cat > "$R/utils.ts" <<'EOF'
import { readFile } from 'node:fs/promises'

export function parseConfig(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const [key, value] = line.split('=')
    if (key && value) out[key.trim()] = value.trim()
  }
  return out
}

export async function loadConfig(path: string): Promise<Record<string, string>> {
  return parseConfig(await readFile(path, 'utf8'))
}

export const DEFAULT_TIMEOUT = 5000

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "utils: config helpers"

# parseConfig moves to the end unchanged; DEFAULT_TIMEOUT is edited in place.
cat > "$R/utils.ts" <<'EOF'
import { readFile } from 'node:fs/promises'

export async function loadConfig(path: string): Promise<Record<string, string>> {
  return parseConfig(await readFile(path, 'utf8'))
}

export const DEFAULT_TIMEOUT = 8000

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

export function parseConfig(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const [key, value] = line.split('=')
    if (key && value) out[key.trim()] = value.trim()
  }
  return out
}
EOF

summary "moved-code" "moved code: select utils.ts (modified) — parseConfig moved to the end is tinted blue with arrows, the timeout edit stays red/green"
