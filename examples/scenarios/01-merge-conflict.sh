# shellcheck shell=bash disable=SC2154
# 01. merge-conflict — merge `feature` into `main` ⇒ content conflicts + modify/delete.
# Sourced by setup-playground.sh with $ROOT and lib helpers in scope.
R="$ROOT/merge-conflict"
new_repo "$R"

cat > "$R/greeting.txt" <<'EOF'
Hello world
This line stays the same.
Goodbye world
EOF
cat > "$R/app.js" <<'EOF'
function greet(name) {
  return 'Hello ' + name
}

function farewell(name) {
  return 'Bye ' + name
}

module.exports = { greet, farewell }
EOF
cat > "$R/units_service.dart" <<'EOF'
String formatUnits(int count) {
  return 'units: $count';
}
EOF
# Four separate conflict chunks in one file — exercises the conflict navigator,
# the whole-side checkboxes and the per-chunk picker.
cat > "$R/release-notes.md" <<'EOF'
# Release notes

## Summary
Small maintenance release.

<!-- keep three lines of shared context between sections so git keeps the -->
<!-- conflicts apart instead of coalescing them into one big chunk -->
<!-- ------------------------------------------------------------ -->

## Added
- nothing yet

<!-- ------------------------------------------------------------ -->
<!-- shared context -->
<!-- ------------------------------------------------------------ -->

## Fixed
- nothing yet

<!-- ------------------------------------------------------------ -->
<!-- shared context -->
<!-- ------------------------------------------------------------ -->

## Notes
Unchanged on both branches.

<!-- ------------------------------------------------------------ -->
<!-- shared context -->
<!-- ------------------------------------------------------------ -->

## Credits
- the team
EOF
# A big file for eyeballing the resolver by hand: 520 lines with exactly three
# conflicting lines far apart (150, 200 and 500), so the auto-jump to the first
# conflict, the ⌃/⌄ navigator and the linked scrolling all have room to move.
# Every 40th line is deliberately long to give the wrap toggle something to do.
big_log() {
  awk -v tag="$1" 'BEGIN {
    for (i = 1; i <= 520; i++) {
      if (i == 150 || i == 200 || i == 500) print "line " i ": " tag
      else if (i % 40 == 0) print "line " i ": a deliberately long line to exercise the wrap toggle — lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua"
      else print "line " i ": shared padding"
    }
  }'
}
big_log "base version" > "$R/big-log.txt"
git -C "$R" add -A && git -C "$R" commit -qm "initial commit"

git -C "$R" checkout -qb feature
cat > "$R/greeting.txt" <<'EOF'
Hola mundo (from feature)
This line stays the same.
Adios mundo (from feature)
EOF
cat > "$R/app.js" <<'EOF'
function greet(name) {
  return `¡Hola ${name}! (feature version)`
}

function farewell(name) {
  return 'Bye ' + name
}

module.exports = { greet, farewell }
EOF
cat > "$R/units_service.dart" <<'EOF'
String formatUnits(int count) {
  return 'feature units => $count';
}
EOF
cat > "$R/release-notes.md" <<'EOF'
# Release notes

## Summary
Spanish translation pass.

<!-- keep three lines of shared context between sections so git keeps the -->
<!-- conflicts apart instead of coalescing them into one big chunk -->
<!-- ------------------------------------------------------------ -->

## Added
- Spanish greetings
- localized farewells

<!-- ------------------------------------------------------------ -->
<!-- shared context -->
<!-- ------------------------------------------------------------ -->

## Fixed
- accent handling

<!-- ------------------------------------------------------------ -->
<!-- shared context -->
<!-- ------------------------------------------------------------ -->

## Notes
Unchanged on both branches.

<!-- ------------------------------------------------------------ -->
<!-- shared context -->
<!-- ------------------------------------------------------------ -->

## Credits
- the i18n crew
EOF
big_log "feature edition" > "$R/big-log.txt"
echo "only on feature" > "$R/feature-notes.md"
git -C "$R" add -A && git -C "$R" commit -qm "feature: translate to Spanish"

git -C "$R" checkout -q main
cat > "$R/greeting.txt" <<'EOF'
HELLO WORLD (from main)
This line stays the same.
GOODBYE WORLD (from main)
EOF
cat > "$R/app.js" <<'EOF'
function greet(name) {
  return `HELLO ${name.toUpperCase()} (main version)`
}

function farewell(name) {
  return 'Bye ' + name
}

module.exports = { greet, farewell }
EOF
cat > "$R/release-notes.md" <<'EOF'
# Release notes

## Summary
SHOUTING RELEASE.

<!-- keep three lines of shared context between sections so git keeps the -->
<!-- conflicts apart instead of coalescing them into one big chunk -->
<!-- ------------------------------------------------------------ -->

## Added
- UPPERCASE GREETINGS

<!-- ------------------------------------------------------------ -->
<!-- shared context -->
<!-- ------------------------------------------------------------ -->

## Fixed
- QUIET OUTPUT

<!-- ------------------------------------------------------------ -->
<!-- shared context -->
<!-- ------------------------------------------------------------ -->

## Notes
Unchanged on both branches.

<!-- ------------------------------------------------------------ -->
<!-- shared context -->
<!-- ------------------------------------------------------------ -->

## Credits
- THE LOUD CREW
EOF
big_log "MAIN EDITION" > "$R/big-log.txt"
git -C "$R" rm -q -- units_service.dart
git -C "$R" add -A && git -C "$R" commit -qm "main: shout the greetings"

summary "merge-conflict" "merge 'feature' into main ⇒ content conflicts + modify/delete; release-notes.md has 4 separate chunks for the conflict navigator / whole-side checkboxes; big-log.txt is 520 lines with conflicts at lines 150/200/500"
