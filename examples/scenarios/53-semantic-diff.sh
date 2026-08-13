# shellcheck shell=bash disable=SC2154
# 53. semantic-diff — "what changed", not "which lines moved".
#
# The second commit does, in one go, everything a line diff renders as an
# undifferentiated red/green wall:
#   • startServer()  → bootServer()      (rename, body untouched)
#   • Repo.open(path) → open(path, mode) (signature change, body untouched)
#   • formatDate()                        moved to the bottom of the file, unchanged
#   • legacyPing()                        deleted
#   • healthCheck()                       added
# The same five moves are repeated in Python and Go so the summary can be
# checked against three grammars, and one uncommitted rename is left in the
# working tree for the WIP diff.
#
# Verify:
#   • Select the "refactor" commit ⇒ open src/app.ts ⇒ Diff View shows a
#     "What changed" strip above the diff, with the grammar name (typescript)
#     on the right and a count badge.
#   • Rows read: RENAMED startServer → bootServer, SIGNATURE Repo.open
#     (path: string) → (path: string, mode: string), REMOVED legacyPing,
#     ADDED healthCheck, MOVED formatDate +14. Renames and signature changes
#     sort first; the `Repo` class itself is NOT listed (its method rows say it
#     all), and `Repo.close` is not reported as "moved" — it only drifted a few
#     lines because the method above it grew.
#   • src/server.go proves the rename matching is not trigger-happy: LegacyPing
#     and HealthCheck are one-liners with similar text, and are still reported
#     as a separate REMOVED + ADDED rather than a bogus rename.
#   • Clicking a row scrolls the diff to that symbol and flashes the line.
#   • The chevron collapses the strip; it stays collapsed while you switch files.
#   • Same for src/api.py (python) and src/server.go (go).
#   • README.md and notes.txt show NO strip at all — no grammar, plain line diff.
#   • WIP: the uncommitted edit in src/api.py shows RENAMED parse_config →
#     load_config in the unstaged diff; stage it and the staged diff shows it too.
#   • A pure rename is reported without "body too" — that note only appears when
#     the body changed as well.
R="$ROOT/semantic-diff"
new_repo "$R"

mkdir -p "$R/src"

cat > "$R/src/app.ts" <<'TS'
export function startServer(port: number) {
  const server = createServer()
  server.listen(port)
  return server
}

export function formatDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function legacyPing() {
  return 'pong'
}

export class Repo {
  open(path: string) {
    return path
  }

  close() {
    return null
  }
}
TS

cat > "$R/src/api.py" <<'PY'
def start_server(port):
    server = create_server()
    server.listen(port)
    return server


def format_date(d):
    return d.isoformat()[:10]


def legacy_ping():
    return "pong"


def parse_config(path):
    return read(path)


class Repo:
    def open(self, path):
        return path
PY

cat > "$R/src/server.go" <<'GO'
package main

func StartServer(port int) *Server {
	server := createServer()
	server.Listen(port)
	return server
}

func FormatDate(d time.Time) string {
	return d.Format("2006-01-02")
}

func LegacyPing() string {
	return "pong"
}
GO

# Files with no grammar — their diffs must stay plain line diffs.
printf '# Semantic diff demo\n\nThree languages, one refactor.\n' > "$R/README.md"
printf 'just some notes\nnothing structural here\n' > "$R/notes.txt"

git -C "$R" add -A && git -C "$R" commit -qm "init: server, dates and a legacy ping in ts/py/go"

# ── The refactor: rename, re-signature, move, delete, add ──
cat > "$R/src/app.ts" <<'TS'
export function bootServer(port: number) {
  const server = createServer()
  server.listen(port)
  return server
}

export function healthCheck() {
  return { ok: true }
}

export class Repo {
  open(path: string, mode: string) {
    return path
  }

  close() {
    return null
  }
}

export function formatDate(d: Date) {
  return d.toISOString().slice(0, 10)
}
TS

cat > "$R/src/api.py" <<'PY'
def boot_server(port):
    server = create_server()
    server.listen(port)
    return server


def health_check():
    return {"ok": True}


def parse_config(path):
    return read(path)


class Repo:
    def open(self, path, mode):
        return path


def format_date(d):
    return d.isoformat()[:10]
PY

cat > "$R/src/server.go" <<'GO'
package main

func BootServer(port int) *Server {
	server := createServer()
	server.Listen(port)
	return server
}

func HealthCheck() bool {
	return true
}

func FormatDate(d time.Time) string {
	return d.Format("2006-01-02")
}
GO

printf '# Semantic diff demo\n\nThree languages, one refactor. Now documented.\n' > "$R/README.md"
git -C "$R" add -A && git -C "$R" commit -qm "refactor: boot the server, health check, drop the legacy ping"

# Uncommitted rename, so the WIP diff has something semantic to show too.
sed -i.bak 's/def parse_config/def load_config/' "$R/src/api.py" && rm -f "$R/src/api.py.bak"

summary "semantic-diff" "One refactor (rename, signature change, move, delete, add) in TypeScript, Python and Go, plus an uncommitted rename for the WIP diff."
