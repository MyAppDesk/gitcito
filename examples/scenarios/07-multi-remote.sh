# shellcheck shell=bash disable=SC2154
# 07. multi-remote — origin.git + upstream.git local bare repos acting as remote servers.
# working repo cloned from origin; upstream has 2 extra commits; local has 1 unpushed commit.
ORIGIN_BARE="$ROOT/multi-remote-origin.git"
UPSTREAM_BARE="$ROOT/multi-remote-upstream.git"

SEED="$ROOT/_seed_mr"
new_repo "$SEED"

cat > "$SEED/README.md" <<'EOF'
# shared-lib
A shared utility library.
EOF
cat > "$SEED/index.ts" <<'EOF'
export const VERSION = '1.0.0'
export function identity<T>(x: T): T { return x }
EOF
git -C "$SEED" add -A && git -C "$SEED" commit -qm "initial commit"

cat > "$SEED/math.ts" <<'EOF'
export const add = (a: number, b: number) => a + b
export const sub = (a: number, b: number) => a - b
export const mul = (a: number, b: number) => a * b
EOF
git -C "$SEED" add -A && git -C "$SEED" commit -qm "feat: add math.ts"

git clone -q --bare "$SEED" "$ORIGIN_BARE"

cat > "$SEED/string.ts" <<'EOF'
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
export const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s
export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
EOF
git -C "$SEED" add -A && git -C "$SEED" commit -qm "feat: string.ts — capitalize/truncate/slugify"

cat >> "$SEED/README.md" <<'EOF'

## Utilities
- `math.ts` — arithmetic helpers
- `string.ts` — string manipulation (upstream only)
EOF
git -C "$SEED" add -A && git -C "$SEED" commit -qm "docs: update README with string module"

git clone -q --bare "$SEED" "$UPSTREAM_BARE"
rm -rf "$SEED"

R="$ROOT/multi-remote"
git clone -q "$ORIGIN_BARE" "$R"
git -C "$R" config user.name "Playground"
git -C "$R" config user.email "playground@example.com"

cat > "$R/array.ts" <<'EOF'
export const unique = <T>(arr: T[]) => [...new Set(arr)]
export const chunk = <T>(arr: T[], n: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))
export const flatten = <T>(arr: T[][]): T[] => ([] as T[]).concat(...arr)
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: array.ts — unique/chunk/flatten (not pushed to origin)"

git -C "$R" remote add upstream "$UPSTREAM_BARE"
git -C "$R" fetch -q upstream
# graph shows: local main (3 commits) ahead of origin/main (2); upstream/main (4) has 2 extra

summary "multi-remote" "origin + upstream diverged; local has 1 unpushed commit"
