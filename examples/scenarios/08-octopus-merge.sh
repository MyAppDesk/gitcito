# shellcheck shell=bash disable=SC2154
# 08. octopus-merge — three independent feature branches (auth / api / ui) off the same commit.
# Each touches different files → `git merge feat/auth feat/api feat/ui` is a clean octopus merge.
R="$ROOT/octopus-merge"
new_repo "$R"

cat > "$R/package.json" <<'EOF'
{
  "name": "octopus-app",
  "version": "1.0.0",
  "private": true,
  "scripts": { "start": "node index.js" }
}
EOF
cat > "$R/index.js" <<'EOF'
console.log('octopus-app v1.0.0')
EOF
git -C "$R" add -A && git -C "$R" commit -qm "initial: project scaffold"

git -C "$R" checkout -qb feat/auth main

cat > "$R/auth.ts" <<'EOF'
export interface User { id: string; email: string; role: 'admin' | 'user' }

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status}`)
  return res.json()
}

export async function logout(token: string): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat(auth): login / logout with JWT"

cat > "$R/session.ts" <<'EOF'
const KEY = 'auth_token'
export const saveToken = (t: string) => localStorage.setItem(KEY, t)
export const loadToken = () => localStorage.getItem(KEY)
export const clearToken = () => localStorage.removeItem(KEY)
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat(auth): session helpers — save/load/clear token"

git -C "$R" checkout -qb feat/api main

cat > "$R/api.ts" <<'EOF'
const BASE_URL = process.env.API_URL ?? 'https://api.example.com/v1'

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  get:  <T>(path: string, token?: string) =>                       request<T>('GET',    path, undefined, token),
  post: <T>(path: string, body: unknown, token?: string) =>        request<T>('POST',   path, body,      token),
  put:  <T>(path: string, body: unknown, token?: string) =>        request<T>('PUT',    path, body,      token),
  del:      (path: string, token?: string) =>                      request<void>('DELETE', path, undefined, token),
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat(api): generic typed request client"

cat > "$R/endpoints.ts" <<'EOF'
export const ENDPOINTS = {
  users:    '/users',
  user:     (id: string) => `/users/${id}`,
  products: '/products',
  product:  (id: string) => `/products/${id}`,
  orders:   '/orders',
  order:    (id: string) => `/orders/${id}`,
} as const
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat(api): endpoint constants"

git -C "$R" checkout -qb feat/ui main
mkdir -p "$R/components"

cat > "$R/components/Button.tsx" <<'EOF'
import React from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
interface Props {
  label: string
  onClick?: () => void
  variant?: Variant
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function Button({ label, onClick, variant = 'primary', disabled = false, type = 'button' }: Props) {
  return (
    <button type={type} className={`btn btn--${variant}`} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}
EOF
cat > "$R/components/Input.tsx" <<'EOF'
import React from 'react'

interface Props {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'email' | 'password' | 'number'
  placeholder?: string
  error?: string
  required?: boolean
}

export function Input({ id, label, value, onChange, type = 'text', placeholder, error, required }: Props) {
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id}>{label}{required && ' *'}</label>
      <input
        id={id} type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={!!error}
      />
      {error && <span id={`${id}-error`} className="field__error">{error}</span>}
    </div>
  )
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat(ui): Button + Input components"

cat > "$R/components/Modal.tsx" <<'EOF'
import React from 'react'

interface Props {
  title: string
  children: React.ReactNode
  onClose: () => void
}

export function Modal({ title, children, onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal aria-labelledby="modal-title">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2 id="modal-title">{title}</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  )
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat(ui): Modal component"

git -C "$R" checkout -q main
# run: git merge feat/auth feat/api feat/ui  →  clean octopus merge (all files are different)

summary "octopus-merge" "merge feat/auth feat/api feat/ui (all touch different files)"
