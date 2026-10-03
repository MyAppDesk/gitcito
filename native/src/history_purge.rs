use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;
use std::process::{Command, Output};
use std::time::{SystemTime, UNIX_EPOCH};

use git2::{Repository, StatusOptions};

#[derive(Clone, Debug, Default)]
pub struct HistoryPathEntry {
    pub path: String,
    pub bytes: u64,
    pub versions: usize,
    pub deleted: bool,
}

#[derive(Clone, Debug, Default)]
pub struct HistoryPurgePreview {
    pub paths: Vec<String>,
    pub commits: usize,
    pub first_commit: Option<(String, String, i64)>,
    pub branches: Vec<String>,
    pub tags: Vec<String>,
    pub bytes: u64,
    pub blocked: Option<HistoryPurgeBlock>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HistoryPurgeBlock {
    GitOperation,
    DirtyWorktree,
    ExistingFilterBranchBackups,
}

#[derive(Clone, Debug, Default)]
pub struct HistoryPurgeBackup {
    pub prefix: String,
    pub at: u64,
    pub refs: usize,
    pub paths: Vec<String>,
}

#[derive(Clone, Debug, Default)]
pub struct HistoryPurgeResult {
    pub backup: HistoryPurgeBackup,
    pub rewritten: usize,
}

pub enum HistoryPurgeOutcome {
    Applied(HistoryPurgeResult),
    PreviewChanged(HistoryPurgePreview),
}

fn git(path: &Path, args: &[&str]) -> Result<Output, String> {
    Command::new("git")
        .arg("-C")
        .arg(path)
        .args(args)
        .output()
        .map_err(|error| format!("Could not run git: {error}"))
}

fn git_text(path: &Path, args: &[&str]) -> Result<String, String> {
    let output = git(path, args)?;
    if !output.status.success() {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(if message.is_empty() { "Git command failed".into() } else { message });
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

fn git_text_owned(path: &Path, args: &[String]) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(path)
        .args(args)
        .output()
        .map_err(|error| format!("Could not run git: {error}"))?;
    if !output.status.success() {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(if message.is_empty() { "Git command failed".into() } else { message });
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

fn clean_paths(paths: &[String]) -> Result<Vec<String>, String> {
    let clean = paths.iter().map(|path| path.trim()).filter(|path| !path.is_empty())
        .map(str::to_owned).collect::<Vec<_>>();
    if clean.is_empty() {
        return Err("Choose at least one path.".into());
    }
    for path in &clean {
        let parsed = Path::new(path);
        if parsed.is_absolute() || parsed.components().any(|component| {
            matches!(component, std::path::Component::ParentDir | std::path::Component::RootDir | std::path::Component::Prefix(_))
        }) {
            return Err(format!("Path must stay inside the repository: {path}"));
        }
    }
    Ok(clean)
}

fn pathspec_args(paths: &[String]) -> Vec<String> {
    paths.iter().map(|path| format!(":(literal){path}")).collect()
}

fn blob_bytes_for_paths(repo_path: &Path, paths: &[String]) -> u64 {
    let mut args = vec![
        "rev-list".to_owned(), "--objects".to_owned(), "--branches".to_owned(), "--tags".to_owned(), "--".to_owned(),
    ];
    args.extend(pathspec_args(paths));
    let listed = git_text_owned(repo_path, &args).unwrap_or_default();
    let wanted = paths.iter().collect::<BTreeSet<_>>();
    let shas = listed.lines().filter_map(|line| {
        let (sha, name) = line.split_once(' ')?;
        wanted.contains(&name.to_owned()).then(|| sha.to_owned())
    }).collect::<BTreeSet<_>>();
    shas.iter().map(|sha| {
        git_text(repo_path, &["cat-file", "-s", sha]).ok()
            .and_then(|size| size.trim().parse::<u64>().ok()).unwrap_or(0)
    }).sum()
}

fn ref_pairs(repo_path: &Path, prefix: &str) -> Result<Vec<(String, String)>, String> {
    let output = git_text(repo_path, &["for-each-ref", "--format=%(refname) %(objectname)", prefix])?;
    Ok(output.lines().filter_map(|line| {
        let (name, sha) = line.trim().split_once(' ')?;
        Some((name.to_owned(), sha.to_owned()))
    }).collect())
}

pub fn history_paths(repo_path: &Path, max: usize) -> Vec<HistoryPathEntry> {
    let sizes = git_text(repo_path, &["cat-file", "--batch-all-objects", "--batch-check=%(objectname) %(objecttype) %(objectsize)"])
        .unwrap_or_default().lines().filter_map(|line| {
            let mut fields = line.split_whitespace();
            let sha = fields.next()?;
            if fields.next()? != "blob" { return None; }
            Some((sha.to_owned(), fields.next()?.parse::<u64>().ok()?))
        }).collect::<BTreeMap<_, _>>();
    let mut by_path: BTreeMap<String, BTreeMap<String, u64>> = BTreeMap::new();
    for line in git_text(repo_path, &["rev-list", "--objects", "--all"]).unwrap_or_default().lines() {
        let Some((sha, path)) = line.split_once(' ') else { continue; };
        let Some(size) = sizes.get(sha) else { continue; };
        by_path.entry(path.to_owned()).or_default().insert(sha.to_owned(), *size);
    }
    let tracked = git_text(repo_path, &["ls-files"]).unwrap_or_default()
        .lines().map(str::to_owned).collect::<BTreeSet<_>>();
    let mut entries = by_path.into_iter().map(|(path, blobs)| HistoryPathEntry {
        deleted: !tracked.contains(&path),
        bytes: blobs.values().sum(),
        versions: blobs.len(),
        path,
    }).collect::<Vec<_>>();
    entries.sort_by(|a, b| b.bytes.cmp(&a.bytes).then_with(|| a.path.cmp(&b.path)));
    entries.truncate(max);
    entries
}

pub fn history_purge_preview(repo_path: &Path, paths: &[String]) -> Result<HistoryPurgePreview, String> {
    let paths = clean_paths(paths)?;
    let repo = Repository::discover(repo_path).map_err(|error| error.message().to_owned())?;
    let mut status_options = StatusOptions::new();
    status_options.include_untracked(true).recurse_untracked_dirs(true);
    let dirty = !repo.statuses(Some(&mut status_options)).map_err(|error| error.message().to_owned())?.is_empty();
    let has_filter_branch_backups = !ref_pairs(repo_path, "refs/original").unwrap_or_default().is_empty();
    let blocked = if repo.state() != git2::RepositoryState::Clean {
        Some(HistoryPurgeBlock::GitOperation)
    } else if dirty {
        Some(HistoryPurgeBlock::DirtyWorktree)
    } else if has_filter_branch_backups {
        Some(HistoryPurgeBlock::ExistingFilterBranchBackups)
    } else { None };
    let mut log_args = vec!["log".to_owned(), "--branches".to_owned(), "--tags".to_owned(), "--format=%H%x00%s%x00%at".to_owned(), "--".to_owned()];
    log_args.extend(pathspec_args(&paths));
    let entries = git_text_owned(repo_path, &log_args).unwrap_or_default().lines().filter_map(|line| {
        let mut fields = line.split('\0');
        Some((fields.next()?.to_owned(), fields.next()?.to_owned(), fields.next()?.parse().ok()?))
    }).collect::<Vec<_>>();
    let refs = ref_pairs(repo_path, "refs/heads")?.into_iter()
        .chain(ref_pairs(repo_path, "refs/tags")?).collect::<Vec<_>>();
    let branches = refs.iter().filter_map(|(name, _)| name.strip_prefix("refs/heads/").map(str::to_owned)).collect();
    let tags = refs.iter().filter_map(|(name, _)| name.strip_prefix("refs/tags/").map(str::to_owned)).collect();
    Ok(HistoryPurgePreview {
        commits: entries.len(),
        first_commit: entries.last().cloned(),
        bytes: blob_bytes_for_paths(repo_path, &paths),
        paths,
        branches,
        tags,
        blocked,
    })
}

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

fn purge_config_key(at: u64) -> String { format!("gitcito.prepurge.at{at}") }

fn refs_for_backup(repo_path: &Path, prefix: &str) -> Result<Vec<(String, String)>, String> {
    ref_pairs(repo_path, prefix)
}

pub fn history_purge(
    repo_path: &Path,
    paths: &[String],
    reviewed: &HistoryPurgePreview,
) -> Result<HistoryPurgeOutcome, String> {
    let paths = clean_paths(paths)?;
    let preview = history_purge_preview(repo_path, &paths)?;
    let same_review = preview.paths == reviewed.paths
        && preview.commits == reviewed.commits
        && preview.first_commit == reviewed.first_commit
        && preview.branches == reviewed.branches
        && preview.tags == reviewed.tags
        && preview.bytes == reviewed.bytes;
    if !same_review {
        return Ok(HistoryPurgeOutcome::PreviewChanged(preview));
    }
    if let Some(blocked) = preview.blocked {
        return Err(match blocked {
            HistoryPurgeBlock::GitOperation => "Finish or abort the operation in progress first.",
            HistoryPurgeBlock::DirtyWorktree => "Commit or stash your changes before continuing.",
            HistoryPurgeBlock::ExistingFilterBranchBackups => "Existing filter-branch backups must be handled before rewriting history.",
        }.into());
    }
    if preview.commits == 0 { return Err("No commit touches that path — nothing to rewrite.".into()); }

    let mut at = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    while !refs_for_backup(repo_path, &format!("refs/gitcito/pre-purge/{at}"))?.is_empty() { at += 1; }
    let prefix = format!("refs/gitcito/pre-purge/{at}");
    let refs = ref_pairs(repo_path, "refs/heads")?.into_iter()
        .chain(ref_pairs(repo_path, "refs/tags")?).collect::<Vec<_>>();
    if refs.is_empty() { return Err("No branches or tags to rewrite.".into()); }

    let mut created: Vec<String> = Vec::new();
    for (name, sha) in &refs {
        let backup = format!("{prefix}/{}", name.trim_start_matches("refs/"));
        if let Err(error) = git_text(repo_path, &["update-ref", &backup, sha]) {
            for ref_name in created { let _ = git(repo_path, &["update-ref", "-d", &ref_name]); }
            return Err(error);
        }
        created.push(backup);
    }
    let clean_paths = paths.join("\n");
    if let Err(error) = git_text(repo_path, &["config", &purge_config_key(at), &clean_paths]) {
        for ref_name in created { let _ = git(repo_path, &["update-ref", "-d", &ref_name]); }
        return Err(error);
    }

    let index_filter = format!(
        "git rm --cached --ignore-unmatch -- {}",
        paths.iter().map(|path| shell_quote(&format!(":(literal){path}"))).collect::<Vec<_>>().join(" "),
    );
    let output = Command::new("git")
        .arg("-C").arg(repo_path)
        .args(["filter-branch", "--force", "--index-filter", &index_filter, "--prune-empty", "--tag-name-filter", "cat", "--", "--branches", "--tags"])
        .env("FILTER_BRANCH_SQUELCH_WARNING", "1")
        .env("GIT_TERMINAL_PROMPT", "0")
        .output().map_err(|error| format!("Could not run git filter-branch: {error}"))?;
    if !output.status.success() {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(if message.is_empty() { "git filter-branch failed".into() } else { message });
    }
    for (name, _) in ref_pairs(repo_path, "refs/original")? {
        let _ = git(repo_path, &["update-ref", "-d", &name]);
    }
    Ok(HistoryPurgeOutcome::Applied(HistoryPurgeResult {
        backup: HistoryPurgeBackup { prefix, at, refs: refs.len(), paths },
        rewritten: refs.len(),
    }))
}

pub fn history_purge_backups(repo_path: &Path) -> Result<Vec<HistoryPurgeBackup>, String> {
    let refs = ref_pairs(repo_path, "refs/gitcito/pre-purge")?;
    let mut by_stamp: BTreeMap<u64, usize> = BTreeMap::new();
    for (name, _) in refs {
        if let Some(at) = name.split('/').nth(3).and_then(|stamp| stamp.parse::<u64>().ok()) {
            *by_stamp.entry(at).or_default() += 1;
        }
    }
    let mut backups = by_stamp.into_iter().rev().map(|(at, count)| {
        let prefix = format!("refs/gitcito/pre-purge/{at}");
        let paths = git_text(repo_path, &["config", "--get", &purge_config_key(at)])
            .unwrap_or_default().lines().map(str::to_owned).collect();
        HistoryPurgeBackup { prefix, at, refs: count, paths }
    }).collect::<Vec<_>>();
    backups.shrink_to_fit();
    Ok(backups)
}

fn backup_refs(repo_path: &Path, prefix: &str) -> Result<Vec<(String, String)>, String> {
    if !prefix.starts_with("refs/gitcito/pre-purge/") { return Err("Not a purge backup.".into()); }
    refs_for_backup(repo_path, prefix)
}

pub fn history_purge_restore(repo_path: &Path, prefix: &str) -> Result<(), String> {
    let repo = Repository::discover(repo_path).map_err(|error| error.message().to_owned())?;
    let mut status_options = StatusOptions::new();
    status_options.include_untracked(true).recurse_untracked_dirs(true);
    if repo.state() != git2::RepositoryState::Clean
        || !repo.statuses(Some(&mut status_options)).map_err(|error| error.message().to_owned())?.is_empty()
    {
        return Err("Commit, stash, or abort operations before restoring this backup.".into());
    }
    let saved = backup_refs(repo_path, prefix)?;
    if saved.is_empty() { return Err("That backup is empty.".into()); }
    let current_branch = repo.head().ok().and_then(|head| head.shorthand().map(str::to_owned));
    git_text(repo_path, &["checkout", "--detach"])?;
    for (backup, sha) in &saved {
        let original = format!("refs/{}", backup.trim_start_matches(&format!("{prefix}/")));
        git_text(repo_path, &["update-ref", &original, sha])?;
    }
    let target_branch = current_branch.filter(|branch| saved.iter().any(|(name, _)| name == &format!("{prefix}/heads/{branch}")))
        .or_else(|| saved.iter().find_map(|(name, _)| name.strip_prefix(&format!("{prefix}/heads/")).map(str::to_owned)));
    if let Some(branch) = target_branch { git_text(repo_path, &["checkout", &branch])?; }
    Ok(())
}

pub fn history_purge_drop_backup(repo_path: &Path, prefix: &str) -> Result<(), String> {
    let refs = backup_refs(repo_path, prefix)?;
    if refs.is_empty() { return Err("That backup is empty.".into()); }
    for (name, _) in refs { let _ = git(repo_path, &["update-ref", "-d", &name]); }
    if let Some(at) = prefix.split('/').nth(3).and_then(|value| value.parse::<u64>().ok()) {
        let _ = git(repo_path, &["config", "--unset", &purge_config_key(at)]);
    }
    let _ = git(repo_path, &["reflog", "expire", "--expire=now", "--all"]);
    let output = git(repo_path, &["gc", "--prune=now"])?;
    if !output.status.success() {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(if message.is_empty() { "Git garbage collection failed".into() } else { message });
    }
    Ok(())
}
