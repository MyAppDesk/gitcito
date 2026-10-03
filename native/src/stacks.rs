use std::collections::{BTreeMap, BTreeSet};
use std::process::Command;
use std::path::Path;

use git2::Repository;

#[derive(Clone, Debug)]
pub struct StackBranch {
    pub name: String,
    pub parent: String,
    pub commits: usize,
    pub is_current: bool,
    pub needs_restack: bool,
}

#[derive(Clone, Debug, Default)]
pub struct StackInfo {
    pub trunk: String,
    pub branches: Vec<StackBranch>,
}

#[derive(Clone, Debug, Default)]
pub struct StackViewData {
    pub leaves: Vec<String>,
    pub selected_leaf: Option<String>,
    pub info: StackInfo,
}

#[derive(Clone)]
pub struct StackRestackSnapshot {
    pub refs: Vec<(String, git2::Oid, git2::Oid)>,
    pub config: Vec<(String, Option<String>, Option<String>)>,
    pub head_ref: Option<String>,
    pub head_before: git2::Oid,
}

pub enum RestackError {
    Dirty,
    OperationInProgress,
    Protected(Vec<String>),
    Conflict { branch: String, parent: String },
    Failed(String),
}

fn git(path: &Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git").arg("-C").arg(path).args(args).output()
        .map_err(|error| error.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_owned())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_owned())
    }
}

fn restore_head(path: &Path, head_ref: Option<&str>, head: git2::Oid) {
    if let Some(branch) = head_ref.and_then(|reference| reference.strip_prefix("refs/heads/")) {
        let _ = git(path, &["checkout", "--force", "--detach", &head.to_string()]);
        let _ = git(path, &["checkout", "--force", branch]);
    } else {
        let _ = git(path, &["checkout", "--force", "--detach", &head.to_string()]);
    }
}

fn restore_config(path: &Path, changes: &[(String, Option<String>, Option<String>)], use_before: bool) {
    for (key, before, after) in changes {
        let value = if use_before { before } else { after };
        let mut command = Command::new("git");
        command.arg("-C").arg(path).args(["config", "--local"]);
        if let Some(value) = value {
            command.args(["--replace-all", key, value]);
        } else {
            command.args(["--unset-all", key]);
        }
        let _ = command.output();
    }
}

fn clean_worktree(repo: &Repository) -> Result<bool, String> {
    let mut options = git2::StatusOptions::new();
    options.include_untracked(true).recurse_untracked_dirs(true);
    repo.statuses(Some(&mut options)).map(|statuses| statuses.is_empty())
        .map_err(|error| error.to_string())
}

fn parents(repo: &Repository) -> Result<BTreeMap<String, String>, String> {
    let config = repo.config().map_err(|error| error.to_string())?;
    let mut entries = config.entries(Some("branch.*.gitcitoparent"))
        .map_err(|error| error.to_string())?;
    let mut parents = BTreeMap::new();
    while let Some(entry) = entries.next() {
        let entry = entry.map_err(|error| error.to_string())?;
        let Some(key) = entry.name() else { continue };
        let Some(name) = key.strip_prefix("branch.").and_then(|key| key.strip_suffix(".gitcitoparent")) else {
            continue;
        };
        let Some(parent) = entry.value() else { continue };
        parents.insert(name.to_owned(), parent.to_owned());
    }
    Ok(parents)
}

pub fn leaves(repo_path: &Path) -> Result<Vec<String>, String> {
    let repo = Repository::open(repo_path).map_err(|error| error.to_string())?;
    let parents = parents(&repo)?;
    let claimed = parents.values().collect::<BTreeSet<_>>();
    let mut leaves = parents.keys()
        .filter(|name| !claimed.contains(name))
        .cloned()
        .collect::<Vec<_>>();
    leaves.sort();
    Ok(leaves)
}

pub fn info(repo_path: &Path, leaf: &str) -> Result<StackInfo, String> {
    let repo = Repository::open(repo_path).map_err(|error| error.to_string())?;
    let parents = parents(&repo)?;
    let current = repo.head().ok().and_then(|head| head.shorthand().map(str::to_owned));

    let mut top_down = Vec::new();
    let mut seen = BTreeSet::new();
    let mut branch = leaf.to_owned();
    while let Some(parent) = parents.get(&branch) {
        if !seen.insert(branch.clone()) {
            return Err("Stack parent configuration contains a cycle".to_owned());
        }
        top_down.push((branch.clone(), parent.clone()));
        branch = parent.clone();
    }
    if top_down.is_empty() {
        return Ok(StackInfo::default());
    }

    let trunk = branch;
    let mut branches = Vec::with_capacity(top_down.len());
    for (name, parent) in top_down.into_iter().rev() {
        let branch_tip = repo.revparse_single(&format!("refs/heads/{name}"))
            .or_else(|_| repo.revparse_single(&name))
            .map_err(|error| format!("Could not read stack branch {name}: {error}"))?
            .id();
        let parent_tip = repo.revparse_single(&parent)
            .map_err(|error| format!("Could not read stack parent {parent}: {error}"))?
            .id();
        let mut walk = repo.revwalk().map_err(|error| error.to_string())?;
        walk.push(branch_tip).map_err(|error| error.to_string())?;
        walk.hide(parent_tip).map_err(|error| error.to_string())?;
        let commits = walk.filter(Result::is_ok).count();
        let needs_restack = repo.merge_base(parent_tip, branch_tip)
            .map(|base| base != parent_tip)
            .unwrap_or(true);
        branches.push(StackBranch {
            is_current: current.as_deref() == Some(name.as_str()),
            name,
            parent,
            commits,
            needs_restack,
        });
    }
    Ok(StackInfo { trunk, branches })
}

pub fn restack(
    repo_path: &Path,
    leaf: &str,
    protected_branches: &[String],
) -> Result<StackRestackSnapshot, RestackError> {
    let repo = Repository::open(repo_path).map_err(|error| RestackError::Failed(error.to_string()))?;
    if repo.state() != git2::RepositoryState::Clean {
        return Err(RestackError::OperationInProgress);
    }
    if !clean_worktree(&repo).map_err(RestackError::Failed)? {
        return Err(RestackError::Dirty);
    }
    let stack = info(repo_path, leaf).map_err(RestackError::Failed)?;
    let protected = stack.branches.iter().filter(|branch| {
        protected_branches.iter().any(|protected| protected == &branch.name)
    }).map(|branch| branch.name.clone()).collect::<Vec<_>>();
    if !protected.is_empty() {
        return Err(RestackError::Protected(protected));
    }
    let head = repo.head().map_err(|error| RestackError::Failed(error.to_string()))?;
    let head_ref = head.name().map(str::to_owned);
    let head_before = head.target().ok_or_else(|| RestackError::Failed(
        "Cannot restack with an unborn HEAD".to_owned(),
    ))?;

    let mut refs = Vec::with_capacity(stack.branches.len());
    let mut config = Vec::with_capacity(stack.branches.len() * 2);
    for branch in &stack.branches {
        let reference = format!("refs/heads/{}", branch.name);
        let tip = repo.find_reference(&reference).map_err(|error| {
            RestackError::Failed(format!("Could not read stack branch {}: {error}", branch.name))
        })?.target().ok_or_else(|| RestackError::Failed(format!(
            "Stack branch {} has no commit", branch.name,
        )))?;
        refs.push((branch.name.clone(), tip, tip));
        for suffix in ["gitcitoparent", "gitcitobase"] {
            let key = format!("branch.{}.{}", branch.name, suffix);
            let before = local_config(repo_path, &key).map_err(RestackError::Failed)?;
            config.push((key, before.clone(), before));
        }
    }

    let result = (|| -> Result<(), RestackError> {
        for (index, branch) in stack.branches.iter().enumerate() {
            let parent_tip = git(repo_path, &["rev-parse", "--verify", &branch.parent])
                .map_err(RestackError::Failed)?;
            let merge_base = git(repo_path, &["merge-base", &parent_tip, &branch.name])
                .map_err(RestackError::Failed)?;
            let base_key = format!("branch.{}.gitcitobase", branch.name);
            let recorded_base = local_config(repo_path, &base_key)
                .map_err(RestackError::Failed)?
                .unwrap_or(merge_base);
            if merge_base != parent_tip && recorded_base != parent_tip {
                let output = Command::new("git").arg("-C").arg(repo_path)
                    .args(["rebase", "--onto", &parent_tip, &recorded_base, &branch.name])
                    .output().map_err(|error| RestackError::Failed(error.to_string()))?;
                if !output.status.success() {
                    let detail = String::from_utf8_lossy(&output.stderr).to_string();
                    if detail.to_lowercase().contains("conflict") {
                        return Err(RestackError::Conflict {
                            branch: branch.name.clone(), parent: branch.parent.clone(),
                        });
                    }
                    return Err(RestackError::Failed(detail.trim().to_owned()));
                }
            }
            git(repo_path, &["config", "--local", "--replace-all", &base_key, &parent_tip])
                .map_err(RestackError::Failed)?;
            let new_tip = git(repo_path, &["rev-parse", "--verify", &branch.name])
                .map_err(RestackError::Failed)?;
            refs[index].2 = git2::Oid::from_str(&new_tip)
                .map_err(|error| RestackError::Failed(error.to_string()))?;
            for (_, _, after) in config.iter_mut().filter(|(key, _, _)| key == &base_key) {
                *after = Some(parent_tip.clone());
            }
        }
        Ok(())
    })();

    if let Err(error) = result {
        let _ = git(repo_path, &["rebase", "--abort"]);
        restore_head(repo_path, None, head_before);
        for (name, before, _) in &refs {
            let reference = format!("refs/heads/{name}");
            let _ = git(repo_path, &["update-ref", &reference, &before.to_string()]);
        }
        restore_config(repo_path, &config, true);
        restore_head(repo_path, head_ref.as_deref(), head_before);
        return Err(error);
    }
    restore_head(repo_path, head_ref.as_deref(), head_before);
    for (key, _, after) in &mut config {
        *after = local_config(repo_path, key).map_err(RestackError::Failed)?;
    }
    Ok(StackRestackSnapshot { refs, config, head_ref, head_before })
}

fn local_config(repo_path: &Path, key: &str) -> Result<Option<String>, String> {
    let output = Command::new("git").arg("-C").arg(repo_path)
        .args(["config", "--local", "--get", key]).output()
        .map_err(|error| error.to_string())?;
    if output.status.success() {
        Ok(Some(String::from_utf8_lossy(&output.stdout).trim_end().to_owned()))
    } else if output.status.code() == Some(1) {
        Ok(None)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_owned())
    }
}

pub fn undo_restack(
    repo_path: &Path,
    snapshot: &StackRestackSnapshot,
    language: &str,
) -> Result<(), String> {
    let repo = Repository::open(repo_path).map_err(|error| error.to_string())?;
    if repo.state() != git2::RepositoryState::Clean || !clean_worktree(&repo)? {
        return Err(crate::i18n::translate(language, "stack.undoRestackDirty").to_owned());
    }
    for (name, _, after) in &snapshot.refs {
        let reference = format!("refs/heads/{name}");
        if repo.find_reference(&reference).ok().and_then(|reference| reference.target()) != Some(*after) {
            return Err(crate::i18n::translate(language, "stack.undoRestackChanged").to_owned());
        }
    }
    for (key, _, after) in &snapshot.config {
        if local_config(repo_path, key)? != *after {
            return Err(crate::i18n::translate(language, "stack.undoRestackChanged").to_owned());
        }
    }
    let current_head = repo.head().ok();
    let current_oid = current_head.and_then(|head| head.target())
        .ok_or_else(|| crate::i18n::translate(language, "stack.undoRestackChanged").to_owned())?;
    restore_head(repo_path, None, current_oid);
    for (name, before, _) in &snapshot.refs {
        let reference = format!("refs/heads/{name}");
        git(repo_path, &["update-ref", &reference, &before.to_string()])?;
    }
    restore_config(repo_path, &snapshot.config, true);
    restore_head(repo_path, snapshot.head_ref.as_deref(), snapshot.head_before);
    Ok(())
}

pub fn view(repo_path: &Path, leaf_hint: Option<&str>, current: Option<&str>) -> Result<StackViewData, String> {
    let leaves = leaves(repo_path)?;
    let selected_leaf = leaf_hint.filter(|leaf| leaves.iter().any(|candidate| candidate == leaf))
        .map(str::to_owned)
        .or_else(|| {
            current.and_then(|current| leaves.iter().find(|leaf| {
                info(repo_path, leaf).is_ok_and(|stack| stack.branches.iter().any(|branch| branch.name == current))
            }).cloned())
        })
        .or_else(|| leaves.first().cloned());
    let info = selected_leaf.as_deref().map(|leaf| info(repo_path, leaf))
        .transpose()?.unwrap_or_default();
    Ok(StackViewData { leaves, selected_leaf, info })
}
