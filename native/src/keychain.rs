use std::{fs, io, path::PathBuf};

use git2::{Cred, CredentialType};
use keyring::Entry;
use serde::{Deserialize, Serialize};

const SERVICE: &str = "com.gitcito.Gitcito";
const GITHUB_ACCOUNT: &str = "github.com";

#[derive(Default, Deserialize, Serialize)]
struct ConsentFile {
    granted: bool,
    explained: bool,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum ConsentStatus {
    Unset,
    Granted,
    Declined,
}

fn consent_path() -> Option<PathBuf> {
    Some(dirs::config_dir()?.join("Gitcito").join("native-keychain-consent.json"))
}

fn read_consent() -> ConsentFile {
    consent_path()
        .and_then(|path| fs::read(path).ok())
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default()
}

pub fn consent_status() -> ConsentStatus {
    let consent = read_consent();
    match (consent.granted, consent.explained) {
        (true, true) => ConsentStatus::Granted,
        (false, true) => ConsentStatus::Declined,
        _ => ConsentStatus::Unset,
    }
}

pub fn consent_granted() -> bool {
    consent_status() == ConsentStatus::Granted
}

pub fn set_consent(granted: bool) -> io::Result<()> {
    let path = consent_path().ok_or_else(|| io::Error::other("No user config directory"))?;
    let parent = path.parent().ok_or_else(|| io::Error::other("No keychain consent directory"))?;
    fs::create_dir_all(parent)?;
    let temporary = path.with_extension("json.tmp");
    fs::write(
        &temporary,
        serde_json::to_vec(&ConsentFile { granted, explained: true })
            .map_err(io::Error::other)?,
    )?;
    match fs::rename(&temporary, &path) {
        Ok(()) => Ok(()),
        Err(_) if path.exists() => {
            fs::remove_file(&path)?;
            fs::rename(temporary, path)
        }
        Err(error) => Err(error),
    }
}

fn github_entry() -> Result<Entry, String> {
    Entry::new(SERVICE, GITHUB_ACCOUNT).map_err(|error| error.to_string())
}

pub fn has_github_token() -> Result<bool, String> {
    if !consent_granted() {
        return Ok(false);
    }
    match github_entry()?.get_password() {
        Ok(token) => Ok(!token.is_empty()),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(error) => Err(error.to_string()),
    }
}

pub fn save_github_token(token: &str) -> Result<(), String> {
    if !consent_granted() {
        return Err("Keychain consent is required".to_owned());
    }
    let token = token.trim();
    if token.is_empty() {
        return Err("Token cannot be empty".to_owned());
    }
    github_entry()?.set_password(token).map_err(|error| error.to_string())
}

pub fn forget_github_token() -> Result<(), String> {
    match github_entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

fn is_github_https_url(url: &str) -> bool {
    let Some(scheme) = url.get(..8) else {
        return false;
    };
    if !scheme.eq_ignore_ascii_case("https://") {
        return false;
    }
    let authority = &url[8..];
    let host = authority
        .split(['/', '?', '#'])
        .next()
        .unwrap_or_default()
        .rsplit('@')
        .next()
        .unwrap_or_default()
        .split(':')
        .next()
        .unwrap_or_default();
    host.eq_ignore_ascii_case("github.com")
}

pub fn github_credential(url: &str, allowed: CredentialType) -> Option<Cred> {
    if !consent_granted()
        || !is_github_https_url(url)
        || !allowed.contains(CredentialType::USER_PASS_PLAINTEXT)
    {
        return None;
    }
    let token = github_entry().ok()?.get_password().ok()?;
    Cred::userpass_plaintext("x-access-token", &token).ok()
}
