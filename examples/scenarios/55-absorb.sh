# shellcheck shell=bash disable=SC2154
# 55. absorb — staged fixes routed back to the commits that caused them.
#
# The branch has three unpushed commits, each owning a different file, and the
# working tree carries the review fixes for two of them plus one brand-new file
# that belongs to nothing yet:
#   • src/auth.ts       edited  → belongs to "feat: add auth"
#   • src/parser.ts     edited  → belongs to "feat: add parser"
#   • src/cache.ts      new     → belongs to nothing (stays staged)
# "feat: add logger" is untouched, so it must NOT appear in the plan.
#
# origin/main is behind the branch tip, which is what makes the three commits
# absorbable: anything already pushed is off limits.
#
# Verify:
#   • Stage everything, then Tools → "Absorb staged changes…" (or ⌘K) ⇒ the plan
#     lists TWO target commits — auth and parser — each with its own hunk, and
#     one unmatched hunk for src/cache.ts.
#   • The plan header says the candidate range is the unpushed one
#     (origin/main..HEAD); "feat: add logger" is absent.
#   • "Create fixups" ⇒ two new `fixup! …` commits appear in the graph, the
#     cache.ts change stays staged, and the working tree is otherwise untouched.
#   • "Create fixups & rebase" ⇒ same, then the fixups are folded in: the graph
#     is back to three commits, `git show` of each contains the fix, and
#     src/cache.ts is still staged and uncommitted.
#   • Absorb with nothing staged ⇒ says there is nothing to absorb.
#   • Absorb during a merge/rebase in progress ⇒ refuses rather than touching
#     the index.
R="$ROOT/absorb"
REMOTE="$ROOT/absorb-origin.git"

rm -rf "$REMOTE"
git init -q --bare "$REMOTE"

new_repo "$R"
mkdir -p "$R/src"
printf '# Absorb demo\n' > "$R/README.md"
git -C "$R" add -A && git -C "$R" commit -qm "init: readme"
git -C "$R" remote add origin "$REMOTE"
git -C "$R" push -q -u origin HEAD

# ── Three unpushed commits, one file each ──
cat > "$R/src/auth.ts" <<'TS'
export function login(user: string, password: string) {
  if (!user) return null
  return { user, token: 'todo' }
}
TS
git -C "$R" add -A && git -C "$R" commit -qm "feat: add auth"

cat > "$R/src/parser.ts" <<'TS'
export function parse(input: string) {
  const trimmed = input.trim()
  return JSON.parse(trimmed)
}
TS
git -C "$R" add -A && git -C "$R" commit -qm "feat: add parser"

cat > "$R/src/logger.ts" <<'TS'
export function log(level: string, msg: string) {
  console.log(`[${level}]`, msg)
}
TS
git -C "$R" add -A && git -C "$R" commit -qm "feat: add logger"

# ── The review fixes, left in the working tree for the user to stage ──
# auth: the missing password check the reviewer asked for.
cat > "$R/src/auth.ts" <<'TS'
export function login(user: string, password: string) {
  if (!user) return null
  if (!password) return null
  return { user, token: 'todo' }
}
TS

# parser: guard the JSON.parse that was flagged.
cat > "$R/src/parser.ts" <<'TS'
export function parse(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return null
  return JSON.parse(trimmed)
}
TS

# cache: entirely new, so blame has nobody to hand it to.
cat > "$R/src/cache.ts" <<'TS'
export function cache<T>(key: string, value: T) {
  store.set(key, value)
}
TS

summary "absorb" "Three unpushed commits plus staged review fixes that belong to two of them (and one new file that belongs to none) — for absorb."
