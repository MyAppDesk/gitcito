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
git -C "$R" rm -q -- units_service.dart
git -C "$R" add -A && git -C "$R" commit -qm "main: shout the greetings"

summary "merge-conflict" "merge 'feature' into main ⇒ content conflicts + modify/delete; release-notes.md has 4 separate chunks for the conflict navigator / whole-side checkboxes"
