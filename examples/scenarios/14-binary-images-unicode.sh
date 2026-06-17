# shellcheck shell=bash disable=SC2154
# 14. binary-images-unicode — binary files (PNG/raw), an image that changes (binary diff),
# and files with emoji / accented / CJK / RTL names + content. Stresses diff rendering,
# image preview, "binary file" detection and non-ASCII path handling.
R="$ROOT/binary-images-unicode"
new_repo "$R"
# Show real UTF-8 paths in git output instead of \xxx octal escapes.
git -C "$R" config core.quotepath false

# Generate a valid solid-colour PNG with python3; fall back to a 1x1 transparent PNG.
# make_png <dest> <w> <h> <r> <g> <b>
make_png() {
  local dest="$1" w="$2" h="$3" r="$4" g="$5" b="$6"
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$dest" "$w" "$h" "$r" "$g" "$b" <<'PY'
import sys, struct, zlib
dest, w, h, r, g, b = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
def chunk(typ, data):
    return struct.pack('>I', len(data)) + typ + data + struct.pack('>I', zlib.crc32(typ + data) & 0xffffffff)
raw = b''.join(b'\x00' + bytes([r, g, b]) * w for _ in range(h))
png  = b'\x89PNG\r\n\x1a\n'
png += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
png += chunk(b'IDAT', zlib.compress(raw, 9))
png += chunk(b'IEND', b'')
open(dest, 'wb').write(png)
PY
  else
    printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' | write_b64 "$dest"
  fi
}

cat > "$R/README.md" <<'EOF'
# Binary, Images & Unicode

- `assets/logo.png` changes between commits → exercises **binary diff**.
- `assets/icon.png`, `data.bin` are committed binaries.
- Files named with emoji / accents / CJK / RTL test non-ASCII path handling.
EOF
git -C "$R" add -A && git -C "$R" commit -qm "docs: README"

# ── Commit binaries (v1) ────────────────────────────────────────────────────────
mkdir -p "$R/assets"
make_png "$R/assets/logo.png" 16 16 220 40 40    # red 16x16
make_png "$R/assets/icon.png" 8  8  40 120 220   # blue 8x8
printf '\x00\x01\x02\x03\xde\xad\xbe\xef\xca\xfe\xba\xbe\x10\x20\x30\x40' > "$R/data.bin"
git -C "$R" add -A && git -C "$R" commit -qm "feat: add logo, icon, raw data (binaries)"

# ── Change the image → binary diff between two commits ──────────────────────────
make_png "$R/assets/logo.png" 32 32 40 200 80    # now green 32x32
git -C "$R" add -A && git -C "$R" commit -qm "design: recolour + resize logo (binary diff)"

# ── Unicode filenames + content ─────────────────────────────────────────────────
printf 'Un café, s\x27il vous plaît ☕\nNaïve façade — jalapeño piñata 🌶️\n' > "$R/café-☕.txt"
printf '# 日本語のファイル\n\nこれはテストです。絵文字も: 🎌🍣🗻\n' > "$R/日本語ファイル.md"
printf 'Rocket log 🚀\nLift-off in 3… 2… 1… 🛰️\n' > "$R/🚀 rocket notes.txt"
printf 'مرحبا بالعالم\nهذا ملف نصي باللغة العربية.\n' > "$R/مرحبا.txt"
git -C "$R" add -A && git -C "$R" commit -qm "feat: add files with emoji / CJK / RTL names + content"

# ── Mixed line endings (whitespace/EOL churn) ───────────────────────────────────
printf 'line one\r\nline two\r\nline three\r\n' > "$R/crlf-windows.txt"
printf 'line one\nline two\nline three\n'       > "$R/lf-unix.txt"
git -C "$R" add -A && git -C "$R" commit -qm "chore: add CRLF + LF files (line-ending churn)"

summary "binary-images-unicode" "binary diff on logo.png + emoji/CJK/RTL filenames + CRLF/LF churn"
