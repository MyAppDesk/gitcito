# shellcheck shell=bash disable=SC2154
# 56. time-machine — a repo whose *shape* changes over its history.
#
# Built so that scrubbing the slider is visibly a time machine and not just a
# commit list: files appear, move between folders, get deleted, and one file is
# rewritten on almost every commit.
#
#   1  index.js only                      (the whole app in one file)
#   2  README arrives
#   3  lib/util.js extracted
#   4  lib/format.js added
#   5  src/ appears, index.js moves into it
#   6  lib/ becomes src/utils/            (folder rename)
#   7  src/utils/format.js deleted        (dead code removed)
#   8  src/api.js added
#   9  docs/ appears with two pages
#  10  src/api.js rewritten
#  11  docs/old.md deleted, docs/guide.md rewritten
#  12  VERSION bumped
#
# Verify:
#   • Tools → "Time machine…" (or ⌘K) opens at the newest commit, slider on the
#     right-hand end; the tree shows the repo as it is today.
#   • Drag the slider left ⇒ the file tree re-renders per commit: src/ vanishes
#     around commit 5, lib/ reappears, docs/ disappears before commit 9.
#   • ←/→ step one commit, ⇧←/⇧→ jump ten, Home/End go to the ends.
#   • Files this commit touched are highlighted in the tree.
#   • Pick src/api.js at the tip, then scrub back past commit 8 ⇒ the preview
#     says it does not exist at this commit; scrub forward and it returns, with
#     its *old* content around commit 8.
#   • Enter folders via the tree, walk back out with the breadcrumb; the folder
#     you are standing in is kept while you scrub.
#   • "Open this version" hands the file to the normal file view at that commit.
#   • Nothing changes on disk while you scrub: `git status` stays clean and HEAD
#     never moves (check the graph's HEAD badge afterwards).
R="$ROOT/time-machine"
new_repo "$R"

commit() { git -C "$R" add -A && git -C "$R" commit -qm "$1"; }

# 1 — everything in one file
cat > "$R/index.js" <<'JS'
function main() {
  console.log('hello')
}
main()
JS
commit "init: one-file app"

# 2 — docs for humans
printf '# Tiny app\n\nIt prints hello.\n' > "$R/README.md"
commit "docs: add readme"

# 3 — extract a helper
mkdir -p "$R/lib"
cat > "$R/lib/util.js" <<'JS'
export function greet(name) {
  return `hello ${name}`
}
JS
cat > "$R/index.js" <<'JS'
import { greet } from './lib/util.js'
console.log(greet('world'))
JS
commit "refactor: extract lib/util.js"

# 4 — another helper
cat > "$R/lib/format.js" <<'JS'
export function pad(n) {
  return String(n).padStart(2, '0')
}
JS
commit "feat: add lib/format.js"

# 5 — a src/ folder appears and index.js moves into it
mkdir -p "$R/src"
git -C "$R" mv index.js src/index.js
commit "chore: move entry point into src/"

# 6 — lib/ becomes src/utils/
git -C "$R" mv lib "$R/src/utils" 2>/dev/null || { mkdir -p "$R/src/utils"; git -C "$R" mv lib/util.js src/utils/util.js; git -C "$R" mv lib/format.js src/utils/format.js; }
commit "chore: fold lib/ into src/utils/"

# 7 — dead code goes
git -C "$R" rm -q src/utils/format.js
commit "chore: drop unused formatter"

# 8 — the API arrives (the file to scrub back past)
cat > "$R/src/api.js" <<'JS'
export function fetchUser(id) {
  return fetch(`/users/${id}`)
}
JS
commit "feat: add src/api.js"

# 9 — documentation grows a folder
mkdir -p "$R/docs"
printf '# Guide\n\nStart here.\n' > "$R/docs/guide.md"
printf '# Old notes\n\nSuperseded.\n' > "$R/docs/old.md"
commit "docs: add docs/ folder"

# 10 — the API is rewritten
cat > "$R/src/api.js" <<'JS'
export async function fetchUser(id, { signal } = {}) {
  const res = await fetch(`/users/${id}`, { signal })
  if (!res.ok) throw new Error(`user ${id}: ${res.status}`)
  return res.json()
}
JS
commit "feat: harden the API client"

# 11 — prune the docs
git -C "$R" rm -q docs/old.md
printf '# Guide\n\nStart here. Now with examples.\n\n```js\nfetchUser(1)\n```\n' > "$R/docs/guide.md"
commit "docs: rewrite the guide, drop old notes"

# 12 — a version file, so the newest commit is trivially recognisable
printf '1.2.0\n' > "$R/VERSION"
commit "chore: release 1.2.0"

summary "time-machine" "Twelve commits whose file tree keeps changing shape (moves, renames, deletions) — for scrubbing through history."
