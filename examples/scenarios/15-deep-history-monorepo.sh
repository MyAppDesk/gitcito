# shellcheck shell=bash disable=SC2154
# 15. deep-history-monorepo — a multi-package monorepo with ~220 commits across several
# languages, 5 rotating authors, a feature branch + merge every 25 commits, and a release
# tag every 50. Stresses graph rendering, log virtualisation, author grouping and perf.
R="$ROOT/deep-history-monorepo"
new_repo "$R"

# ── Scaffold the monorepo layout ────────────────────────────────────────────────
mkdir -p "$R/packages/api/src" "$R/packages/web/src" "$R/packages/cli" \
         "$R/services/worker" "$R/infra" "$R/docs"

cat > "$R/README.md" <<'EOF'
# Monorepo

| Package            | Language   |
|--------------------|------------|
| packages/api       | TypeScript |
| packages/web       | React/TSX  |
| packages/cli       | Go         |
| services/worker    | Python     |
| infra              | YAML/Docker|
EOF
cat > "$R/packages/api/src/index.ts" <<'EOF'
export const VERSION = '0.0.0'
export function start() { console.log('api up') }
EOF
cat > "$R/packages/web/src/App.tsx" <<'EOF'
export function App() { return null }
EOF
cat > "$R/packages/cli/main.go" <<'EOF'
package main

import "fmt"

func main() { fmt.Println("cli v0") }
EOF
cat > "$R/services/worker/worker.py" <<'EOF'
def run() -> None:
    print("worker started")
EOF
cat > "$R/infra/docker-compose.yml" <<'EOF'
services:
  api:
    build: ./packages/api
EOF
git -C "$R" add -A && git -C "$R" commit -qm "chore: monorepo scaffold"

# ── Rotating authors + target files ─────────────────────────────────────────────
AUTHORS=(
  "Ada Lovelace|ada-lovelace@users.noreply.github.com"
  "Grace Hopper|grace-hopper@users.noreply.github.com"
  "Linus Torvalds|linus-torvalds@users.noreply.github.com"
  "Margaret Hamilton|margaret-hamilton@users.noreply.github.com"
  "Ken Thompson|ken-thompson@users.noreply.github.com"
)
FILES=(
  "packages/api/src/index.ts"
  "packages/web/src/App.tsx"
  "packages/cli/main.go"
  "services/worker/worker.py"
  "infra/docker-compose.yml"
  "docs/CHANGELOG.md"
)
TYPES=("feat" "fix" "refactor" "docs" "chore" "perf" "test")

N=220
for ((c = 1; c <= N; c++)); do
  author="${AUTHORS[$((c % ${#AUTHORS[@]}))]}"
  name="${author%%|*}"; email="${author##*|}"
  file="${FILES[$((c % ${#FILES[@]}))]}"
  type="${TYPES[$((c % ${#TYPES[@]}))]}"

  # Occasional large diff (every 17th commit) to exercise big-file rendering.
  if (( c % 17 == 0 )); then
    rand_text 60 "$file" >> "$R/$file"
    msg="$type: bulk update $file (#$c)"
  else
    printf 'change #%03d — touch %s\n' "$c" "$file" >> "$R/$file"
    msg="$type: iterate on ${file##*/} (#$c)"
  fi

  git -C "$R" add -A
  GIT_AUTHOR_NAME="$name" GIT_AUTHOR_EMAIL="$email" \
  GIT_COMMITTER_NAME="$name" GIT_COMMITTER_EMAIL="$email" \
    git -C "$R" commit -qm "$msg"

  # Every 25 commits: short-lived feature branch merged back with --no-ff.
  if (( c % 25 == 0 )); then
    br="feat/batch-$c"
    git -C "$R" checkout -q -b "$br"
    printf 'feature work for batch %d\n' "$c" >> "$R/packages/api/src/index.ts"
    git -C "$R" add -A
    GIT_AUTHOR_NAME="$name" GIT_AUTHOR_EMAIL="$email" \
    GIT_COMMITTER_NAME="$name" GIT_COMMITTER_EMAIL="$email" \
      git -C "$R" commit -qm "feat($br): batch feature work"
    git -C "$R" checkout -q main
    GIT_AUTHOR_NAME="$name" GIT_AUTHOR_EMAIL="$email" \
    GIT_COMMITTER_NAME="$name" GIT_COMMITTER_EMAIL="$email" \
      git -C "$R" merge -q --no-ff "$br" -m "Merge $br into main"
  fi

  # Every 50 commits: tag a release.
  if (( c % 50 == 0 )); then
    rel=$((c / 50))
    git -C "$R" tag -a "v0.$rel.0" -m "Release v0.$rel.0 (at commit #$c)"
  fi
done

total=$(git -C "$R" rev-list --count HEAD)
summary "deep-history-monorepo" "$total commits, 5 authors, periodic merges + release tags (perf stress)"
