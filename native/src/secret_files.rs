use std::path::Path;

pub fn is_secret_file(path: &str) -> bool {
    let normalized = path.replace('\\', "/");
    let name = Path::new(&normalized)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if [
        ".env.example",
        ".env.sample",
        ".env.template",
        ".env.dist",
        ".env.default",
        ".env.defaults",
    ]
    .contains(&name.as_str())
    {
        return false;
    }

    if name == ".env"
        || name.starts_with(".env.")
        || name == ".envrc"
        || name == ".npmrc"
        || name == ".pgpass"
        || name == ".netrc"
        || ["credentials", "credentials.json"].contains(&name.as_str())
        || ["id_rsa", "id_dsa", "id_ecdsa", "id_ed25519"].contains(&name.as_str())
        || name.starts_with("secrets.")
            && ["yaml", "yml", "json", "toml", "ini"]
                .iter()
                .any(|extension| name.ends_with(&format!(".{extension}")))
    {
        return true;
    }

    [
        ".pem",
        ".key",
        ".p12",
        ".pfx",
        ".keystore",
        ".jks",
        ".mobileprovision",
        ".provisionprofile",
        ".p8",
    ]
    .iter()
    .any(|extension| name.ends_with(extension))
}
