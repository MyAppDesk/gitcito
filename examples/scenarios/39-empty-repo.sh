# shellcheck shell=bash disable=SC2154
# 39. empty-repo — brand-new repo with staged files but no commits yet.
# Demonstrates the WIP row appearing on a repo that has never been committed.
# Sourced by setup-playground.sh with $ROOT and lib helpers in scope.
R="$ROOT/empty-repo"
new_repo "$R"

cat > "$R/README.md" <<'EOF'
# My New Project

Welcome to the project! This repository has just been initialized.
EOF

cat > "$R/main.js" <<'EOF'
console.log('Hello, world!')
EOF

cat > "$R/.gitignore" <<'EOF'
node_modules/
.DS_Store
EOF

# Stage everything so the WIP row appears in the graph with pending changes.
git -C "$R" add -A

summary "empty-repo" "brand-new repo with staged files — WIP row shown before first commit"
