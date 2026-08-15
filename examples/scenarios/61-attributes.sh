# shellcheck shell=bash disable=SC2154
# 61. attributes — a repository that already teaches git about its own files.
#
# For the .gitattributes UI: a root file with the rules people actually write
# (line endings, binaries, a union-merged changelog, export-ignore), a second
# file deeper in the tree (so "which file does this rule live in?" is a real
# question), and a private .git/info/attributes that never travels.
R="$ROOT/attributes"
new_repo "$R"

mkdir -p "$R/src" "$R/design" "$R/test"
cat > "$R/src/app.ts" <<'EOF'
export function greet(name: string): string {
  return `hello ${name}`
}
EOF
cat > "$R/CHANGELOG.md" <<'EOF'
# Changelog

## 1.2.0
- Everyone appends here, and everyone conflicts here.
EOF
echo "# Design notes" > "$R/design/README.md"
printf 'fake psd bytes\0\0binary\n' > "$R/design/logo.psd"
printf 'fake docx bytes\0\0zip\n' > "$R/design/spec.docx"
echo "test fixtures live here" > "$R/test/fixture.txt"

cat > "$R/.gitattributes" <<'EOF'
# Line endings decided once, for everyone, whatever their OS does.
* text=auto eol=lf

# Binaries git should never try to diff or three-way merge.
*.psd binary
*.docx binary

# Everyone appends to the changelog; union keeps both sides instead of
# conflicting on every single merge.
CHANGELOG.md merge=union

# Fixtures and CI config are for the repository, not for a release tarball.
test/ export-ignore
.github/ export-ignore
EOF

cat > "$R/design/.gitattributes" <<'EOF'
# Deeper files win: design assets are also kept out of language statistics.
* linguist-vendored
EOF

git -C "$R" add -A && git -C "$R" commit -qm "chore: teach git about this repository's files"

# Local-only rules: never committed, never shared, applies on this machine.
mkdir -p "$R/.git/info"
cat > "$R/.git/info/attributes" <<'EOF'
# Local only — my scratch files, invisible to everyone else.
*.scratch -diff
EOF

summary "attributes" ".gitattributes with eol/binary/union/export-ignore, a nested file and a local .git/info/attributes"
