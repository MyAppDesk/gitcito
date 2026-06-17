# shellcheck shell=bash disable=SC2154
# 11. collaborators — 4 authors (Alice/Bob/Carol/Dave) across main + 2 feature branches,
# then Alice merges everything. Good for author avatars/initials and co-author display.
R="$ROOT/collaborators"
new_repo "$R"

# Seed README as Alice
cat > "$R/README.md" <<'EOF'
# Team Project

A shared repo for collaboration testing.
EOF
cat > "$R/app.js" <<'EOF'
// Main entry point
function main() {
  console.log('Hello, team!');
}
main();
EOF
git -C "$R" add -A
collab_commit "$R" "Alice Liddell" "alice-liddell@users.noreply.github.com" "feat: initial project scaffold"

# Bob adds auth module on main, Carol pair-programmed
cat > "$R/auth.js" <<'EOF'
// Auth module
function login(user, pass) {
  return user === 'admin' && pass === 'secret';
}
module.exports = { login };
EOF
git -C "$R" add -A
collab_commit "$R" "Bob Marley" "bob-marley@users.noreply.github.com" "feat: add basic auth module" \
  "Co-authored-by: Carol Danvers <carol-danvers@users.noreply.github.com>"

# Carol branches off to build the API
git -C "$R" checkout -qb feat/api
cat > "$R/api.js" <<'EOF'
const { login } = require('./auth');
function handleRequest(req) {
  if (!login(req.user, req.pass)) return { status: 401 };
  return { status: 200, data: 'ok' };
}
module.exports = { handleRequest };
EOF
git -C "$R" add -A
collab_commit "$R" "Carol Danvers" "carol-danvers@users.noreply.github.com" "feat: add API request handler"

# Carol and Alice co-authored the list endpoint
cat >> "$R/api.js" <<'EOF'

function handleList(req) {
  return { status: 200, data: [] };
}
module.exports = { handleRequest, handleList };
EOF
git -C "$R" add -A
collab_commit "$R" "Carol Danvers" "carol-danvers@users.noreply.github.com" "feat: add list endpoint" \
  "Co-authored-by: Alice Liddell <alice-liddell@users.noreply.github.com>"

# Dave branches off main to build the UI
git -C "$R" checkout -q main
git -C "$R" checkout -qb feat/ui
cat > "$R/ui.html" <<'EOF'
<!DOCTYPE html>
<html>
  <head><title>Team App</title></head>
  <body>
    <h1>Login</h1>
    <form><input name="user"/><input name="pass" type="password"/><button>Go</button></form>
  </body>
</html>
EOF
git -C "$R" add -A
# Dave + Bob + Carol all worked on the login UI
collab_commit "$R" "Dave Grohl" "dave-grohl@users.noreply.github.com" "feat: add login UI" \
  "Co-authored-by: Bob Marley <bob-marley@users.noreply.github.com>
Co-authored-by: Carol Danvers <carol-danvers@users.noreply.github.com>"

cat >> "$R/ui.html" <<'EOF'
<!-- dashboard placeholder -->
EOF
git -C "$R" add -A
collab_commit "$R" "Dave Grohl" "dave-grohl@users.noreply.github.com" "feat: add dashboard placeholder" \
  "Co-authored-by: Alice Liddell <alice-liddell@users.noreply.github.com>"

# Alice merges both feature branches into main
git -C "$R" checkout -q main
GIT_AUTHOR_NAME="Alice Liddell" GIT_AUTHOR_EMAIL="alice-liddell@users.noreply.github.com" \
GIT_COMMITTER_NAME="Alice Liddell" GIT_COMMITTER_EMAIL="alice-liddell@users.noreply.github.com" \
  git -C "$R" merge -q --no-ff feat/api -m "Merge feat/api into main (Carol's API layer)"

GIT_AUTHOR_NAME="Alice Liddell" GIT_AUTHOR_EMAIL="alice-liddell@users.noreply.github.com" \
GIT_COMMITTER_NAME="Alice Liddell" GIT_COMMITTER_EMAIL="alice-liddell@users.noreply.github.com" \
  git -C "$R" merge -q --no-ff feat/ui -m "Merge feat/ui into main (Dave's login UI)"

# Bob adds a final hotfix on main
cat >> "$R/auth.js" <<'EOF'

function logout(session) {
  session.token = null;
}
module.exports = { login, logout };
EOF
git -C "$R" add -A
collab_commit "$R" "Bob Marley" "bob-marley@users.noreply.github.com" "fix: add logout to auth module" \
  "Co-authored-by: Dave Grohl <dave-grohl@users.noreply.github.com>"

# Alice tags the release
GIT_AUTHOR_NAME="Alice Liddell" GIT_AUTHOR_EMAIL="alice-liddell@users.noreply.github.com" \
GIT_COMMITTER_NAME="Alice Liddell" GIT_COMMITTER_EMAIL="alice-liddell@users.noreply.github.com" \
  git -C "$R" tag -a v1.0.0 -m "Release v1.0.0 — team effort"

summary "collaborators" "4 authors, 2 feature branches, merge commits, v1.0.0 tag"
