# shellcheck shell=bash disable=SC2154
# 19. signed-commits — exercises the commit-signature badges (verified / unverified
# / unsigned). Uses SSH signing with a repo-local allowed-signers file so git can
# VERIFY the good signature from committed repo config alone — no GPG keyring or
# GNUPGHOME pollution on the user's machine, and the green "verified" badge shows
# the moment the repo is opened.
#
# Guarded on `ssh-keygen`; skips cleanly if unavailable.
R="$ROOT/signed-commits"

if ! command -v ssh-keygen >/dev/null 2>&1; then
  new_repo "$R"
  echo "# signed-commits (skipped)\n\nssh-keygen not found — install OpenSSH to generate this demo." > "$R/README.md"
  git -C "$R" add -A && git -C "$R" commit -qm "chore: ssh-keygen unavailable (demo skipped)"
  summary "signed-commits" "SKIPPED — ssh-keygen not installed"
  return 0
fi

new_repo "$R"

# Keys live outside the working tree (still under playground/, wiped on rebuild).
KEYDIR="$ROOT/.keys-signed"
rm -rf "$KEYDIR"; mkdir -p "$KEYDIR"
ssh-keygen -t ed25519 -N '' -C playground@example.com -f "$KEYDIR/sign_key" >/dev/null 2>&1
ssh-keygen -t ed25519 -N '' -C stranger@example.com   -f "$KEYDIR/other_key" >/dev/null 2>&1

# allowed-signers (committed) lets git verify signatures by the trusted key.
printf 'playground@example.com %s\n' "$(cat "$KEYDIR/sign_key.pub")" > "$R/.allowed_signers"

git -C "$R" config gpg.format ssh
git -C "$R" config user.signingkey "$KEYDIR/sign_key.pub"
git -C "$R" config gpg.ssh.allowedSignersFile "$R/.allowed_signers"
# Repo default stays unsigned so you can toggle signing on from Settings yourself.
git -C "$R" config commit.gpgsign false

cat > "$R/README.md" <<'EOF'
# Signed Commits

Three commits demonstrate every signature-badge state in Gitcito:

| Commit                         | Badge                       |
|--------------------------------|-----------------------------|
| feat: trusted signed commit    | 🛡️ green — Verified         |
| feat: signed by an unknown key | 🛡️ grey — Signed, unverified|
| feat: unsigned commit          | (no badge)                  |

Verification works from this repo's own config:
`gpg.format=ssh` + `gpg.ssh.allowedSignersFile=.allowed_signers`.

Try it: open **Settings → Commit signing**, turn signing on (the key is already
set), then make a commit — it gets the green Verified badge too.
EOF
git -C "$R" add -A && git -C "$R" commit -qm "docs: signing demo README"

# (1) unsigned
echo "plain" > "$R/unsigned.txt"
git -C "$R" add -A && git -C "$R" commit -qm "feat: unsigned commit"

# (2) signed by the trusted key → verified (green)
echo "trusted" > "$R/trusted.txt"
git -C "$R" add -A && git -C "$R" -c commit.gpgsign=true commit -qm "feat: trusted signed commit"

# (3) signed by a key NOT in allowed-signers → signed but unverified (grey)
echo "stranger" > "$R/stranger.txt"
git -C "$R" add -A && \
  git -C "$R" -c commit.gpgsign=true -c user.signingkey="$KEYDIR/other_key.pub" \
    commit -qm "feat: signed by an unknown key"

summary "signed-commits" "verified / unverified / unsigned commits — signature badges (SSH signing)"
