# shellcheck shell=bash disable=SC2154
# 51. host-remotes — one repo per hosting provider, to exercise credential
# resolution without needing an account on any of them.
#
# Gitcito no longer asks for a token per provider up front: it resolves the
# credential from the remote URL, preferring one configured in Settings and
# otherwise borrowing whatever git's own credential helper holds for that host.
# Azure DevOps is the interesting case — its organization and project live in
# the remote URL, and each organization needs its own credential, so two ADO
# remotes under *different* orgs must resolve independently.
#
# Nothing here reaches the network. The remotes are unreachable on purpose:
# what is being checked is which credential Gitcito goes looking for, and that
# a rejected one produces a readable message rather than a JSON parse error.
R="$ROOT/host-remotes"
new_repo "$R"

rand_text 20 "readme" > "$R/README.md"
mkdir -p "$R/src"
rand_text 30 "main" > "$R/src/main.ts"
git -C "$R" add -A && git -C "$R" commit -qm "initial commit"

git -C "$R" checkout -qb feature/host-remotes
rand_text 15 "feature" > "$R/src/feature.ts"
git -C "$R" add -A && git -C "$R" commit -qm "feat: add feature module"
git -C "$R" checkout -q main 2>/dev/null || git -C "$R" checkout -q master

# One remote per provider, each in the URL shape the parser must recognise.
# 'origin' is Azure DevOps so the PR panel takes the ADO path by default.
git -C "$R" remote add origin "https://dev.azure.com/contoso/Payments/_git/host-remotes"
git -C "$R" remote add ado-other "https://dev.azure.com/fabrikam/Billing/_git/host-remotes"
git -C "$R" remote add ado-legacy "https://contoso.visualstudio.com/Payments/_git/host-remotes"
git -C "$R" remote add github "https://github.com/contoso/host-remotes.git"
git -C "$R" remote add gitlab "https://gitlab.com/contoso/group/host-remotes.git"
git -C "$R" remote add bitbucket "https://bitbucket.org/contoso/host-remotes.git"

# An ssh remote, which has no credential to resolve — the helper is never asked
# for these, since ssh authenticates through the agent instead.
git -C "$R" remote add ado-ssh "git@ssh.dev.azure.com:v3/contoso/Payments/host-remotes"

summary "host-remotes" "one repo carrying an Azure DevOps (two orgs + legacy visualstudio.com), GitHub, GitLab, Bitbucket and ssh remote, for credential resolution per remote URL"
