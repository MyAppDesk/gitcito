# shellcheck shell=bash disable=SC2154
# 05. interactive-rebase — messy-feature has 6 commits (real code + WIPs + fixup) for squash/reorder.
R="$ROOT/interactive-rebase"
new_repo "$R"

cat > "$R/index.ts" <<'EOF'
export const VERSION = '1.0.0'
EOF
git -C "$R" add -A && git -C "$R" commit -qm "initial commit"

git -C "$R" checkout -qb messy-feature

cat > "$R/auth.ts" <<'EOF'
export function login(user: string, pass: string) {
  return fetch('/login', {
    method: 'POST',
    body: JSON.stringify({ user, pass }),
    headers: { 'Content-Type': 'application/json' },
  })
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "add login function"

cat > "$R/auth.ts" <<'EOF'
export function login(user: string, pass: string) {
  return fetch('/login', {
    method: 'POST',
    body: JSON.stringify({ user, pass }),
    headers: { 'Content-Type': 'application/json' },
  })
}
// TODO: logout
EOF
git -C "$R" add -A && git -C "$R" commit -qm "WIP"

cat > "$R/auth.ts" <<'EOF'
export function login(user: string, pass: string) {
  return fetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ user, pass }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function logout() {
  return fetch('/logout', { method: 'POST' })
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "add logout + fix login path"

cat > "$R/auth.ts" <<'EOF'
export function login(user: string, pass: string) {
  return fetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ user, pass }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function logout() {
  return fetch('/auth/logout', { method: 'POST' })
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "fixup! add logout + fix login path"

cat > "$R/session.ts" <<'EOF'
let _token: string | null = null
export const setToken = (t: string) => { _token = t }
export const getToken = () => _token
EOF
git -C "$R" add -A && git -C "$R" commit -qm "WIP session module"

cat > "$R/session.ts" <<'EOF'
let _token: string | null = null
export const setToken = (t: string) => { _token = t }
export const getToken = () => _token
export const clearToken = () => { _token = null }

export function getSession() {
  return fetch('/session', {
    headers: _token ? { Authorization: `Bearer ${_token}` } : {},
  }).then(r => r.json())
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "finish session module — getSession + clearToken"

summary "interactive-rebase" "interactive rebase 'messy-feature': squash WIPs, autosquash fixups"
