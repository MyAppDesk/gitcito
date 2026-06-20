# shellcheck shell=bash disable=SC2154
# 30. insights — exercise the repository Insights page (BarChart3 / ⌘K).
#
# Produces a history with clear, eyeball-able signal for every panel:
#   • Hotspots  → src/core.js is edited in ~10 commits (clear #1), helpers less,
#                 README/LICENSE barely. Hotspot bars should rank core.js top.
#   • Authors   → Alice (most commits + lines), Bob (medium), Carol (few).
#   • Churn     → commits dated across ~6 weeks so the weekly churn chart has
#                 several bars with mixed add/remove.
R="$ROOT/insights"
new_repo "$R"
mkdir -p "$R/src"

# Deterministic dated commit. Usage: ci <iso-date> <name> <email> <msg>
ci() {
  GIT_AUTHOR_DATE="$1 12:00:00" GIT_COMMITTER_DATE="$1 12:00:00" \
  GIT_AUTHOR_NAME="$2" GIT_AUTHOR_EMAIL="$3" \
  GIT_COMMITTER_NAME="$2" GIT_COMMITTER_EMAIL="$3" \
    git -C "$R" commit -q -m "$4"
}

A=(Alice alice@corp.dev)
B=(Bob bob@corp.dev)
C=(Carol carol@corp.dev)

# Helper: append N lines to a file
addlines() { local f="$1" n="$2" tag="$3" i; for ((i=1;i<=n;i++)); do echo "// $tag line $i" >> "$R/$f"; done; }

# ── Week 1 ──
echo "# Insights Demo" > "$R/README.md"
echo "MIT" > "$R/LICENSE"
printf 'export const core = () => 1\n' > "$R/src/core.js"
git -C "$R" add -A; ci 2026-05-04 "${A[@]}" "core: scaffold project"
addlines src/core.js 20 a; git -C "$R" add -A; ci 2026-05-05 "${A[@]}" "core: main loop"
addlines src/core.js 15 a; git -C "$R" add -A; ci 2026-05-06 "${B[@]}" "core: error handling"

# ── Week 2 ──
printf 'export const helper = () => 2\n' > "$R/src/helper.js"
git -C "$R" add -A; ci 2026-05-11 "${A[@]}" "helper: add helper"
addlines src/core.js 30 a; git -C "$R" add -A; ci 2026-05-12 "${A[@]}" "core: refactor loop"
# remove some lines from core (churn: deletions)
head -n 20 "$R/src/core.js" > "$R/src/core.js.tmp" && mv "$R/src/core.js.tmp" "$R/src/core.js"
git -C "$R" add -A; ci 2026-05-13 "${B[@]}" "core: trim dead code"

# ── Week 3 ──
addlines src/helper.js 10 h; git -C "$R" add -A; ci 2026-05-18 "${B[@]}" "helper: edge cases"
addlines src/core.js 25 a; git -C "$R" add -A; ci 2026-05-19 "${A[@]}" "core: cache layer"

# ── Week 4 ──
addlines src/core.js 12 a; git -C "$R" add -A; ci 2026-05-26 "${A[@]}" "core: metrics hooks"
echo "Contributions welcome." >> "$R/README.md"; git -C "$R" add -A; ci 2026-05-27 "${C[@]}" "docs: contributing note"

# ── Week 5 ──
addlines src/core.js 18 a; git -C "$R" add -A; ci 2026-06-02 "${A[@]}" "core: retry policy"
addlines src/helper.js 6 h; git -C "$R" add -A; ci 2026-06-03 "${C[@]}" "helper: tweak"

# ── Week 6 ──
addlines src/core.js 9 a; git -C "$R" add -A; ci 2026-06-09 "${B[@]}" "core: logging"
printf 'export const api = () => 3\n' > "$R/src/api.js"; git -C "$R" add -A; ci 2026-06-10 "${A[@]}" "api: new module"

git -C "$R" checkout -q main 2>/dev/null || true

summary "insights" "Insights: src/core.js hotspot, 3 authors (Alice>Bob>Carol), ~6 weeks of churn"
