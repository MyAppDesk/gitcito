use std::{collections::{BTreeMap, BTreeSet}, fs, path::PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
#[serde(default)]
pub struct Preferences {
    pub recent_repositories: Vec<PathBuf>,
    pub favorite_repositories: Vec<PathBuf>,
    pub repository_aliases: Vec<RepositoryAlias>,
    pub repository_folders: Vec<RepositoryFolder>,
    pub repository_scan_roots: Vec<RepositoryScanRoot>,
    pub discovered_repositories: Vec<PathBuf>,
    pub open_repositories: Vec<PathBuf>,
    pub active_repository: Option<PathBuf>,
    pub workspaces: Vec<Workspace>,
    pub active_workspace: Option<String>,
    pub theme_mode: ThemeMode,
    #[serde(default = "theme_default")]
    pub theme_id: String,
    #[serde(default = "language_default")]
    pub language: String,
    #[serde(default = "snapshot_interval_default")]
    pub snapshot_interval_minutes: u8,
    #[serde(default = "snapshot_guard_default")]
    pub snapshot_guard: bool,
    pub repository_wip_summary: bool,
    pub desktop_notifications: bool,
    pub repository_section_colors: BTreeMap<String, [u8; 4]>,
    pub external_editor_command: String,
    pub external_editor_file_args: String,
    pub external_editor_folder_args: String,
    pub repository_pull_mode: PullMode,
}

fn snapshot_interval_default() -> u8 { 15 }
fn snapshot_guard_default() -> bool { true }
fn theme_default() -> String { "gitcito".to_owned() }
fn language_default() -> String { "en".to_owned() }
fn folder_contains(selected: &str, candidate: &str) -> bool {
    candidate == selected || candidate.strip_prefix(selected).is_some_and(|remainder| remainder.starts_with('/'))
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            recent_repositories: Vec::new(),
            favorite_repositories: Vec::new(),
            repository_aliases: Vec::new(),
            repository_folders: Vec::new(),
            repository_scan_roots: Vec::new(),
            discovered_repositories: Vec::new(),
            open_repositories: Vec::new(),
            active_repository: None,
            workspaces: Vec::new(),
            active_workspace: None,
            theme_mode: ThemeMode::default(),
            theme_id: theme_default(),
            language: language_default(),
            snapshot_interval_minutes: snapshot_interval_default(),
            snapshot_guard: snapshot_guard_default(),
            repository_wip_summary: false,
            desktop_notifications: false,
            repository_section_colors: BTreeMap::new(),
            external_editor_command: String::new(),
            external_editor_file_args: "{path}".to_owned(),
            external_editor_folder_args: "{path}".to_owned(),
            repository_pull_mode: PullMode::default(),
        }
    }
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct RepositoryAlias {
    pub path: PathBuf,
    pub name: String,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct RepositoryFolder {
    pub path: PathBuf,
    pub folder: String,
}

impl Default for RepositoryFolder {
    fn default() -> Self { Self { path: PathBuf::new(), folder: String::new() } }
}

impl Default for RepositoryAlias {
    fn default() -> Self { Self { path: PathBuf::new(), name: String::new() } }
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct RepositoryScanRoot {
    pub path: PathBuf,
    pub depth: u8,
}

impl Default for RepositoryScanRoot {
    fn default() -> Self { Self { path: PathBuf::new(), depth: 3 } }
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct Workspace {
    pub name: String,
    pub repositories: Vec<PathBuf>,
    pub active_repository: Option<PathBuf>,
    pub groups: Vec<RepositoryGroup>,
    pub active_group: Option<String>,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct RepositoryGroup {
    pub name: String,
    pub repositories: Vec<PathBuf>,
    pub color: Option<[u8; 4]>,
    pub folders: Vec<RepositoryFolder>,
    pub active_folder: Option<String>,
}

impl Default for RepositoryGroup {
    fn default() -> Self {
        Self { name: String::new(), repositories: Vec::new(), color: None, folders: Vec::new(), active_folder: None }
    }
}

impl Default for Workspace {
    fn default() -> Self {
        Self { name: String::new(), repositories: Vec::new(), active_repository: None, groups: Vec::new(), active_group: None }
    }
}

#[derive(Clone, Copy, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ThemeMode {
    Light,
    Dark,
    #[default]
    System,
}

#[derive(Clone, Copy, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum PullMode {
    #[default]
    Default,
    FfOnly,
    Rebase,
}

impl Preferences {
    pub fn load() -> Self {
        preference_path()
            .and_then(|path| fs::read(path).ok())
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .unwrap_or_default()
    }

    pub fn remember_repository(&mut self, path: PathBuf) {
        self.recent_repositories.retain(|recent| recent != &path);
        self.recent_repositories.insert(0, path);
        self.recent_repositories.truncate(12);
        self.save();
    }

    pub fn toggle_favorite_repository(&mut self, path: PathBuf) -> bool {
        if let Some(index) = self.favorite_repositories.iter().position(|favorite| favorite == &path) {
            self.favorite_repositories.remove(index);
            self.save();
            false
        } else {
            self.favorite_repositories.insert(0, path);
            self.save();
            true
        }
    }

    pub fn repository_alias(&self, path: &PathBuf) -> Option<&str> {
        self.repository_aliases.iter().find(|alias| &alias.path == path).map(|alias| alias.name.as_str())
    }

    pub fn set_repository_alias(&mut self, path: PathBuf, name: Option<String>) {
        let name = name.map(|name| name.trim().to_owned()).filter(|name| !name.is_empty());
        self.repository_aliases.retain(|alias| alias.path != path);
        if let Some(name) = name { self.repository_aliases.push(RepositoryAlias { path, name }); }
        self.save();
    }

    pub fn repository_folder(&self, path: &PathBuf) -> Option<&str> {
        self.repository_folders.iter().find(|entry| &entry.path == path).map(|entry| entry.folder.as_str())
    }

    pub fn set_repository_folder(&mut self, path: PathBuf, folder: Option<String>) {
        let folder = folder.map(|folder| folder.trim().trim_matches('/').to_owned())
            .filter(|folder| !folder.is_empty());
        self.repository_folders.retain(|entry| entry.path != path);
        if let Some(folder) = folder { self.repository_folders.push(RepositoryFolder { path, folder }); }
        self.save();
    }

    pub fn add_repository_scan_root(&mut self, path: PathBuf) {
        if !self.repository_scan_roots.iter().any(|root| root.path == path) {
            self.repository_scan_roots.push(RepositoryScanRoot { path, depth: 3 });
            self.save();
        }
    }

    pub fn remove_repository_scan_root(&mut self, path: &PathBuf) {
        self.repository_scan_roots.retain(|root| &root.path != path);
        self.save();
    }

    pub fn set_repository_scan_depth(&mut self, path: &PathBuf, depth: u8) {
        if let Some(root) = self.repository_scan_roots.iter_mut().find(|root| &root.path == path) {
            root.depth = depth.clamp(1, 10);
            self.save();
        }
    }

    pub fn remember_discovered_repositories(&mut self, paths: &[PathBuf]) {
        for path in paths {
            if !self.discovered_repositories.contains(path) {
                self.discovered_repositories.push(path.clone());
            }
        }
        self.discovered_repositories.sort();
        self.save();
    }

    pub fn forget_repository(&mut self, path: &PathBuf) {
        self.recent_repositories.retain(|entry| entry != path);
        self.favorite_repositories.retain(|entry| entry != path);
        self.repository_aliases.retain(|alias| &alias.path != path);
        self.repository_folders.retain(|entry| &entry.path != path);
        self.discovered_repositories.retain(|entry| entry != path);
        self.open_repositories.retain(|entry| entry != path);
        if self.active_repository.as_ref() == Some(path) {
            self.active_repository = self.open_repositories.last().cloned();
        }
        for workspace in &mut self.workspaces {
            workspace.repositories.retain(|entry| entry != path);
            for group in &mut workspace.groups {
                group.repositories.retain(|entry| entry != path);
                group.folders.retain(|entry| &entry.path != path);
                if group.active_folder.as_ref().is_some_and(|active| !group.folders.iter()
                    .any(|folder| folder_contains(active, &folder.folder)))
                {
                    group.active_folder = None;
                }
            }
            if workspace.active_repository.as_ref() == Some(path) {
                workspace.active_repository = workspace.repositories.last().cloned();
            }
        }
        self.save_active_workspace();
        self.save();
    }

    pub fn relocate_repository(&mut self, old_path: &PathBuf, new_path: &PathBuf) {
        fn relocate(entries: &mut Vec<PathBuf>, old_path: &PathBuf, new_path: &PathBuf) {
            if entries.contains(old_path) {
                if entries.contains(new_path) {
                    entries.retain(|entry| entry != old_path);
                } else {
                    for entry in entries.iter_mut().filter(|entry| *entry == old_path) {
                        *entry = new_path.clone();
                    }
                }
            }
        }
        relocate(&mut self.recent_repositories, old_path, new_path);
        relocate(&mut self.favorite_repositories, old_path, new_path);
        relocate(&mut self.discovered_repositories, old_path, new_path);
        relocate(&mut self.open_repositories, old_path, new_path);
        let old_alias = self.repository_aliases.iter().position(|alias| &alias.path == old_path);
        if let Some(index) = old_alias {
            if self.repository_aliases.iter().any(|alias| &alias.path == new_path) {
                self.repository_aliases.remove(index);
            } else {
                self.repository_aliases[index].path = new_path.clone();
            }
        }
        let old_folder = self.repository_folders.iter().position(|entry| &entry.path == old_path);
        if let Some(index) = old_folder {
            if self.repository_folders.iter().any(|entry| &entry.path == new_path) {
                self.repository_folders.remove(index);
            } else {
                self.repository_folders[index].path = new_path.clone();
            }
        }
        for workspace in &mut self.workspaces {
            relocate(&mut workspace.repositories, old_path, new_path);
            for group in &mut workspace.groups {
                relocate(&mut group.repositories, old_path, new_path);
                if let Some(index) = group.folders.iter().position(|entry| &entry.path == old_path) {
                    if group.folders.iter().any(|entry| &entry.path == new_path) {
                        group.folders.remove(index);
                    } else {
                        group.folders[index].path = new_path.clone();
                    }
                }
                if group.active_folder.as_ref().is_some_and(|active| !group.folders.iter()
                    .any(|entry| folder_contains(active, &entry.folder)))
                {
                    group.active_folder = None;
                }
            }
            if workspace.active_repository.as_ref() == Some(old_path) {
                workspace.active_repository = Some(new_path.clone());
            }
        }
        if self.active_repository.as_ref() == Some(old_path) {
            self.active_repository = Some(new_path.clone());
        }
        self.save_active_workspace();
        self.save();
    }

    pub fn open_repository(&mut self, path: PathBuf) {
        self.open_repositories.retain(|open| open != &path);
        self.open_repositories.push(path.clone());
        self.active_repository = Some(path.clone());
        self.save_active_workspace();
        self.remember_repository(path);
    }

    pub fn close_repository(&mut self, path: &PathBuf) {
        self.open_repositories.retain(|open| open != path);
        if self.active_repository.as_ref() == Some(path) {
            self.active_repository = self.open_repositories.last().cloned();
        }
        self.save_active_workspace();
        self.save();
    }

    pub fn close_all_repositories(&mut self) {
        self.open_repositories.clear();
        self.active_repository = None;
        self.save_active_workspace();
        self.save();
    }

    pub fn set_repository_section_color(&mut self, section: &str, color: Option<[u8; 4]>) {
        if let Some(color) = color {
            self.repository_section_colors.insert(section.to_owned(), color);
        } else {
            self.repository_section_colors.remove(section);
        }
        self.save();
    }

    pub fn activate_repository(&mut self, path: PathBuf) {
        self.active_repository = Some(path);
        self.save_active_workspace();
        self.save();
    }

    pub fn create_workspace(&mut self, name: &str) -> bool {
        let name = name.trim();
        if name.is_empty() || self.workspaces.iter().any(|workspace| workspace.name.eq_ignore_ascii_case(name)) {
            return false;
        }
        self.workspaces.push(Workspace {
            name: name.to_owned(),
            repositories: self.open_repositories.clone(),
            active_repository: self.active_repository.clone(),
            groups: Vec::new(),
            active_group: None,
        });
        self.active_workspace = Some(name.to_owned());
        self.save();
        true
    }

    pub fn switch_workspace(&mut self, name: &str) -> Option<PathBuf> {
        if self.active_workspace.as_deref() == Some(name) { return self.active_repository.clone(); }
        self.save_active_workspace();
        let workspace = self.workspaces.iter().find(|workspace| workspace.name == name)?;
        self.open_repositories = workspace.repositories.clone();
        self.active_repository = workspace.active_repository.clone()
            .filter(|active| self.open_repositories.contains(active))
            .or_else(|| self.open_repositories.last().cloned());
        self.active_workspace = Some(name.to_owned());
        self.save();
        self.active_repository.clone()
    }

    pub fn rename_workspace(&mut self, old_name: &str, new_name: &str) -> bool {
        let new_name = new_name.trim();
        if new_name.is_empty() || self.workspaces.iter().any(|workspace| {
            workspace.name != old_name && workspace.name.eq_ignore_ascii_case(new_name)
        }) {
            return false;
        }
        let Some(workspace) = self.workspaces.iter_mut().find(|workspace| workspace.name == old_name) else {
            return false;
        };
        workspace.name = new_name.to_owned();
        if self.active_workspace.as_deref() == Some(old_name) {
            self.active_workspace = Some(new_name.to_owned());
        }
        self.save();
        true
    }

    pub fn delete_workspace(&mut self, name: &str) {
        self.workspaces.retain(|workspace| workspace.name != name);
        if self.active_workspace.as_deref() == Some(name) {
            self.active_workspace = None;
        }
        self.save();
    }

    pub fn move_workspace(&mut self, name: &str, up: bool) {
        let Some(index) = self.workspaces.iter().position(|workspace| workspace.name == name) else { return; };
        let target = if up {
            index.checked_sub(1)
        } else if index + 1 < self.workspaces.len() {
            Some(index + 1)
        } else {
            None
        };
        if let Some(target) = target {
            self.workspaces.swap(index, target);
            self.save();
        }
    }

    fn save_active_workspace(&mut self) {
        let Some(name) = self.active_workspace.as_deref() else { return; };
        let Some(workspace) = self.workspaces.iter_mut().find(|workspace| workspace.name == name) else { return; };
        workspace.repositories = self.open_repositories.clone();
        workspace.active_repository = self.active_repository.clone();
    }

    pub fn active_group(&self) -> Option<&str> {
        let name = self.active_workspace.as_deref()?;
        self.workspaces.iter().find(|workspace| workspace.name == name)?.active_group.as_deref()
    }

    pub fn select_group(&mut self, group: Option<String>) {
        let Some(name) = self.active_workspace.as_deref() else { return; };
        if let Some(workspace) = self.workspaces.iter_mut().find(|workspace| workspace.name == name) {
            workspace.active_group = group.filter(|group| workspace.groups.iter().any(|entry| &entry.name == group));
            self.save();
        }
    }

    pub fn create_group(&mut self, name: &str) -> bool {
        let name = name.trim();
        let Some(workspace_name) = self.active_workspace.clone() else { return false; };
        let Some(workspace) = self.workspaces.iter_mut().find(|workspace| workspace.name == workspace_name) else { return false; };
        if name.is_empty() || workspace.groups.iter().any(|group| group.name.eq_ignore_ascii_case(name)) { return false; }
        workspace.groups.push(RepositoryGroup {
            name: name.to_owned(), repositories: self.open_repositories.clone(), color: None,
            folders: Vec::new(), active_folder: None,
        });
        workspace.active_group = Some(name.to_owned());
        self.save();
        true
    }

    pub fn rename_group(&mut self, old_name: &str, new_name: &str) -> bool {
        let new_name = new_name.trim();
        let Some(workspace_name) = self.active_workspace.clone() else { return false; };
        let Some(workspace) = self.workspaces.iter_mut().find(|workspace| workspace.name == workspace_name) else { return false; };
        if new_name.is_empty() || workspace.groups.iter().any(|group| {
            group.name != old_name && group.name.eq_ignore_ascii_case(new_name)
        }) { return false; }
        let Some(group) = workspace.groups.iter_mut().find(|group| group.name == old_name) else { return false; };
        group.name = new_name.to_owned();
        if workspace.active_group.as_deref() == Some(old_name) { workspace.active_group = Some(new_name.to_owned()); }
        self.save();
        true
    }

    pub fn delete_group(&mut self, name: &str) {
        let Some(workspace_name) = self.active_workspace.clone() else { return; };
        if let Some(workspace) = self.workspaces.iter_mut().find(|workspace| workspace.name == workspace_name) {
            workspace.groups.retain(|group| group.name != name);
            if workspace.active_group.as_deref() == Some(name) { workspace.active_group = None; }
            self.save();
        }
    }

    pub fn set_group_color(&mut self, name: &str, color: Option<[u8; 4]>) {
        let Some(workspace_name) = self.active_workspace.clone() else { return; };
        if let Some(workspace) = self.workspaces.iter_mut().find(|workspace| workspace.name == workspace_name) {
            if let Some(group) = workspace.groups.iter_mut().find(|group| group.name == name) {
                group.color = color;
                self.save();
            }
        }
    }

    pub fn assign_repository_to_group(&mut self, path: &PathBuf, group: Option<&str>) {
        let Some(workspace_name) = self.active_workspace.clone() else { return; };
        if let Some(workspace) = self.workspaces.iter_mut().find(|workspace| workspace.name == workspace_name) {
            for entry in &mut workspace.groups {
                entry.repositories.retain(|repository| repository != path);
                entry.folders.retain(|folder| &folder.path != path);
                if entry.active_folder.as_ref().is_some_and(|active| !entry.folders.iter()
                    .any(|folder| folder_contains(active, &folder.folder)))
                {
                    entry.active_folder = None;
                }
            }
            if let Some(group) = group.and_then(|name| workspace.groups.iter_mut().find(|entry| entry.name == name)) {
                if self.open_repositories.contains(path) { group.repositories.push(path.clone()); }
            }
            self.save();
        }
    }

    pub fn reorder_open_repository(&mut self, source: &PathBuf, target: &PathBuf) {
        let Some(source_index) = self.open_repositories.iter().position(|path| path == source) else { return; };
        let Some(target_index) = self.open_repositories.iter().position(|path| path == target) else { return; };
        if source_index == target_index { return; }
        let path = self.open_repositories.remove(source_index);
        let insert_at = if source_index < target_index { target_index - 1 } else { target_index };
        self.open_repositories.insert(insert_at, path);
        self.save_active_workspace();
        self.save();
    }

    pub fn reorder_group_repository(&mut self, group_name: &str, source: &PathBuf, target: &PathBuf) {
        let Some(workspace_name) = self.active_workspace.clone() else { return; };
        let Some(group) = self.workspaces.iter_mut().find(|workspace| workspace.name == workspace_name)
            .and_then(|workspace| workspace.groups.iter_mut().find(|group| group.name == group_name)) else {
            return;
        };
        let Some(source_index) = group.repositories.iter().position(|path| path == source) else { return; };
        let Some(target_index) = group.repositories.iter().position(|path| path == target) else { return; };
        if source_index == target_index { return; }
        let path = group.repositories.remove(source_index);
        let insert_at = if source_index < target_index { target_index - 1 } else { target_index };
        group.repositories.insert(insert_at, path);
        self.save();
    }

    pub fn reorder_group(&mut self, source: &str, target: &str) {
        let Some(workspace_name) = self.active_workspace.clone() else { return; };
        let Some(workspace) = self.workspaces.iter_mut().find(|workspace| workspace.name == workspace_name) else { return; };
        let Some(source_index) = workspace.groups.iter().position(|group| group.name == source) else { return; };
        let Some(target_index) = workspace.groups.iter().position(|group| group.name == target) else { return; };
        if source_index == target_index { return; }
        let group = workspace.groups.remove(source_index);
        let insert_at = if source_index < target_index { target_index - 1 } else { target_index };
        workspace.groups.insert(insert_at, group);
        self.save();
    }

    pub fn group_folder(&self, group: &str, path: &PathBuf) -> Option<&str> {
        let workspace_name = self.active_workspace.as_deref()?;
        self.workspaces.iter().find(|workspace| workspace.name == workspace_name)?
            .groups.iter().find(|entry| entry.name == group)?
            .folders.iter().find(|entry| &entry.path == path).map(|entry| entry.folder.as_str())
    }

    pub fn group_folder_paths(&self, group_name: &str) -> Vec<String> {
        let Some(workspace_name) = self.active_workspace.as_deref() else { return Vec::new(); };
        let Some(group) = self.workspaces.iter().find(|workspace| workspace.name == workspace_name)
            .and_then(|workspace| workspace.groups.iter().find(|group| group.name == group_name)) else {
            return Vec::new();
        };
        let mut paths = BTreeSet::new();
        for entry in &group.folders {
            let mut prefix = String::new();
            for part in entry.folder.split('/') {
                if !prefix.is_empty() { prefix.push('/'); }
                prefix.push_str(part);
                paths.insert(prefix.clone());
            }
        }
        paths.into_iter().collect()
    }

    pub fn set_group_repository_folder(&mut self, group_name: &str, path: PathBuf, folder: Option<String>) {
        let folder = folder.map(|folder| folder.split('/')
            .map(str::trim).filter(|part| !part.is_empty() && *part != "." && *part != "..")
            .collect::<Vec<_>>().join("/"))
            .filter(|folder| !folder.is_empty());
        let Some(workspace_name) = self.active_workspace.clone() else { return; };
        if let Some(group) = self.workspaces.iter_mut().find(|workspace| workspace.name == workspace_name)
            .and_then(|workspace| workspace.groups.iter_mut().find(|group| group.name == group_name))
        {
            group.folders.retain(|entry| entry.path != path);
            if let Some(folder) = folder { group.folders.push(RepositoryFolder { path, folder }); }
            if group.active_folder.as_ref().is_some_and(|active| !group.folders.iter()
                .any(|entry| folder_contains(active, &entry.folder)))
            {
                group.active_folder = None;
            }
            self.save();
        }
    }

    pub fn select_group_folder(&mut self, group_name: &str, folder: Option<String>) {
        let Some(workspace_name) = self.active_workspace.clone() else { return; };
        if let Some(group) = self.workspaces.iter_mut().find(|workspace| workspace.name == workspace_name)
            .and_then(|workspace| workspace.groups.iter_mut().find(|group| group.name == group_name))
        {
            group.active_folder = folder.filter(|folder| group.folders.iter()
                .any(|entry| folder_contains(folder, &entry.folder)));
            self.save();
        }
    }

    pub fn set_theme_mode(&mut self, mode: ThemeMode) {
        self.theme_mode = mode;
        self.save();
    }

    pub fn set_theme(&mut self, theme_id: &str) {
        self.theme_id = theme_id.to_owned();
        self.save();
    }

    pub fn set_language(&mut self, language: &str) {
        const LANGUAGES: [&str; 16] = [
            "de", "en", "es", "fr", "it", "nl", "pl", "pt-BR", "tr", "ru", "uk", "ar", "he",
            "ja", "zh-CN", "ko",
        ];
        self.language = if LANGUAGES.contains(&language) { language } else { "en" }.to_owned();
        self.save();
    }

    pub fn set_snapshot_interval(&mut self, minutes: u8) {
        self.snapshot_interval_minutes = if [0, 5, 15, 30].contains(&minutes) { minutes } else { 15 };
        self.save();
    }

    pub fn set_snapshot_guard(&mut self, enabled: bool) {
        self.snapshot_guard = enabled;
        self.save();
    }

    pub fn save(&self) {
        let Some(path) = preference_path() else {
            return;
        };
        let Some(parent) = path.parent() else {
            return;
        };
        if fs::create_dir_all(parent).is_err() {
            return;
        }
        let Ok(contents) = serde_json::to_vec_pretty(self) else {
            return;
        };
        let temporary = path.with_extension("json.tmp");
        if fs::write(&temporary, contents).is_err() {
            return;
        }
        if path.exists() && fs::remove_file(&path).is_err() {
            let _ = fs::remove_file(temporary);
            return;
        }
        if fs::rename(&temporary, &path).is_err() {
            let _ = fs::remove_file(temporary);
        }
    }
}

fn preference_path() -> Option<PathBuf> {
    Some(dirs::config_dir()?.join("Gitcito").join("native-preferences.json"))
}
