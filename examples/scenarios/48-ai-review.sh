# shellcheck shell=bash disable=SC2154
# 48. ai-review — a feature branch whose diff contains deliberate, findable
# problems (a SQL string built by concatenation, a missing null check, a
# swallowed error, an O(n²) loop) so the grounded AI PR review has real hunks to
# cite. Every finding it reports must point at a path:line that exists here.
R="$ROOT/ai-review"
new_repo "$R"

mkdir -p "$R/src"
cat > "$R/src/db.js" <<'EOF'
const { connect } = require('./pool')

async function findUser(id) {
  const db = await connect()
  return db.query('SELECT * FROM users WHERE id = ' + id)
}

module.exports = { findUser }
EOF
cat > "$R/src/pool.js" <<'EOF'
async function connect() {
  return { query: async (sql) => [{ sql }] }
}

module.exports = { connect }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "init: tiny data layer"

# Feature branch: the code the review is meant to pick apart.
git -C "$R" checkout -q -b feat/user-report

cat > "$R/src/report.js" <<'EOF'
const { findUser } = require('./db')

// Builds a report for every id, then decorates it with the user's team name.
async function buildReport(ids, teams) {
  const rows = []
  for (const id of ids) {
    const user = await findUser(id)
    rows.push({ id, name: user.profile.name })
  }
  for (const row of rows) {
    for (const team of teams) {
      if (team.members.includes(row.id)) row.team = team.name
    }
  }
  return rows
}

async function safeBuildReport(ids, teams) {
  try {
    return await buildReport(ids, teams)
  } catch (e) {
    return []
  }
}

module.exports = { buildReport, safeBuildReport }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: add user report builder"

cat >> "$R/src/db.js" <<'EOF'

async function searchUsers(term) {
  const db = await connect()
  return db.query(`SELECT * FROM users WHERE name LIKE '%${term}%'`)
}

module.exports.searchUsers = searchUsers
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: add user search"

cat > "$R/README.md" <<'EOF'
# ai-review

`feat/user-report` is 2 commits ahead of `main` and contains, on purpose:

- `src/db.js` — a SQL query built by string interpolation (injection risk)
- `src/report.js` — `user.profile.name` with no null check
- `src/report.js` — a nested loop over ids × teams
- `src/report.js` — a catch block that swallows the error and returns `[]`

To try the grounded AI PR review:
1. Add a provider + key in Settings → AI.
2. Compare `feat/user-report` vs `main` → **AI PR Review**.
3. Every finding shows a `path:line` the app resolved from the diff itself — open
   the file at that line and the cited code should really be there.

To try hover-to-explain (Settings → AI → "Explain code on hover", key: Shift):
1. Check out `feat/user-report` and open `src/report.js` in the File view.
2. Hold Shift and point at `buildReport`, `rows`, `teams` or `findUser`. Plain
   unhighlighted identifiers work too; keywords, strings and numbers are ignored.
3. `findUser` is imported, not defined here — the card should say so rather than
   invent a definition. The line chips scroll the file; "See more" opens the
   fuller explanation in the side panel.
4. Repeat in the **Diff** view of the same file, and in **Blame**. In a diff the
   card can only see the hunks on screen, and its cited lines come from the new
   side of the diff.

To try the generated wiki (tools menu → "Repository wiki", or ⌘K → wiki):
1. Press **Generate wiki**. It plans the pages first, then writes them — the
   progress line names each page as it lands.
2. Every bullet ends with the file it came from, and the **Sources** list at the
   bottom opens those files. Open one and check the claim is really there.
3. The overview page opens with a repo card: a language bar (counted from the
   files, so it shows even before you generate anything), the stack grouped from
   package.json, a map of the pages — click a bubble to jump to that page — and
   a module dependency graph read from the imports. Hover a folder to isolate
   what it touches; arrow thickness is how many imports cross that way. Try it
   on a big repo (gitcito itself) to see it earn its keep.
4. Press **Export to docs/**: the wiki lands in `docs/wiki/` as Markdown with
   an index, ready to commit. Check the diff — the pages are the same text the
   app showed, and every page links back to the index.
5. Commit something, come back, and the page warns it was written at an older
   commit until you regenerate.
EOF
git -C "$R" add -A && git -C "$R" commit -qm "docs: readme"

git -C "$R" checkout -q main

summary "ai-review" "branch with planted bugs — targets for grounded AI PR review and hover-to-explain"
