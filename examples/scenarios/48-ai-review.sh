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
EOF
git -C "$R" add -A && git -C "$R" commit -qm "docs: readme"

git -C "$R" checkout -q main

summary "ai-review" "branch with planted bugs — grounded AI PR review targets"
